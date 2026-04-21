import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe, getBaseUrl, getStripePriceId } from "../../../lib/stripe";
import { normalizePlan, type PlanType } from "../../../lib/planLimits";

type CheckoutBody = {
  plan?: PlanType;
};

type UserProfileRow = {
  id: string;
  email?: string | null;
  plan?: PlanType | string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  cancel_at_period_end?: boolean | null;
};

const USER_PROFILE_SELECT =
  "id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status, cancel_at_period_end";

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.replace("Bearer ", "").trim();
}

function sanitizeSubscriptionStatus(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function isManageableSubscriptionStatus(status: string) {
  return status === "active" || status === "trialing" || status === "past_due";
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json(
        { error: "No autenticado. Inicia sesión para continuar." },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Faltan variables públicas de Supabase." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "No se pudo validar la sesión del usuario." },
        { status: 401 }
      );
    }

    let body: CheckoutBody;
    try {
      body = (await req.json()) as CheckoutBody;
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud no es válido." },
        { status: 400 }
      );
    }

    if (!body?.plan) {
      return NextResponse.json(
        { error: "Debes indicar el plan que deseas activar." },
        { status: 400 }
      );
    }

    const requestedPlan = normalizePlan(body.plan);

    if (requestedPlan === "free") {
      return NextResponse.json(
        { error: "El plan Free no requiere checkout." },
        { status: 400 }
      );
    }

    let { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select(USER_PROFILE_SELECT)
      .eq("id", user.id)
      .maybeSingle<UserProfileRow>();

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || "No se pudo cargar el perfil." },
        { status: 500 }
      );
    }

    if (!profile) {
      const { data: createdProfile, error: createProfileError } = await supabase
        .from("user_profiles")
        .upsert(
          [
            {
              id: user.id,
              email: user.email ?? null,
              plan: "free",
              cancel_at_period_end: false,
            },
          ],
          { onConflict: "id" }
        )
        .select(USER_PROFILE_SELECT)
        .single<UserProfileRow>();

      if (createProfileError || !createdProfile) {
        return NextResponse.json(
          {
            error:
              createProfileError?.message ||
              "No se pudo crear el perfil del usuario.",
          },
          { status: 500 }
        );
      }

      profile = createdProfile;
    }

    let customerId = profile?.stripe_customer_id || null;
    const currentStatus = sanitizeSubscriptionStatus(
      profile?.subscription_status
    );

    if (
      profile?.stripe_subscription_id &&
      isManageableSubscriptionStatus(currentStatus)
    ) {
      return NextResponse.json(
        {
          error:
            "Ya tienes una suscripción activa o gestionable. Usa el portal para administrarla.",
        },
        { status: 400 }
      );
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? profile?.email ?? undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      customerId = customer.id;

      const { error: updateCustomerError } = await supabase
        .from("user_profiles")
        .update({
          stripe_customer_id: customerId,
          email: user.email ?? profile?.email ?? null,
        })
        .eq("id", user.id);

      if (updateCustomerError) {
        return NextResponse.json(
          {
            error:
              updateCustomerError.message ||
              "No se pudo guardar el cliente de Stripe.",
          },
          { status: 500 }
        );
      }
    }

    const priceId = getStripePriceId(requestedPlan);
    const baseUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/pricing?checkout=success&plan=${requestedPlan}`,
      cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        plan: requestedPlan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan: requestedPlan,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "No se pudo generar la URL de checkout." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error: any) {
    console.error("ERROR EN /api/stripe/checkout:", error);

    return NextResponse.json(
      {
        error: error?.message || "No se pudo iniciar Stripe Checkout.",
      },
      { status: 500 }
    );
  }
}
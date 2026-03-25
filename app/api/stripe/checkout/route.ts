import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe, getBaseUrl, getStripePriceId } from "../../../lib/stripe";
import { normalizePlan, type PlanType } from "../../../lib/planLimits";

type CheckoutBody = {
  plan?: PlanType;
};

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.replace("Bearer ", "").trim();
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

    // ✅ Obtener usuario
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "No se pudo validar la sesión del usuario." },
        { status: 401 }
      );
    }

    // ✅ Leer body
    const body = (await req.json()) as CheckoutBody;
    const requestedPlan = normalizePlan(body.plan);

    if (requestedPlan === "free") {
      return NextResponse.json(
        { error: "El plan Free no requiere checkout." },
        { status: 400 }
      );
    }

    // ✅ Obtener perfil
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id, stripe_subscription_id, subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id || null;

    // ✅ Crear customer si no existe
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      customerId = customer.id;

      // guardar en Supabase
      await supabase
        .from("user_profiles")
        .update({
          stripe_customer_id: customerId,
        })
        .eq("id", user.id);
    }

    // ⚠️ Opcional: evitar doble suscripción activa
    if (
      profile?.subscription_status === "active" ||
      profile?.subscription_status === "trialing"
    ) {
      return NextResponse.json(
        {
          error:
            "Ya tienes una suscripción activa. Usa el portal para gestionarla.",
        },
        { status: 400 }
      );
    }

    const priceId = getStripePriceId(requestedPlan);
    const baseUrl = getBaseUrl();

    // ✅ Crear checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId, // 🔥 clave
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
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe, getStripePriceId } from "../../../lib/stripe";
import { normalizePlan, type PlanType } from "../../../lib/planLimits";

type SubscriptionAction =
  | "switch_plan"
  | "cancel_at_period_end"
  | "resume";

type SubscriptionBody = {
  action?: SubscriptionAction;
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

    const body = (await req.json()) as SubscriptionBody;
    const action = body.action;

    if (!action) {
      return NextResponse.json(
        { error: "Falta la acción de suscripción." },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select(
        "plan, stripe_customer_id, stripe_subscription_id, subscription_status"
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error:
            profileError?.message || "No se pudo cargar el perfil del usuario.",
        },
        { status: 500 }
      );
    }

    if (!profile.stripe_customer_id || !profile.stripe_subscription_id) {
      return NextResponse.json(
        {
          error:
            "No tienes una suscripción de Stripe asociada para gestionar.",
        },
        { status: 404 }
      );
    }

    const subscription = await stripe.subscriptions.retrieve(
      profile.stripe_subscription_id
    );

    if (!subscription.items.data.length) {
      return NextResponse.json(
        { error: "La suscripción no tiene items configurados." },
        { status: 400 }
      );
    }

    const subscriptionItem = subscription.items.data[0];

    if (action === "switch_plan") {
      const targetPlan = normalizePlan(body.plan);

      if (targetPlan === "free") {
        return NextResponse.json(
          { error: "No puedes cambiar a Free desde este endpoint." },
          { status: 400 }
        );
      }

      const targetPriceId = getStripePriceId(targetPlan);

      const updatedSubscription = await stripe.subscriptions.update(
        profile.stripe_subscription_id,
        {
          cancel_at_period_end: false,
          proration_behavior: "create_prorations",
          items: [
            {
              id: subscriptionItem.id,
              price: targetPriceId,
            },
          ],
          metadata: {
            supabase_user_id: user.id,
            plan: targetPlan,
          },
        }
      );

      await supabase
        .from("user_profiles")
        .update({
          plan: targetPlan,
          subscription_status: updatedSubscription.status,
          cancel_at_period_end: updatedSubscription.cancel_at_period_end ?? false,
        })
        .eq("id", user.id);

      return NextResponse.json({
        ok: true,
        action,
        subscriptionId: updatedSubscription.id,
        status: updatedSubscription.status,
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        message: `Tu plan fue actualizado a ${targetPlan.toUpperCase()}.`,
      });
    }

    if (action === "cancel_at_period_end") {
      const updatedSubscription = await stripe.subscriptions.update(
        profile.stripe_subscription_id,
        {
          cancel_at_period_end: true,
        }
      );

      await supabase
        .from("user_profiles")
        .update({
          subscription_status: updatedSubscription.status,
          cancel_at_period_end: true,
        })
        .eq("id", user.id);

      return NextResponse.json({
        ok: true,
        action,
        subscriptionId: updatedSubscription.id,
        status: updatedSubscription.status,
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        message:
          "Tu suscripción fue programada para cancelarse al final del período.",
      });
    }

    if (action === "resume") {
      const updatedSubscription = await stripe.subscriptions.update(
        profile.stripe_subscription_id,
        {
          cancel_at_period_end: false,
        }
      );

      await supabase
        .from("user_profiles")
        .update({
          subscription_status: updatedSubscription.status,
          cancel_at_period_end: false,
        })
        .eq("id", user.id);

      return NextResponse.json({
        ok: true,
        action,
        subscriptionId: updatedSubscription.id,
        status: updatedSubscription.status,
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        message: "Tu suscripción sigue activa y ya no será cancelada.",
      });
    }

    return NextResponse.json(
      { error: "Acción no soportada." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("ERROR EN /api/stripe/subscription:", error);

    return NextResponse.json(
      {
        error: error?.message || "No se pudo gestionar la suscripción.",
      },
      { status: 500 }
    );
  }
}
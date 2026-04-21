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

function isManagedPaidStatus(status?: string | null) {
  const normalized = sanitizeSubscriptionStatus(status);
  return (
    normalized === "active" ||
    normalized === "trialing" ||
    normalized === "past_due"
  );
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

    let body: SubscriptionBody;
    try {
      body = (await req.json()) as SubscriptionBody;
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud no es válido." },
        { status: 400 }
      );
    }

    const action = body.action;

    if (!action) {
      return NextResponse.json(
        { error: "Falta la acción de suscripción." },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select(USER_PROFILE_SELECT)
      .eq("id", user.id)
      .maybeSingle<UserProfileRow>();

    if (profileError) {
      return NextResponse.json(
        {
          error:
            profileError.message || "No se pudo cargar el perfil del usuario.",
        },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "No se encontró el perfil del usuario. Refresca e inténtalo nuevamente.",
        },
        { status: 404 }
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
      if (!body.plan) {
        return NextResponse.json(
          { error: "Debes indicar el plan destino." },
          { status: 400 }
        );
      }

      const targetPlan = normalizePlan(body.plan);

      if (targetPlan === "free") {
        return NextResponse.json(
          { error: "No puedes cambiar a Free desde este endpoint." },
          { status: 400 }
        );
      }

      if (normalizePlan(profile.plan) === targetPlan) {
        return NextResponse.json(
          {
            ok: true,
            action,
            subscriptionId: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
            message: `Ya estás en el plan ${targetPlan.toUpperCase()}.`,
          },
          { status: 200 }
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

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          plan: targetPlan,
          subscription_status: updatedSubscription.status,
          cancel_at_period_end:
            updatedSubscription.cancel_at_period_end ?? false,
        })
        .eq("id", user.id);

      if (updateError) {
        return NextResponse.json(
          {
            error:
              updateError.message ||
              "Stripe actualizó la suscripción, pero no se pudo reflejar en tu perfil.",
          },
          { status: 500 }
        );
      }

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
      if (!isManagedPaidStatus(subscription.status)) {
        return NextResponse.json(
          {
            error:
              "La suscripción no está en un estado gestionable para programar cancelación.",
          },
          { status: 400 }
        );
      }

      if (subscription.cancel_at_period_end) {
        return NextResponse.json({
          ok: true,
          action,
          subscriptionId: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: true,
          message:
            "Tu suscripción ya estaba programada para cancelarse al final del período.",
        });
      }

      const updatedSubscription = await stripe.subscriptions.update(
        profile.stripe_subscription_id,
        {
          cancel_at_period_end: true,
        }
      );

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          subscription_status: updatedSubscription.status,
          cancel_at_period_end: true,
        })
        .eq("id", user.id);

      if (updateError) {
        return NextResponse.json(
          {
            error:
              updateError.message ||
              "Stripe actualizó la suscripción, pero no se pudo reflejar en tu perfil.",
          },
          { status: 500 }
        );
      }

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
      if (!subscription.cancel_at_period_end) {
        return NextResponse.json({
          ok: true,
          action,
          subscriptionId: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: false,
          message: "Tu suscripción ya estaba activa sin cancelación programada.",
        });
      }

      const updatedSubscription = await stripe.subscriptions.update(
        profile.stripe_subscription_id,
        {
          cancel_at_period_end: false,
        }
      );

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          subscription_status: updatedSubscription.status,
          cancel_at_period_end: false,
        })
        .eq("id", user.id);

      if (updateError) {
        return NextResponse.json(
          {
            error:
              updateError.message ||
              "Stripe actualizó la suscripción, pero no se pudo reflejar en tu perfil.",
          },
          { status: 500 }
        );
      }

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
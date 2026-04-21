import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "../../../lib/stripe";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { normalizePlan, type PlanType } from "../../../lib/planLimits";

export const runtime = "nodejs";

type StripeMetadata = Record<string, string | undefined>;

type UpsertUserProfileInput = {
  userId: string;
  plan: PlanType;
  email?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  cancelAtPeriodEnd?: boolean | null;
};

function normalizeStripeStatus(status?: string | null) {
  return String(status || "").trim().toLowerCase();
}

function getSubscriptionPlanFromPriceId(priceId?: string | null): PlanType {
  if (!priceId) return "free";

  if (priceId === process.env.STRIPE_PRICE_ID_PREMIUM) {
    return "premium";
  }

  if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
    return "pro";
  }

  return "free";
}

function getMetadataPlan(metadata?: StripeMetadata): PlanType {
  return normalizePlan(metadata?.plan);
}

function getMetadataUserId(metadata?: StripeMetadata): string {
  return metadata?.supabase_user_id || "";
}

function isPaidLikeStatus(status?: string | null) {
  const normalized = normalizeStripeStatus(status);
  return (
    normalized === "active" ||
    normalized === "trialing" ||
    normalized === "past_due"
  );
}

function shouldDowngradeToFree(status?: string | null) {
  const normalized = normalizeStripeStatus(status);
  return (
    normalized === "canceled" ||
    normalized === "unpaid" ||
    normalized === "incomplete_expired"
  );
}

async function getCurrentProfilePlan(userId: string): Promise<PlanType> {
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  return normalizePlan((data as { plan?: string | null } | null)?.plan);
}

async function upsertUserProfile({
  userId,
  plan,
  email,
  stripeCustomerId,
  stripeSubscriptionId,
  subscriptionStatus,
  cancelAtPeriodEnd,
}: UpsertUserProfileInput) {
  const payload: Record<string, unknown> = {
    id: userId,
    email: email ?? null,
    plan,
  };

  if (typeof stripeCustomerId !== "undefined") {
    payload.stripe_customer_id = stripeCustomerId;
  }

  if (typeof stripeSubscriptionId !== "undefined") {
    payload.stripe_subscription_id = stripeSubscriptionId;
  }

  if (typeof subscriptionStatus !== "undefined") {
    payload.subscription_status = subscriptionStatus;
  }

  if (typeof cancelAtPeriodEnd === "boolean") {
    payload.cancel_at_period_end = cancelAtPeriodEnd;
  }

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .upsert([payload], { onConflict: "id" });

  if (error) {
    const message = error.message?.toLowerCase() || "";

    const hasOptionalColumnIssue =
      message.includes("column") &&
      (message.includes("stripe_customer_id") ||
        message.includes("stripe_subscription_id") ||
        message.includes("subscription_status") ||
        message.includes("cancel_at_period_end"));

    if (hasOptionalColumnIssue) {
      const fallbackPayload = {
        id: userId,
        email: email ?? null,
        plan,
      };

      const { error: fallbackError } = await supabaseAdmin
        .from("user_profiles")
        .upsert([fallbackPayload], { onConflict: "id" });

      if (fallbackError) {
        throw fallbackError;
      }

      return;
    }

    throw error;
  }
}

async function findUserIdByStripeRefs(params: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}): Promise<string> {
  const { stripeCustomerId, stripeSubscriptionId } = params;

  if (stripeSubscriptionId) {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle();

    if ((data as { id?: string } | null)?.id) {
      return (data as { id: string }).id;
    }
  }

  if (stripeCustomerId) {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();

    if ((data as { id?: string } | null)?.id) {
      return (data as { id: string }).id;
    }
  }

  return "";
}

async function resolveUserIdFromSubscription(params: {
  subscriptionId?: string | null;
  stripeCustomerId?: string | null;
  metadata?: StripeMetadata;
}): Promise<{
  userId: string;
  metadataPlan: PlanType;
  priceId: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
}> {
  const directUserId = getMetadataUserId(params.metadata);
  const directPlan = getMetadataPlan(params.metadata);

  if (directUserId && params.subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(
      params.subscriptionId
    );
    const priceId = subscription.items.data?.[0]?.price?.id || null;

    return {
      userId: directUserId,
      metadataPlan: directPlan,
      priceId,
      status: subscription.status || "",
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    };
  }

  if (params.subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        params.subscriptionId
      );
      const metadata = subscription.metadata as StripeMetadata | undefined;
      const retrievedUserId = getMetadataUserId(metadata);
      const retrievedPlan = getMetadataPlan(metadata);
      const priceId = subscription.items.data?.[0]?.price?.id || null;

      if (retrievedUserId) {
        return {
          userId: retrievedUserId,
          metadataPlan: retrievedPlan,
          priceId,
          status: subscription.status || "",
          cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        };
      }
    } catch (error) {
      console.error("Error retrieving Stripe subscription:", error);
    }
  }

  const fallbackUserId = await findUserIdByStripeRefs({
    stripeCustomerId: params.stripeCustomerId,
    stripeSubscriptionId: params.subscriptionId,
  });

  return {
    userId: fallbackUserId,
    metadataPlan: directPlan,
    priceId: null,
    status: "",
    cancelAtPeriodEnd: false,
  };
}

async function handleSubscriptionProjection(params: {
  userId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  metadataPlan: PlanType;
  priceId?: string | null;
  status?: string | null;
  cancelAtPeriodEnd?: boolean | null;
}) {
  const {
    userId,
    stripeCustomerId,
    stripeSubscriptionId,
    metadataPlan,
    priceId,
    status,
    cancelAtPeriodEnd,
  } = params;

  const resolvedPlan =
    metadataPlan !== "free"
      ? metadataPlan
      : getSubscriptionPlanFromPriceId(priceId || null);

  if (isPaidLikeStatus(status)) {
    await upsertUserProfile({
      userId,
      plan: resolvedPlan,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionStatus: normalizeStripeStatus(status),
      cancelAtPeriodEnd: Boolean(cancelAtPeriodEnd),
    });
    return;
  }

  if (shouldDowngradeToFree(status)) {
    await upsertUserProfile({
      userId,
      plan: "free",
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionStatus: normalizeStripeStatus(status),
      cancelAtPeriodEnd: Boolean(cancelAtPeriodEnd),
    });
    return;
  }

  const currentPlan = await getCurrentProfilePlan(userId);

  await upsertUserProfile({
    userId,
    plan: currentPlan,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus: normalizeStripeStatus(status),
    cancelAtPeriodEnd: Boolean(cancelAtPeriodEnd),
  });
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Falta stripe-signature." },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Falta STRIPE_WEBHOOK_SECRET." },
      { status: 500 }
    );
  }

  try {
    const body = await req.text();

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log("Stripe webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const metadata = session.metadata as StripeMetadata | undefined;
        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : null;
        const stripeSubscriptionId =
          typeof session.subscription === "string" ? session.subscription : null;
        const email =
          session.customer_details?.email || session.customer_email || null;

        let userId =
          getMetadataUserId(metadata) || session.client_reference_id || "";

        let plan = getMetadataPlan(metadata);
        let cancelAtPeriodEnd = false;

        if ((!userId || plan === "free") && stripeSubscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              stripeSubscriptionId
            );

            const subscriptionMetadata =
              subscription.metadata as StripeMetadata | undefined;

            const retrievedUserId = getMetadataUserId(subscriptionMetadata);
            const retrievedPlan = getMetadataPlan(subscriptionMetadata);
            const priceId = subscription.items.data?.[0]?.price?.id || null;

            cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;

            if (!userId) {
              userId = retrievedUserId;
            }

            if (plan === "free") {
              plan =
                retrievedPlan !== "free"
                  ? retrievedPlan
                  : getSubscriptionPlanFromPriceId(priceId);
            }
          } catch (error) {
            console.error(
              "Error retrieving subscription from checkout.session.completed:",
              error
            );
          }
        }

        if (!userId) {
          userId = await findUserIdByStripeRefs({
            stripeCustomerId,
            stripeSubscriptionId,
          });
        }

        console.log("checkout.session.completed", {
          userId,
          plan,
          email,
          stripeCustomerId,
          stripeSubscriptionId,
          cancelAtPeriodEnd,
        });

        if (userId && plan !== "free") {
          await upsertUserProfile({
            userId,
            plan,
            email,
            stripeCustomerId,
            stripeSubscriptionId,
            subscriptionStatus: "checkout_completed",
            cancelAtPeriodEnd,
          });
        } else {
          console.warn(
            "checkout.session.completed sin userId válido o plan resoluble."
          );
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const stripeCustomerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : null;
        const stripeSubscriptionId = subscription.id || null;

        const resolved = await resolveUserIdFromSubscription({
          subscriptionId: stripeSubscriptionId,
          stripeCustomerId,
          metadata: subscription.metadata as StripeMetadata | undefined,
        });

        const fallbackPriceId = subscription.items.data?.[0]?.price?.id || null;
        const metadataPlan = resolved.metadataPlan;
        const priceId = resolved.priceId || fallbackPriceId;
        const status = resolved.status || subscription.status || "";
        const cancelAtPeriodEnd =
          resolved.cancelAtPeriodEnd ??
          subscription.cancel_at_period_end ??
          false;

        console.log("customer.subscription event", {
          type: event.type,
          userId: resolved.userId,
          metadataPlan,
          priceId,
          status,
          stripeCustomerId,
          stripeSubscriptionId,
          cancelAtPeriodEnd,
        });

        if (!resolved.userId) {
          console.warn(
            "Webhook sin supabase_user_id y sin match por stripe refs."
          );
          break;
        }

        await handleSubscriptionProjection({
          userId: resolved.userId,
          stripeCustomerId,
          stripeSubscriptionId,
          metadataPlan,
          priceId,
          status,
          cancelAtPeriodEnd,
        });

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;

        const metadataFromParent =
          invoice.parent &&
          typeof invoice.parent !== "string" &&
          "subscription_details" in invoice.parent
            ? (invoice.parent.subscription_details?.metadata as
                | StripeMetadata
                | undefined)
            : undefined;

        const metadataFromLine = invoice.lines?.data?.[0]?.metadata as
          | StripeMetadata
          | undefined;

        const stripeCustomerId =
          typeof invoice.customer === "string" ? invoice.customer : null;

        const stripeSubscriptionId =
          invoice.parent &&
          typeof invoice.parent !== "string" &&
          "subscription_details" in invoice.parent &&
          typeof invoice.parent.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : null;

        let userId =
          getMetadataUserId(metadataFromParent) ||
          getMetadataUserId(metadataFromLine);

        if (!userId) {
          userId = await findUserIdByStripeRefs({
            stripeCustomerId,
            stripeSubscriptionId,
          });
        }

        if (!userId) {
          console.warn("invoice.paid sin userId resoluble.");
          break;
        }

        let resolvedPlan: PlanType = "free";
        let cancelAtPeriodEnd = false;
        let status = "active";

        if (stripeSubscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              stripeSubscriptionId
            );

            const metadataPlan = getMetadataPlan(
              subscription.metadata as StripeMetadata | undefined
            );
            const priceId = subscription.items.data?.[0]?.price?.id || null;

            resolvedPlan =
              metadataPlan !== "free"
                ? metadataPlan
                : getSubscriptionPlanFromPriceId(priceId);

            cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;
            status = subscription.status || "active";
          } catch (error) {
            console.error(
              "Error retrieving subscription on invoice.paid:",
              error
            );
          }
        }

        await upsertUserProfile({
          userId,
          plan: resolvedPlan,
          stripeCustomerId,
          stripeSubscriptionId,
          subscriptionStatus: normalizeStripeStatus(status),
          cancelAtPeriodEnd,
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        const metadataFromParent =
          invoice.parent &&
          typeof invoice.parent !== "string" &&
          "subscription_details" in invoice.parent
            ? (invoice.parent.subscription_details?.metadata as
                | StripeMetadata
                | undefined)
            : undefined;

        const metadataFromLine = invoice.lines?.data?.[0]?.metadata as
          | StripeMetadata
          | undefined;

        const stripeCustomerId =
          typeof invoice.customer === "string" ? invoice.customer : null;

        const stripeSubscriptionId =
          invoice.parent &&
          typeof invoice.parent !== "string" &&
          "subscription_details" in invoice.parent &&
          typeof invoice.parent.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : null;

        let userId =
          getMetadataUserId(metadataFromParent) ||
          getMetadataUserId(metadataFromLine);

        if (!userId) {
          userId = await findUserIdByStripeRefs({
            stripeCustomerId,
            stripeSubscriptionId,
          });
        }

        console.log("invoice.payment_failed", {
          userId,
          stripeCustomerId,
          stripeSubscriptionId,
        });

        if (userId) {
          const currentPlan = await getCurrentProfilePlan(userId);

          await upsertUserProfile({
            userId,
            plan: currentPlan,
            stripeCustomerId,
            stripeSubscriptionId,
            subscriptionStatus: "payment_failed",
            cancelAtPeriodEnd: false,
          });
        }

        break;
      }

      default:
        console.log("Evento no manejado:", event.type);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("ERROR EN /api/stripe/webhook:", error);

    return NextResponse.json(
      { error: error?.message || "Error en webhook de Stripe." },
      { status: 400 }
    );
  }
}
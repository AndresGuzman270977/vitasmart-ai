import { NextResponse } from "next/server";
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
};

async function upsertUserProfile({
  userId,
  plan,
  email,
  stripeCustomerId,
  stripeSubscriptionId,
  subscriptionStatus,
}: UpsertUserProfileInput) {
  const payload: Record<string, unknown> = {
    id: userId,
    email: email ?? null,
    plan,
  };

  if (stripeCustomerId) {
    payload.stripe_customer_id = stripeCustomerId;
  }

  if (stripeSubscriptionId) {
    payload.stripe_subscription_id = stripeSubscriptionId;
  }

  if (subscriptionStatus) {
    payload.subscription_status = subscriptionStatus;
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
        message.includes("subscription_status"));

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
        const session = event.data.object as {
          metadata?: StripeMetadata;
          client_reference_id?: string | null;
          customer?: string | null;
          subscription?: string | null;
          customer_details?: {
            email?: string | null;
          } | null;
          customer_email?: string | null;
        };

        const userId =
          getMetadataUserId(session.metadata) ||
          session.client_reference_id ||
          "";

        const plan = getMetadataPlan(session.metadata);
        const email =
          session.customer_details?.email || session.customer_email || null;
        const stripeCustomerId = session.customer || null;
        const stripeSubscriptionId = session.subscription || null;

        console.log("checkout.session.completed", {
          userId,
          plan,
          email,
          stripeCustomerId,
          stripeSubscriptionId,
        });

        if (userId && plan !== "free") {
          await upsertUserProfile({
            userId,
            plan,
            email,
            stripeCustomerId,
            stripeSubscriptionId,
            subscriptionStatus: "checkout_completed",
          });
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as {
          id?: string | null;
          customer?: string | null;
          metadata?: StripeMetadata;
          status?: string;
          items?: {
            data?: Array<{
              price?: {
                id?: string | null;
              } | null;
            }>;
          };
        };

        const userId = getMetadataUserId(subscription.metadata);
        const metadataPlan = getMetadataPlan(subscription.metadata);
        const priceId = subscription.items?.data?.[0]?.price?.id || null;
        const stripeCustomerId = subscription.customer || null;
        const stripeSubscriptionId = subscription.id || null;

        const resolvedPlan =
          metadataPlan !== "free"
            ? metadataPlan
            : getSubscriptionPlanFromPriceId(priceId);

        const status = subscription.status || "";

        console.log("customer.subscription event", {
          type: event.type,
          userId,
          metadataPlan,
          priceId,
          resolvedPlan,
          status,
          stripeCustomerId,
          stripeSubscriptionId,
        });

        if (!userId) {
          console.warn("Webhook sin supabase_user_id en metadata.");
          break;
        }

        if (
          status === "active" ||
          status === "trialing" ||
          status === "past_due"
        ) {
          await upsertUserProfile({
            userId,
            plan: resolvedPlan,
            stripeCustomerId,
            stripeSubscriptionId,
            subscriptionStatus: status,
          });
        } else {
          await upsertUserProfile({
            userId,
            plan: "free",
            stripeCustomerId,
            stripeSubscriptionId,
            subscriptionStatus: status,
          });
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as {
          id?: string | null;
          customer?: string | null;
          metadata?: StripeMetadata;
          status?: string;
        };

        const userId = getMetadataUserId(subscription.metadata);
        const stripeCustomerId = subscription.customer || null;
        const stripeSubscriptionId = subscription.id || null;
        const status = subscription.status || "canceled";

        console.log("customer.subscription.deleted", {
          userId,
          stripeCustomerId,
          stripeSubscriptionId,
          status,
        });

        if (userId) {
          await upsertUserProfile({
            userId,
            plan: "free",
            stripeCustomerId,
            stripeSubscriptionId,
            subscriptionStatus: status,
          });
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as {
          customer?: string | null;
          subscription?: string | null;
          lines?: {
            data?: Array<{
              price?: {
                id?: string | null;
              } | null;
              metadata?: StripeMetadata;
            }>;
          };
          parent?: {
            subscription_details?: {
              metadata?: StripeMetadata;
            };
          };
        };

        const metadataFromParent =
          invoice.parent?.subscription_details?.metadata;
        const metadataFromLine = invoice.lines?.data?.[0]?.metadata;
        const userId =
          getMetadataUserId(metadataFromParent) ||
          getMetadataUserId(metadataFromLine);

        const priceId = invoice.lines?.data?.[0]?.price?.id || null;
        const resolvedPlan = getSubscriptionPlanFromPriceId(priceId);

        console.log("invoice.payment_failed", {
          userId,
          priceId,
          resolvedPlan,
          stripeCustomerId: invoice.customer || null,
          stripeSubscriptionId: invoice.subscription || null,
        });

        if (userId) {
          await upsertUserProfile({
            userId,
            plan: "free",
            stripeCustomerId: invoice.customer || null,
            stripeSubscriptionId: invoice.subscription || null,
            subscriptionStatus: "payment_failed",
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
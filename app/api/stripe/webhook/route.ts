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

    if (data?.id) return data.id;
  }

  if (stripeCustomerId) {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();

    if (data?.id) return data.id;
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
}> {
  const directUserId = getMetadataUserId(params.metadata);
  const directPlan = getMetadataPlan(params.metadata);

  if (directUserId && params.subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
    const priceId = subscription.items.data?.[0]?.price?.id || null;
    return {
      userId: directUserId,
      metadataPlan: directPlan,
      priceId,
      status: subscription.status || "",
    };
  }

  if (params.subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
      const retrievedUserId = getMetadataUserId(
        subscription.metadata as StripeMetadata | undefined
      );
      const retrievedPlan = getMetadataPlan(
        subscription.metadata as StripeMetadata | undefined
      );
      const priceId = subscription.items.data?.[0]?.price?.id || null;

      if (retrievedUserId) {
        return {
          userId: retrievedUserId,
          metadataPlan: retrievedPlan,
          priceId,
          status: subscription.status || "",
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
  };
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

        const stripeCustomerId = session.customer || null;
        const stripeSubscriptionId = session.subscription || null;
        const email =
          session.customer_details?.email || session.customer_email || null;

        let userId =
          getMetadataUserId(session.metadata) ||
          session.client_reference_id ||
          "";

        let plan = getMetadataPlan(session.metadata);

        if ((!userId || plan === "free") && stripeSubscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              stripeSubscriptionId
            );

            const metadata = subscription.metadata as StripeMetadata | undefined;
            const retrievedUserId = getMetadataUserId(metadata);
            const retrievedPlan = getMetadataPlan(metadata);
            const priceId = subscription.items.data?.[0]?.price?.id || null;

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
        } else {
          console.warn(
            "checkout.session.completed sin userId válido o plan resoluble."
          );
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

        const stripeCustomerId = subscription.customer || null;
        const stripeSubscriptionId = subscription.id || null;

        const resolved = await resolveUserIdFromSubscription({
          subscriptionId: stripeSubscriptionId,
          stripeCustomerId,
          metadata: subscription.metadata,
        });

        const fallbackPriceId =
          subscription.items?.data?.[0]?.price?.id || null;

        const metadataPlan = resolved.metadataPlan;
        const priceId = resolved.priceId || fallbackPriceId;
        const status = resolved.status || subscription.status || "";

        const resolvedPlan =
          metadataPlan !== "free"
            ? metadataPlan
            : getSubscriptionPlanFromPriceId(priceId);

        console.log("customer.subscription event", {
          type: event.type,
          userId: resolved.userId,
          metadataPlan,
          priceId,
          resolvedPlan,
          status,
          stripeCustomerId,
          stripeSubscriptionId,
        });

        if (!resolved.userId) {
          console.warn(
            "Webhook sin supabase_user_id y sin match por stripe refs."
          );
          break;
        }

        if (
          status === "active" ||
          status === "trialing" ||
          status === "past_due"
        ) {
          await upsertUserProfile({
            userId: resolved.userId,
            plan: resolvedPlan,
            stripeCustomerId,
            stripeSubscriptionId,
            subscriptionStatus: status,
          });
        } else {
          await upsertUserProfile({
            userId: resolved.userId,
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

        const stripeCustomerId = subscription.customer || null;
        const stripeSubscriptionId = subscription.id || null;

        const resolved = await resolveUserIdFromSubscription({
          subscriptionId: stripeSubscriptionId,
          stripeCustomerId,
          metadata: subscription.metadata,
        });

        const status = subscription.status || "canceled";

        console.log("customer.subscription.deleted", {
          userId: resolved.userId,
          stripeCustomerId,
          stripeSubscriptionId,
          status,
        });

        if (resolved.userId) {
          await upsertUserProfile({
            userId: resolved.userId,
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
        const stripeCustomerId = invoice.customer || null;
        const stripeSubscriptionId = invoice.subscription || null;

        let userId =
          getMetadataUserId(metadataFromParent) ||
          getMetadataUserId(metadataFromLine);

        const priceId = invoice.lines?.data?.[0]?.price?.id || null;

        if (!userId) {
          userId = await findUserIdByStripeRefs({
            stripeCustomerId,
            stripeSubscriptionId,
          });
        }

        console.log("invoice.payment_failed", {
          userId,
          priceId,
          stripeCustomerId,
          stripeSubscriptionId,
        });

        if (userId) {
          await upsertUserProfile({
            userId,
            plan: "free",
            stripeCustomerId,
            stripeSubscriptionId,
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
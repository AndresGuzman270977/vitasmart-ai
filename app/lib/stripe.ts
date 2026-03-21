import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Falta STRIPE_SECRET_KEY en las variables de entorno.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getStripePriceId(plan: "pro" | "premium") {
  if (plan === "pro") {
    if (!process.env.STRIPE_PRICE_ID_PRO) {
      throw new Error("Falta STRIPE_PRICE_ID_PRO en las variables de entorno.");
    }

    return process.env.STRIPE_PRICE_ID_PRO;
  }

  if (!process.env.STRIPE_PRICE_ID_PREMIUM) {
    throw new Error("Falta STRIPE_PRICE_ID_PREMIUM en las variables de entorno.");
  }

  return process.env.STRIPE_PRICE_ID_PREMIUM;
}
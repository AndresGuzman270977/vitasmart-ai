import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
const priceIdPro = process.env.STRIPE_PRICE_ID_PRO?.trim();
const priceIdPremium = process.env.STRIPE_PRICE_ID_PREMIUM?.trim();
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const vercelUrl = process.env.VERCEL_URL?.trim();

if (!stripeSecretKey) {
  throw new Error("Falta STRIPE_SECRET_KEY en las variables de entorno.");
}

export const stripe = new Stripe(stripeSecretKey);

export function getBaseUrl() {
  if (appUrl) {
    if (!/^https?:\/\//i.test(appUrl)) {
      throw new Error(
        `NEXT_PUBLIC_APP_URL inválida. Debe iniciar con http:// o https://. Valor recibido: ${appUrl}`
      );
    }

    return appUrl.replace(/\/+$/, "");
  }

  if (vercelUrl) {
    const normalizedVercelUrl = vercelUrl
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");

    return `https://${normalizedVercelUrl}`;
  }

  return "http://localhost:3000";
}

export function getStripePriceId(plan: "pro" | "premium") {
  if (plan === "pro") {
    if (!priceIdPro) {
      throw new Error("Falta STRIPE_PRICE_ID_PRO en las variables de entorno.");
    }

    return priceIdPro;
  }

  if (plan === "premium") {
    if (!priceIdPremium) {
      throw new Error("Falta STRIPE_PRICE_ID_PREMIUM en las variables de entorno.");
    }

    return priceIdPremium;
  }

  throw new Error(`Plan inválido para Stripe Checkout: ${plan}`);
}
import "server-only";
import Stripe from "stripe";

type PaidPlan = "pro" | "premium";

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function readRequiredEnv(name: string) {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Falta ${name} en las variables de entorno.`);
  }

  return value;
}

function normalizeAbsoluteUrl(url: string, sourceName: string) {
  const trimmed = url.trim();

  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error(
      `${sourceName} inválida. Debe iniciar con http:// o https://. Valor recibido: ${trimmed}`
    );
  }

  return trimmed.replace(/\/+$/, "");
}

const stripeSecretKey = readRequiredEnv("STRIPE_SECRET_KEY");
const priceIdPro = readEnv("STRIPE_PRICE_ID_PRO");
const priceIdPremium = readEnv("STRIPE_PRICE_ID_PREMIUM");
const appUrl = readEnv("NEXT_PUBLIC_APP_URL");
const vercelUrl = readEnv("VERCEL_URL");
const nodeEnv = readEnv("NODE_ENV");

export const stripe = new Stripe(stripeSecretKey, {
  maxNetworkRetries: 2,
});

export function getBaseUrl() {
  if (appUrl) {
    return normalizeAbsoluteUrl(appUrl, "NEXT_PUBLIC_APP_URL");
  }

  if (vercelUrl) {
    const normalizedVercelUrl = vercelUrl
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");

    return `https://${normalizedVercelUrl}`;
  }

  if (nodeEnv === "production") {
    throw new Error(
      "No se pudo resolver la URL base en producción. Define NEXT_PUBLIC_APP_URL o VERCEL_URL."
    );
  }

  return "http://localhost:3000";
}

export function getStripePriceId(plan: PaidPlan) {
  if (plan === "pro") {
    if (!priceIdPro) {
      throw new Error("Falta STRIPE_PRICE_ID_PRO en las variables de entorno.");
    }

    return priceIdPro;
  }

  if (plan === "premium") {
    if (!priceIdPremium) {
      throw new Error(
        "Falta STRIPE_PRICE_ID_PREMIUM en las variables de entorno."
      );
    }

    return priceIdPremium;
  }

  throw new Error(`Plan inválido para Stripe Checkout: ${plan}`);
}
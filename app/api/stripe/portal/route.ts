import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe, getBaseUrl } from "../../../lib/stripe";

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.replace("Bearer ", "").trim();
}

function isManagedSubscription(status?: string | null) {
  const normalized = String(status || "").toLowerCase();

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
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "No se pudo validar la sesión del usuario." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id, stripe_subscription_id, subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        {
          error:
            profileError.message ||
            "No se pudo cargar el perfil del usuario.",
        },
        { status: 500 }
      );
    }

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        {
          error:
            "No tienes un cliente de Stripe asociado. Activa primero un plan.",
        },
        { status: 404 }
      );
    }

    if (!profile.stripe_subscription_id) {
      return NextResponse.json(
        {
          error:
            "No tienes una suscripción activa para gestionar en el portal.",
        },
        { status: 400 }
      );
    }

    if (!isManagedSubscription(profile.subscription_status)) {
      return NextResponse.json(
        {
          error:
            "Tu suscripción no está en un estado gestionable actualmente.",
        },
        { status: 400 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getBaseUrl()}/pricing`,
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error: any) {
    console.error("ERROR EN /api/stripe/portal:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "No se pudo abrir el portal de facturación.",
      },
      { status: 500 }
    );
  }
}
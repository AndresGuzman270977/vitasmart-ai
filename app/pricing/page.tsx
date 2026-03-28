"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import {
  getHistoryLimitLabel,
  getPlanLabel,
  getPlanLimits,
  getUpgradeTargetLabel,
  normalizePlan,
  type UserPlan,
} from "../lib/planLimits";

type UserProfileRow = {
  id: string;
  email?: string | null;
  plan?: UserPlan | string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  cancel_at_period_end?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

type BasicUser = {
  id: string;
  email?: string | null;
};

type SubscriptionAction =
  | "switch_plan"
  | "cancel_at_period_end"
  | "resume";

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <section className="mx-auto max-w-3xl text-center">
              <div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1 text-sm text-slate-600 shadow-sm">
                VitaSmart AI · Pricing
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Elige la experiencia que quieres vivir
              </h1>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                Cargando información de planes...
              </p>
            </section>
          </div>
        </main>
      }
    >
      <PricingPageContent />
    </Suspense>
  );
}

function PricingPageContent() {
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");
  const checkoutPlan = searchParams.get("plan");

  const [currentPlan, setCurrentPlan] = useState<UserPlan | null>(null);
  const [currentSubscriptionStatus, setCurrentSubscriptionStatus] =
    useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);

  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState<UserPlan | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [subscriptionActionLoading, setSubscriptionActionLoading] =
    useState<SubscriptionAction | null>(null);

  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  async function getAuthenticatedUser(): Promise<BasicUser | null> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? null,
    };
  }

  async function ensureProfile(
    userId: string,
    email?: string | null
  ): Promise<UserProfileRow> {
    const { data: existingProfile, error: existingError } = await supabase
      .from("user_profiles")
      .select(
        "id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status, cancel_at_period_end"
      )
      .eq("id", userId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingProfile) {
      return existingProfile as UserProfileRow;
    }

    const payload = {
      id: userId,
      email: email ?? null,
      plan: "free" as UserPlan,
      cancel_at_period_end: false,
    };

    const { data: createdProfile, error: createError } = await supabase
      .from("user_profiles")
      .upsert([payload], { onConflict: "id" })
      .select(
        "id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status, cancel_at_period_end"
      )
      .single();

    if (createError) {
      throw createError;
    }

    return createdProfile as UserProfileRow;
  }

  async function loadProfileState() {
    const user = await getAuthenticatedUser();

    if (!user) {
      setCurrentUserId(null);
      setCurrentPlan(null);
      setCurrentSubscriptionStatus(null);
      setCancelAtPeriodEnd(false);
      setHasStripeCustomer(false);
      setHasStripeSubscription(false);
      return;
    }

    const profile = await ensureProfile(user.id, user.email);

    setCurrentUserId(user.id);
    setCurrentPlan(normalizePlan(profile?.plan));
    setCurrentSubscriptionStatus(profile?.subscription_status ?? null);
    setCancelAtPeriodEnd(Boolean(profile?.cancel_at_period_end));
    setHasStripeCustomer(Boolean(profile?.stripe_customer_id));
    setHasStripeSubscription(Boolean(profile?.stripe_subscription_id));
  }

  useEffect(() => {
    let ignore = false;

    async function loadPlan() {
      try {
        if (!ignore) {
          setLoading(true);
        }

        if (checkoutStatus === "success" && !ignore) {
          setMessage(
            `Stripe confirmó tu proceso de pago${
              checkoutPlan
                ? ` para el plan ${String(checkoutPlan).toUpperCase()}`
                : ""
            }. Si el cambio no se refleja aún, actualiza en unos segundos.`
          );
        } else if (checkoutStatus === "cancelled" && !ignore) {
          setMessage("El proceso de pago fue cancelado.");
        } else if (!ignore) {
          setMessage("");
        }

        const user = await getAuthenticatedUser();

        if (!user) {
          if (!ignore) {
            setCurrentUserId(null);
            setCurrentPlan(null);
            setCurrentSubscriptionStatus(null);
            setCancelAtPeriodEnd(false);
            setHasStripeCustomer(false);
            setHasStripeSubscription(false);
          }
          return;
        }

        const profile = await ensureProfile(user.id, user.email);

        if (!ignore) {
          setCurrentUserId(user.id);
          setCurrentPlan(normalizePlan(profile?.plan));
          setCurrentSubscriptionStatus(profile?.subscription_status ?? null);
          setCancelAtPeriodEnd(Boolean(profile?.cancel_at_period_end));
          setHasStripeCustomer(Boolean(profile?.stripe_customer_id));
          setHasStripeSubscription(Boolean(profile?.stripe_subscription_id));
        }
      } catch (error: any) {
        console.error("Error cargando pricing:", error);

        if (!ignore) {
          setCurrentUserId(null);
          setCurrentPlan(null);
          setCurrentSubscriptionStatus(null);
          setCancelAtPeriodEnd(false);
          setHasStripeCustomer(false);
          setHasStripeSubscription(false);
          setMessage(
            error?.message || "No se pudo cargar la información del plan."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPlan();

    return () => {
      ignore = true;
    };
  }, [checkoutStatus, checkoutPlan]);

  async function refreshProfileState() {
    try {
      setMessage("");
      setLoading(true);
      await loadProfileState();
    } catch (error: any) {
      console.error("Error refrescando perfil:", error);
      setMessage(
        error?.message || "No se pudo refrescar el estado del perfil."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout(plan: UserPlan) {
    try {
      if (!currentUserId) {
        setMessage("Inicia sesión para activar o cambiar tu plan.");
        return;
      }

      if (plan === "free") {
        setMessage(
          "El plan Free no se activa por Stripe. Si cancelas una suscripción de pago, tu plan volverá a Free vía webhook."
        );
        return;
      }

      setChangingPlan(plan);
      setMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = session?.access_token || "";

      if (!accessToken) {
        throw new Error(
          "No se encontró una sesión válida para iniciar el checkout."
        );
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo iniciar Stripe Checkout.");
      }

      if (!data.url) {
        throw new Error("Stripe no devolvió una URL de checkout.");
      }

      window.location.href = data.url;
    } catch (error: any) {
      console.error("Error iniciando checkout:", error);
      setMessage(
        error?.message || "No se pudo iniciar el proceso de suscripción."
      );
    } finally {
      setChangingPlan(null);
    }
  }

  async function handleOpenPortal() {
    try {
      if (!currentUserId) {
        setMessage("Inicia sesión para gestionar tu facturación.");
        return;
      }

      setOpeningPortal(true);
      setMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = session?.access_token || "";

      if (!accessToken) {
        throw new Error(
          "No se encontró una sesión válida para abrir el portal."
        );
      }

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo abrir el portal de Stripe.");
      }

      if (!data.url) {
        throw new Error("Stripe no devolvió una URL de portal.");
      }

      window.location.href = data.url;
    } catch (error: any) {
      console.error("Error abriendo portal:", error);
      setMessage(
        error?.message || "No se pudo abrir el portal de facturación."
      );
    } finally {
      setOpeningPortal(false);
    }
  }

  async function handleSubscriptionAction(
    action: SubscriptionAction,
    plan?: UserPlan
  ) {
    try {
      if (!currentUserId) {
        setMessage("Inicia sesión para gestionar tu suscripción.");
        return;
      }

      setSubscriptionActionLoading(action);
      setMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = session?.access_token || "";

      if (!accessToken) {
        throw new Error(
          "No se encontró una sesión válida para gestionar la suscripción."
        );
      }

      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action,
          plan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo gestionar la suscripción.");
      }

      setMessage(
        data.message || "La suscripción fue actualizada correctamente."
      );

      await loadProfileState();
    } catch (error: any) {
      console.error("Error gestionando suscripción:", error);
      setMessage(error?.message || "No se pudo gestionar la suscripción.");
    } finally {
      setSubscriptionActionLoading(null);
    }
  }

  const freeLimits = useMemo(() => getPlanLimits("free"), []);
  const proLimits = useMemo(() => getPlanLimits("pro"), []);
  const premiumLimits = useMemo(() => getPlanLimits("premium"), []);

  const subscriptionStatusLabel = useMemo(() => {
    if (!currentSubscriptionStatus) return "Sin suscripción activa";

    if (currentSubscriptionStatus === "active") {
      return cancelAtPeriodEnd
        ? "Activa · cancelación programada"
        : "Activa";
    }

    if (currentSubscriptionStatus === "trialing") return "En prueba";
    if (currentSubscriptionStatus === "past_due") return "Pago pendiente";
    if (currentSubscriptionStatus === "payment_failed") return "Pago fallido";
    if (currentSubscriptionStatus === "canceled") return "Cancelada";
    if (currentSubscriptionStatus === "checkout_completed") {
      return "Procesando activación";
    }

    return currentSubscriptionStatus;
  }, [currentSubscriptionStatus, cancelAtPeriodEnd]);

  const canOpenPortal =
    Boolean(currentUserId) &&
    (currentPlan === "pro" ||
      currentPlan === "premium" ||
      hasStripeCustomer);

  const hasPaidPlan = currentPlan === "pro" || currentPlan === "premium";

  const canSwitchToPro =
    hasPaidPlan &&
    hasStripeSubscription &&
    currentPlan === "premium" &&
    subscriptionActionLoading === null;

  const canSwitchToPremium =
    hasPaidPlan &&
    hasStripeSubscription &&
    currentPlan === "pro" &&
    subscriptionActionLoading === null;

  const canCancelAtPeriodEnd =
    hasPaidPlan &&
    hasStripeSubscription &&
    !cancelAtPeriodEnd &&
    subscriptionActionLoading === null;

  const canResume =
    hasPaidPlan &&
    hasStripeSubscription &&
    cancelAtPeriodEnd &&
    subscriptionActionLoading === null;

  const currentPlanLabel = currentPlan ? getPlanLabel(currentPlan) : null;
  const recommendedNextLabel = currentPlan
    ? getUpgradeTargetLabel(currentPlan)
    : "Pro";
  const highlightResultsIntent =
    checkoutPlan === "pro" || checkoutPlan === "premium";

  const heroTitle = currentPlan
    ? currentPlan === "free"
      ? "Desbloquea una versión mucho más profunda de tu análisis"
      : currentPlan === "pro"
      ? "Ya tienes una base fuerte. Premium lleva la experiencia más lejos"
      : "Ya estás en la experiencia más completa"
    : "Empieza gratis. Escala cuando quieras más profundidad";

  const heroDescription = currentPlan
    ? currentPlan === "free"
      ? "Free te permite descubrir el valor inicial. Pro y Premium convierten esa primera lectura en una experiencia mucho más útil, personalizada y accionable."
      : currentPlan === "pro"
      ? "Pro ya desbloquea mucho valor. Premium es el siguiente salto si quieres máxima continuidad, mayor profundidad y una experiencia más refinada."
      : "Premium te da la capa más completa del ecosistema VitaSmart AI, con máxima profundidad, continuidad y personalización."
    : "Free te permite descubrir la plataforma. Pro convierte la experiencia en seguimiento real. Premium desbloquea la versión más completa, profunda y personalizada de VitaSmart AI.";

  const currentPlanNarrative = useMemo(() => {
    if (!currentPlan) {
      return "Inicia sesión para ver tu estado actual y gestionar tu experiencia.";
    }

    if (currentPlan === "free") {
      return "Tu cuenta actual está en la capa de entrada. Ya puedes descubrir valor, pero Pro y Premium desbloquean una experiencia mucho más útil.";
    }

    if (currentPlan === "pro") {
      return "Ya tienes una experiencia sólida. Premium es el siguiente salto si buscas máxima profundidad, continuidad y refinamiento.";
    }

    return "Ya estás en la capa más completa de VitaSmart AI. Aquí tienes la versión con mayor profundidad disponible.";
  }, [currentPlan]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <section className="mx-auto max-w-4xl text-center">
          <div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1 text-sm text-slate-600 shadow-sm">
            VitaSmart AI · Pricing
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {heroTitle}
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            {heroDescription}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Pill text="Empiezas en minutos" />
            <Pill text="Free útil desde el día uno" />
            <Pill text="Pro = más valor real" />
            <Pill text="Premium = máxima profundidad" />
          </div>

          <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            {loading ? (
              <span className="text-slate-600">Cargando tu plan actual...</span>
            ) : currentPlan ? (
              <div className="space-y-3">
                <div className="text-slate-900">
                  Plan actual: <strong>{currentPlanLabel}</strong>
                </div>
                <div className="text-sm text-slate-600">
                  Estado de suscripción:{" "}
                  <strong>{subscriptionStatusLabel}</strong>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {currentPlanNarrative}
                </div>

                {currentPlan !== "premium" && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">
                      Próximo salto recomendado:
                    </span>{" "}
                    {recommendedNextLabel}. Es la forma más rápida de desbloquear
                    una experiencia más profunda y más útil.
                  </div>
                )}
              </div>
            ) : (
              <span className="text-slate-600">
                Inicia sesión para activar y gestionar tu plan.
              </span>
            )}
          </div>

          {message && (
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              {message}
            </div>
          )}

          {highlightResultsIntent && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Estás a un paso de desbloquear una lectura más completa de tu
              análisis. Al mejorar tu plan, obtienes recomendaciones más
              profundas, mejor priorización y una experiencia mucho más
              accionable.
            </div>
          )}

          {canOpenPortal && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleOpenPortal}
                disabled={openingPortal}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {openingPortal ? "Abriendo portal..." : "Gestionar facturación"}
              </button>

              <button
                type="button"
                onClick={refreshProfileState}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Refrescar estado
              </button>

              {canSwitchToPro && (
                <button
                  type="button"
                  onClick={() => handleSubscriptionAction("switch_plan", "pro")}
                  disabled={subscriptionActionLoading !== null}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {subscriptionActionLoading === "switch_plan"
                    ? "Actualizando..."
                    : "Cambiar a Pro"}
                </button>
              )}

              {canSwitchToPremium && (
                <button
                  type="button"
                  onClick={() =>
                    handleSubscriptionAction("switch_plan", "premium")
                  }
                  disabled={subscriptionActionLoading !== null}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {subscriptionActionLoading === "switch_plan"
                    ? "Actualizando..."
                    : "Cambiar a Premium"}
                </button>
              )}

              {canCancelAtPeriodEnd && (
                <button
                  type="button"
                  onClick={() =>
                    handleSubscriptionAction("cancel_at_period_end")
                  }
                  disabled={subscriptionActionLoading !== null}
                  className="rounded-xl border border-red-200 bg-white px-5 py-3 font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {subscriptionActionLoading === "cancel_at_period_end"
                    ? "Procesando..."
                    : "Cancelar al final del período"}
                </button>
              )}

              {canResume && (
                <button
                  type="button"
                  onClick={() => handleSubscriptionAction("resume")}
                  disabled={subscriptionActionLoading !== null}
                  className="rounded-xl border border-emerald-200 bg-white px-5 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                >
                  {subscriptionActionLoading === "resume"
                    ? "Procesando..."
                    : "Reactivar suscripción"}
                </button>
              )}
            </div>
          )}
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-3">
          <PricingCard
            badge="Starter"
            title="Free"
            price="$0"
            subtitle="Perfecto para descubrir el valor inicial de la plataforma"
            emotionalLine="Empieza sin barreras, entiende tu punto de partida y valida si VitaSmart AI encaja contigo."
            features={[
              `Hasta ${getHistoryLimitLabel("free")} análisis guardados`,
              "Health Score",
              "Análisis base",
              "Marketplace general",
              "Ideal para probar y empezar",
            ]}
            ctaLabel={currentPlan === "free" ? "Plan actual" : "Empezar gratis"}
            secondaryLabel="Útil desde el primer día"
            onSelect={() => handleCheckout("free")}
            disabled={changingPlan !== null || currentPlan === "free"}
            highlighted={false}
            current={currentPlan === "free"}
          />

          <PricingCard
            badge="Más popular"
            title="Pro"
            price="$9"
            period="/mes"
            subtitle="La opción que convierte curiosidad en seguimiento real"
            emotionalLine="Aquí es donde VitaSmart AI empieza a sentirse mucho más poderosa, útil y accionable."
            features={[
              `Hasta ${getHistoryLimitLabel("pro")} análisis guardados`,
              "IA avanzada desbloqueada",
              "Recomendaciones priorizadas",
              "Marketplace inteligente",
              "Experiencia mucho más útil y profunda",
            ]}
            ctaLabel={
              changingPlan === "pro"
                ? "Redirigiendo..."
                : currentPlan === "pro"
                ? "Plan actual"
                : hasPaidPlan
                ? "Gestionar desde arriba"
                : "Desbloquear Pro"
            }
            secondaryLabel="Mejor equilibrio entre precio y valor"
            onSelect={() => handleCheckout("pro")}
            disabled={
              changingPlan !== null || currentPlan === "pro" || hasPaidPlan
            }
            highlighted={true}
            current={currentPlan === "pro"}
            recommended={true}
          />

          <PricingCard
            badge="Advanced"
            title="Premium"
            price="$19"
            period="/mes"
            subtitle="La versión más completa y refinada de toda la experiencia"
            emotionalLine="Pensado para usuarios que quieren máximo control, mayor continuidad y la profundidad más alta disponible."
            features={[
              `Hasta ${getHistoryLimitLabel("premium")} análisis guardados`,
              "Todo lo incluido en Pro",
              "Marketplace premium",
              "Mayor personalización",
              "Base para la experiencia más avanzada",
            ]}
            ctaLabel={
              changingPlan === "premium"
                ? "Redirigiendo..."
                : currentPlan === "premium"
                ? "Plan actual"
                : hasPaidPlan
                ? "Gestionar desde arriba"
                : "Ir a Premium"
            }
            secondaryLabel="Máximo valor para usuarios intensivos"
            onSelect={() => handleCheckout("premium")}
            disabled={
              changingPlan !== null ||
              currentPlan === "premium" ||
              hasPaidPlan
            }
            highlighted={false}
            current={currentPlan === "premium"}
          />
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-2">
          <BenefitPanel
            title="Por qué muchos terminan en Pro"
            description="Pro elimina la sensación de estar usando solo una muestra de la plataforma. Desbloquea profundidad, continuidad y una experiencia que ya se siente verdaderamente inteligente."
            items={[
              "IA avanzada para análisis más ricos",
              "Recomendaciones priorizadas por perfil",
              "Historial mucho más amplio",
              "Marketplace inteligente según el usuario",
            ]}
            dark={false}
          />

          <BenefitPanel
            title="Por qué Premium se siente aspiracional"
            description="Premium no es solo una mejora incremental. Es la sensación de tener la versión más completa, más pulida y más profunda del sistema VitaSmart AI."
            items={[
              "Análisis ilimitados",
              "Mayor continuidad en el seguimiento",
              "Experiencia premium en marketplace",
              "Máxima profundidad disponible en la app",
            ]}
            dark={true}
          />
        </section>

        <section className="mt-20 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-12">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                ¿Cómo elegir tu plan?
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                La mejor decisión depende de qué tan en serio quieres convertir
                esta app en una herramienta continua de mejora personal.
              </p>
            </div>

            <div className="grid gap-4">
              <FeatureRow
                title="Free"
                description="Para entrar, probar, entender tu perfil y empezar sin fricción."
              />
              <FeatureRow
                title="Pro"
                description="Para usuarios que ya quieren una experiencia más profunda, accionable y mucho más útil."
              />
              <FeatureRow
                title="Premium"
                description="Para quienes quieren la versión más completa, más avanzada y más refinada de la plataforma."
              />
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            Capacidades reales por plan
          </h2>

          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-4 py-3 font-medium">Funcionalidad</th>
                  <th className="px-4 py-3 font-medium">Free</th>
                  <th className="px-4 py-3 font-medium">Pro</th>
                  <th className="px-4 py-3 font-medium">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <PricingRow
                  label="Historial guardado"
                  free={getHistoryLimitLabel("free")}
                  pro={getHistoryLimitLabel("pro")}
                  premium={getHistoryLimitLabel("premium")}
                />
                <PricingRow
                  label="Análisis base"
                  free="Sí"
                  pro="Sí"
                  premium="Sí"
                />
                <PricingRow
                  label="IA avanzada"
                  free="No"
                  pro="Sí"
                  premium="Sí"
                />
                <PricingRow
                  label="Marketplace inteligente"
                  free="No"
                  pro="Sí"
                  premium="Sí"
                />
                <PricingRow
                  label="Marketplace premium"
                  free="No"
                  pro="No"
                  premium="Sí"
                />
                <PricingRow
                  label="Portal de facturación"
                  free="No"
                  pro="Sí"
                  premium="Sí"
                />
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Empieza hoy con tu primer análisis
          </h2>
          <p className="mt-3 text-slate-600">
            Entra gratis, siente el valor inicial y escala cuando quieras una
            experiencia mucho más profunda.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/quiz"
              className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
            >
              Hacer análisis
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
      {text}
    </div>
  );
}

function PricingCard({
  badge,
  title,
  price,
  period,
  subtitle,
  emotionalLine,
  features,
  ctaLabel,
  secondaryLabel,
  onSelect,
  disabled,
  highlighted,
  current,
  recommended = false,
}: {
  badge: string;
  title: string;
  price: string;
  period?: string;
  subtitle: string;
  emotionalLine: string;
  features: string[];
  ctaLabel: string;
  secondaryLabel: string;
  onSelect: () => void;
  disabled: boolean;
  highlighted: boolean;
  current: boolean;
  recommended?: boolean;
}) {
  return (
    <div
      className={`relative rounded-3xl p-8 shadow-sm ring-1 ${
        highlighted
          ? "bg-slate-900 text-white ring-slate-900"
          : "bg-white text-slate-900 ring-slate-200"
      }`}
    >
      {recommended && (
        <div className="absolute -top-3 left-6 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
          Recomendado
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            highlighted
              ? "bg-white/10 text-slate-200"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {badge}
        </div>

        {current && (
          <div
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              highlighted
                ? "bg-emerald-400/20 text-emerald-200"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            Actual
          </div>
        )}
      </div>

      <h3 className="mt-6 text-2xl font-bold">{title}</h3>

      <div className="mt-4 flex items-end gap-1">
        <span className="text-5xl font-bold">{price}</span>
        {period && (
          <span
            className={`pb-1 text-sm ${
              highlighted ? "text-slate-300" : "text-slate-500"
            }`}
          >
            {period}
          </span>
        )}
      </div>

      <p
        className={`mt-4 leading-7 ${
          highlighted ? "text-slate-300" : "text-slate-600"
        }`}
      >
        {subtitle}
      </p>

      <div
        className={`mt-4 rounded-2xl p-4 text-sm ${
          highlighted
            ? "bg-white/5 text-slate-200 ring-1 ring-white/10"
            : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
        }`}
      >
        {emotionalLine}
      </div>

      <ul className="mt-8 space-y-3">
        {features.map((feature, index) => (
          <li
            key={index}
            className={`flex items-start gap-3 ${
              highlighted ? "text-slate-100" : "text-slate-700"
            }`}
          >
            <span className="mt-1 text-sm">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={`mt-10 inline-flex w-full justify-center rounded-xl px-5 py-3 text-center font-semibold transition ${
          highlighted
            ? "bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50"
            : "bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
        }`}
      >
        {ctaLabel}
      </button>

      <div
        className={`mt-3 text-center text-xs ${
          highlighted ? "text-slate-300" : "text-slate-500"
        }`}
      >
        {secondaryLabel}
      </div>
    </div>
  );
}

function BenefitPanel({
  title,
  description,
  items,
  dark,
}: {
  title: string;
  description: string;
  items: string[];
  dark: boolean;
}) {
  return (
    <div
      className={`rounded-3xl p-8 shadow-sm ${
        dark ? "bg-slate-900 text-white" : "bg-white ring-1 ring-slate-200"
      }`}
    >
      <h2 className="text-2xl font-bold">{title}</h2>
      <p
        className={`mt-4 leading-7 ${
          dark ? "text-slate-300" : "text-slate-600"
        }`}
      >
        {description}
      </p>

      <div className="mt-6 grid gap-3">
        {items.map((item, index) => (
          <div
            key={index}
            className={`rounded-2xl p-4 ${
              dark
                ? "bg-white/5 text-slate-200 ring-1 ring-white/10"
                : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function PricingRow({
  label,
  free,
  pro,
  premium,
}: {
  label: string;
  free: string;
  pro: string;
  premium: string;
}) {
  return (
    <tr className="text-slate-700">
      <td className="px-4 py-4 font-medium">{label}</td>
      <td className="px-4 py-4">{free}</td>
      <td className="px-4 py-4">{pro}</td>
      <td className="px-4 py-4">{premium}</td>
    </tr>
  );
}
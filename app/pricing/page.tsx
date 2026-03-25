"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import {
  getPlanLabel,
  getPlanLimits,
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
                Planes para escalar tu salud preventiva con IA
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
        "id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status"
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
    };

    const { data: createdProfile, error: createError } = await supabase
      .from("user_profiles")
      .upsert([payload], { onConflict: "id" })
      .select(
        "id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status"
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
      setHasStripeCustomer(false);
      setHasStripeSubscription(false);
      return;
    }

    const profile = await ensureProfile(user.id, user.email);

    setCurrentUserId(user.id);
    setCurrentPlan(normalizePlan(profile?.plan));
    setCurrentSubscriptionStatus(profile?.subscription_status ?? null);
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
          setHasStripeCustomer(Boolean(profile?.stripe_customer_id));
          setHasStripeSubscription(Boolean(profile?.stripe_subscription_id));
        }
      } catch (error: any) {
        console.error("Error cargando pricing:", error);

        if (!ignore) {
          setCurrentUserId(null);
          setCurrentPlan(null);
          setCurrentSubscriptionStatus(null);
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
      setMessage(
        error?.message || "No se pudo gestionar la suscripción."
      );
    } finally {
      setSubscriptionActionLoading(null);
    }
  }

  const freeLimits = useMemo(() => getPlanLimits("free"), []);
  const proLimits = useMemo(() => getPlanLimits("pro"), []);
  const premiumLimits = useMemo(() => getPlanLimits("premium"), []);

  const subscriptionStatusLabel = useMemo(() => {
    if (!currentSubscriptionStatus) return "Sin suscripción activa";
    if (currentSubscriptionStatus === "active") return "Activa";
    if (currentSubscriptionStatus === "trialing") return "En prueba";
    if (currentSubscriptionStatus === "past_due") return "Pago pendiente";
    if (currentSubscriptionStatus === "payment_failed") return "Pago fallido";
    if (currentSubscriptionStatus === "canceled") return "Cancelada";
    if (currentSubscriptionStatus === "checkout_completed") {
      return "Procesando activación";
    }
    return currentSubscriptionStatus;
  }, [currentSubscriptionStatus]);

  const canOpenPortal =
    Boolean(currentUserId) &&
    (currentPlan === "pro" ||
      currentPlan === "premium" ||
      hasStripeCustomer);

  const hasPaidPlan =
    currentPlan === "pro" || currentPlan === "premium";

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
    currentSubscriptionStatus !== "canceled" &&
    subscriptionActionLoading === null;

  const canResume =
    hasPaidPlan &&
    hasStripeSubscription &&
    currentSubscriptionStatus === "canceled" &&
    subscriptionActionLoading === null;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <section className="mx-auto max-w-3xl text-center">
          <div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1 text-sm text-slate-600 shadow-sm">
            VitaSmart AI · Pricing
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Planes para escalar tu salud preventiva con IA
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Empieza gratis, guarda tu historial y evoluciona hacia una
            experiencia más profunda con análisis, seguimiento y
            recomendaciones inteligentes.
          </p>

          <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            {loading ? (
              <span className="text-slate-600">Cargando tu plan actual...</span>
            ) : currentPlan ? (
              <div className="space-y-2">
                <div className="text-slate-900">
                  Plan actual: <strong>{getPlanLabel(currentPlan)}</strong>
                </div>
                <div className="text-sm text-slate-600">
                  Estado de suscripción:{" "}
                  <strong>{subscriptionStatusLabel}</strong>
                </div>
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
                  onClick={() =>
                    handleSubscriptionAction("switch_plan", "pro")
                  }
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
            subtitle="Ideal para descubrir la plataforma"
            features={[
              `Hasta ${
                Number.isFinite(freeLimits.historyLimit)
                  ? freeLimits.historyLimit
                  : "∞"
              } análisis guardados`,
              "Health Score básico",
              "Análisis base con resumen y factores",
              "Acceso al quiz",
              "Marketplace general",
              freeLimits.advancedAI
                ? "IA avanzada incluida"
                : "IA avanzada bloqueada",
            ]}
            ctaLabel={currentPlan === "free" ? "Plan actual" : "Plan base"}
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
            subtitle="Para usuarios que quieren seguimiento real"
            features={[
              `Hasta ${
                Number.isFinite(proLimits.historyLimit)
                  ? proLimits.historyLimit
                  : "∞"
              } análisis guardados`,
              "IA avanzada desbloqueada",
              "Recomendaciones priorizadas",
              "Marketplace inteligente",
              "Historial extendido",
              "Dashboard y experiencia más profunda",
            ]}
            ctaLabel={
              changingPlan === "pro"
                ? "Redirigiendo..."
                : currentPlan === "pro"
                ? "Plan actual"
                : hasPaidPlan
                ? "Cambiar desde controles superiores"
                : "Suscribirme a Pro"
            }
            onSelect={() => handleCheckout("pro")}
            disabled={
              changingPlan !== null ||
              currentPlan === "pro" ||
              hasPaidPlan
            }
            highlighted={true}
            current={currentPlan === "pro"}
          />

          <PricingCard
            badge="Advanced"
            title="Premium"
            price="$19"
            period="/mes"
            subtitle="Para usuarios de optimización avanzada"
            features={[
              "Análisis ilimitados",
              "Todo lo incluido en Pro",
              "Bundles premium del marketplace",
              "Mayor personalización",
              "Experiencia avanzada por plan",
              "Base para futuras integraciones premium",
            ]}
            ctaLabel={
              changingPlan === "premium"
                ? "Redirigiendo..."
                : currentPlan === "premium"
                ? "Plan actual"
                : hasPaidPlan
                ? "Cambiar desde controles superiores"
                : "Suscribirme a Premium"
            }
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

        <section className="mt-20 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-12">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                ¿Qué incluye la visión de largo plazo?
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                VitaSmart AI evolucionará desde una herramienta de análisis hacia
                una plataforma de salud preventiva con seguimiento continuo,
                recomendaciones inteligentes y experiencias premium.
              </p>
            </div>

            <div className="grid gap-4">
              <FeatureRow
                title="Historial de salud"
                description="Visualiza la evolución de tu score y tus análisis en el tiempo."
              />
              <FeatureRow
                title="Dashboard personalizado"
                description="Consulta rápidamente tu estado actual, tendencias y prioridades."
              />
              <FeatureRow
                title="IA aplicada a prevención"
                description="Recibe interpretación clara y accionable de tu perfil de bienestar."
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
                  free="3"
                  pro="50"
                  premium="Ilimitado"
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
                  label="Bundles premium"
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
            Construye tu perfil, guarda tu historial y descubre cómo podría
            evolucionar tu salud con una plataforma inteligente.
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

function PricingCard({
  badge,
  title,
  price,
  period,
  subtitle,
  features,
  ctaLabel,
  onSelect,
  disabled,
  highlighted,
  current,
}: {
  badge: string;
  title: string;
  price: string;
  period?: string;
  subtitle: string;
  features: string[];
  ctaLabel: string;
  onSelect: () => void;
  disabled: boolean;
  highlighted: boolean;
  current: boolean;
}) {
  return (
    <div
      className={`rounded-3xl p-8 shadow-sm ring-1 ${
        highlighted
          ? "bg-slate-900 text-white ring-slate-900"
          : "bg-white text-slate-900 ring-slate-200"
      }`}
    >
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
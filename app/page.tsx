"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import {
  getHistoryLimitLabel,
  getPlanLabel,
  normalizePlan,
  type UserPlan,
} from "./lib/planLimits";

type HomeProfile = {
  plan?: UserPlan | string | null;
  subscription_status?: string | null;
  cancel_at_period_end?: boolean | null;
};

export default function HomePage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [authError, setAuthError] = useState("");
  const [currentPlan, setCurrentPlan] = useState<UserPlan>("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null
  );
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadProfileSafe(userId: string) {
      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("plan, subscription_status, cancel_at_period_end")
          .eq("id", userId)
          .maybeSingle();

        const typedProfile = profile as HomeProfile | null;

        if (!ignore) {
          setCurrentPlan(normalizePlan(typedProfile?.plan));
          setSubscriptionStatus(typedProfile?.subscription_status ?? null);
          setCancelAtPeriodEnd(Boolean(typedProfile?.cancel_at_period_end));
        }
      } catch (error) {
        console.error("Error cargando perfil home:", error);

        if (!ignore) {
          setCurrentPlan("free");
          setSubscriptionStatus(null);
          setCancelAtPeriodEnd(false);
        }
      }
    }

    async function checkSession() {
      try {
        if (!ignore) {
          setCheckingSession(true);
          setAuthError("");
        }

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (ignore) return;

        if (user) {
          setHasSession(true);
          await loadProfileSafe(user.id);
          setCheckingSession(false);
          router.replace("/dashboard");
          return;
        }

        setHasSession(false);
        setCurrentPlan("free");
        setSubscriptionStatus(null);
        setCancelAtPeriodEnd(false);
      } catch (error: any) {
        console.error("Error verificando sesión:", error);

        if (!ignore) {
          setHasSession(false);
          setAuthError(
            error?.message || "No se pudo verificar la sesión actual."
          );
          setCurrentPlan("free");
          setSubscriptionStatus(null);
          setCancelAtPeriodEnd(false);
        }
      } finally {
        if (!ignore) {
          setCheckingSession(false);
        }
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (ignore) return;

        setTimeout(async () => {
          if (ignore) return;

          if (session?.user) {
            setHasSession(true);
            await loadProfileSafe(session.user.id);
            setCheckingSession(false);
            router.replace("/dashboard");
          } else {
            setHasSession(false);
            setCurrentPlan("free");
            setSubscriptionStatus(null);
            setCancelAtPeriodEnd(false);
            setCheckingSession(false);
          }
        }, 0);
      }
    );

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [router]);

  const subscriptionStatusLabel = useMemo(() => {
    if (!subscriptionStatus) return "Sin suscripción activa";

    if (subscriptionStatus === "active") {
      return cancelAtPeriodEnd
        ? "Activa · cancelación programada"
        : "Activa";
    }

    if (subscriptionStatus === "trialing") return "En prueba";
    if (subscriptionStatus === "past_due") return "Pago pendiente";
    if (subscriptionStatus === "payment_failed") return "Pago fallido";
    if (subscriptionStatus === "canceled") return "Cancelada";
    if (subscriptionStatus === "checkout_completed") {
      return "Procesando activación";
    }

    return subscriptionStatus;
  }, [subscriptionStatus, cancelAtPeriodEnd]);

  const homeNarrative = useMemo(() => {
    if (currentPlan === "premium") {
      return "Ya estás en la experiencia más completa de VitaSmart AI, con máxima profundidad, continuidad y personalización.";
    }

    if (currentPlan === "pro") {
      return "Ya tienes una experiencia sólida. Premium es el siguiente salto si quieres una capa todavía más completa y refinada.";
    }

    return "Empiezas con valor desde el primer análisis. Luego puedes escalar hacia una experiencia mucho más útil y profunda.";
  }, [currentPlan]);

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
              VitaSmart AI
            </div>

            <h1 className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl">
              Verificando tu sesión...
            </h1>

            <p className="mt-4 text-slate-600">
              Estamos comprobando si ya tienes una cuenta activa para llevarte a
              tu dashboard personal.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (hasSession) {
    return (
      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
              VitaSmart AI
            </div>

            <h1 className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl">
              Redirigiendo a tu dashboard...
            </h1>

            <p className="mt-4 text-slate-600">
              Tu sesión está activa. Te estamos llevando a tu panel personal.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1 text-sm text-slate-600 shadow-sm">
              Preventive Health Intelligence
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              Entiende tu salud en minutos.
              <span className="block">Recibe tu Health Score.</span>
              <span className="block">Actúa con más claridad.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              VitaSmart AI analiza señales como energía, sueño, estrés y
              metabolismo para darte una lectura clara de tu punto de partida y
              ayudarte a mejorar con continuidad.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">
                Qué hace diferente a VitaSmart AI
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                No es solo un test. Es una experiencia diseñada para convertir
                tu resultado en claridad, prioridades y mejor seguimiento.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <HeroPill text="Empiezas gratis" />
              <HeroPill text="Análisis en minutos" />
              <HeroPill text="Mejoras con continuidad" />
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/quiz"
                className="rounded-xl bg-slate-900 px-6 py-3 text-center text-base font-semibold text-white transition hover:bg-slate-700"
              >
                Hacer mi análisis
              </Link>

              <Link
                href="/pricing"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-base font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ver planes
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Tu primera lectura puede estar lista en menos de 3 minutos.
            </p>

            {authError && (
              <p className="mt-6 max-w-2xl text-sm text-red-600">
                {authError}
              </p>
            )}
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Vista previa
              </div>

              <div className="mt-4 rounded-3xl bg-slate-900 p-6 text-white">
                <div className="flex items-end gap-2">
                  <div className="text-6xl font-bold">72</div>
                  <div className="pb-2 text-slate-300">/100</div>
                </div>

                <div className="mt-3 text-lg font-semibold">
                  Health Score estimado
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Una lectura así podría sugerir una base razonable, pero con
                  oportunidades claras de mejora en sueño, energía y enfoque.
                </p>

                <div className="mt-6 grid gap-3">
                  <PreviewSignal label="Sueño subóptimo detectado" />
                  <PreviewSignal label="Estrés más alto de lo ideal" />
                  <PreviewSignal label="Enfoque con margen de mejora" />
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <HeroStat
                  label="Health Score"
                  value="72/100"
                  note="Lectura inicial"
                />
                <HeroStat
                  label="Siguiente nivel"
                  value="Pro"
                  note="Más profundidad"
                />
                <HeroStat
                  label="Continuidad"
                  value="50+"
                  note="Historial real"
                />
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  Qué gana el usuario al continuar
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  La verdadera diferencia aparece cuando dejas de ver solo un
                  score y empiezas a usar VitaSmart AI como una herramienta de
                  seguimiento y decisión.
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Qué desbloquea cada nivel
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  <strong className="text-white">Free</strong> te deja descubrir
                  tu punto de partida sin fricción.
                </p>
                <p>
                  <strong className="text-white">Pro</strong> convierte el
                  resultado en una experiencia mucho más clara, útil y
                  accionable.
                </p>
                <p>
                  <strong className="text-white">Premium</strong> desbloquea la
                  versión más completa, más continua y más profunda de la app.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Cómo funciona VitaSmart AI
            </h2>
            <p className="mt-4 text-slate-600">
              El objetivo no es darte más información. Es darte una lectura
              clara y ayudarte a actuar con más criterio.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <StepCard
              step="01"
              title="Respondes un assessment rápido"
              description="Completa tu quiz y comparte señales clave sobre sueño, energía, estrés, hábitos y objetivo principal."
            />
            <StepCard
              step="02"
              title="Recibes tu Health Score"
              description="Obtienes una lectura inicial de tu perfil actual, con señales y prioridades que vale la pena observar."
            />
            <StepCard
              step="03"
              title="Escalas cuando quieres más valor"
              description="Sube a Pro o Premium para desbloquear más profundidad, más seguimiento y una experiencia mucho más útil."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
              El problema
            </div>

            <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
              La mayoría de las personas no sabe qué priorizar
            </h2>

            <div className="mt-6 grid gap-3">
              <ProblemRow text="Tienen señales difusas, pero no claridad real." />
              <ProblemRow text="Prueban cambios o suplementos sin criterio suficiente." />
              <ProblemRow text="No construyen continuidad ni seguimiento útil." />
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-sm">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-slate-300">
              La propuesta
            </div>

            <h2 className="mt-6 text-3xl font-bold tracking-tight">
              VitaSmart AI convierte señales sueltas en claridad accionable
            </h2>

            <div className="mt-6 grid gap-3">
              <ValueRowDark text="Te muestra tu punto de partida actual" />
              <ValueRowDark text="Te ayuda a ver qué conviene atacar primero" />
              <ValueRowDark text="Te permite ganar continuidad con el tiempo" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1 text-sm text-slate-600 shadow-sm">
            Comparación clara
          </div>

          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Elige la profundidad de experiencia que quieres vivir
          </h2>

          <p className="mt-4 text-slate-600">
            Free te deja empezar. Pro es donde VitaSmart AI empieza a sentirse
            realmente poderosa. Premium es la experiencia más completa.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          <PlanCard
            badge="Starter"
            title="Free"
            price="$0"
            subtitle="La mejor forma de empezar"
            features={[
              `Hasta ${getHistoryLimitLabel("free")} análisis guardados`,
              "Health Score",
              "Análisis base",
              "Marketplace general",
              "Ideal para probar la plataforma",
            ]}
            ctaHref="/quiz"
            ctaLabel="Empezar gratis"
            current={currentPlan === "free"}
            highlighted={false}
          />

          <PlanCard
            badge="Más recomendado"
            title="Pro"
            price="$39.000"
            period="COP / mes"
            subtitle="Donde la plataforma realmente cobra vida"
            features={[
              `Hasta ${getHistoryLimitLabel("pro")} análisis guardados`,
              "IA avanzada",
              "Recomendaciones priorizadas",
              "Marketplace inteligente",
              "Seguimiento mucho más útil",
            ]}
            ctaHref="/pricing"
            ctaLabel="Quiero Pro"
            current={currentPlan === "pro"}
            highlighted={true}
          />

          <PlanCard
            badge="Advanced"
            title="Premium"
            price="$69.000"
            period="COP / mes"
            subtitle="La experiencia más completa de VitaSmart AI"
            features={[
              `Hasta ${getHistoryLimitLabel("premium")} análisis guardados`,
              "Todo lo de Pro",
              "Marketplace premium",
              "Mayor continuidad",
              "Máximo control y profundidad",
            ]}
            ctaHref="/pricing"
            ctaLabel="Quiero Premium"
            current={currentPlan === "premium"}
            highlighted={false}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
              Qué cambia al mejorar tu plan
            </div>

            <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              La diferencia no es solo tener más funciones
            </h2>

            <p className="mt-4 text-slate-600">
              La diferencia real es pasar de una lectura inicial a una
              experiencia más útil, más profunda y con mejor continuidad.
            </p>
          </div>

          <div className="mt-10 overflow-x-auto">
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
                <HomeComparisonRow
                  label="Health Score"
                  free="Sí"
                  pro="Sí"
                  premium="Sí"
                />
                <HomeComparisonRow
                  label="Análisis base"
                  free="Sí"
                  pro="Sí"
                  premium="Sí"
                />
                <HomeComparisonRow
                  label="IA avanzada"
                  free="No"
                  pro="Sí"
                  premium="Sí"
                />
                <HomeComparisonRow
                  label="Historial guardado"
                  free={getHistoryLimitLabel("free")}
                  pro={getHistoryLimitLabel("pro")}
                  premium={getHistoryLimitLabel("premium")}
                />
                <HomeComparisonRow
                  label="Marketplace inteligente"
                  free="No"
                  pro="Sí"
                  premium="Sí"
                />
                <HomeComparisonRow
                  label="Marketplace premium"
                  free="No"
                  pro="No"
                  premium="Sí"
                />
                <HomeComparisonRow
                  label="Profundidad de lectura"
                  free="Inicial"
                  pro="Avanzada"
                  premium="Máxima"
                />
                <HomeComparisonRow
                  label="Continuidad"
                  free="Básica"
                  pro="Alta"
                  premium="Máxima"
                />
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/quiz"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
            >
              Probar gratis
            </Link>

            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver comparación completa
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-8 ring-1 ring-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                Lo que desbloquea Pro
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                Pro está pensado para usuarios que ya entendieron el valor del
                análisis inicial y quieren una experiencia más clara, más útil y
                con mejor continuidad.
              </p>

              <div className="mt-6 grid gap-3">
                <ValueRow text="IA avanzada para enriquecer el análisis" />
                <ValueRow text="Recomendaciones priorizadas por perfil" />
                <ValueRow text="Historial extendido para seguimiento real" />
                <ValueRow text="Marketplace inteligente según el usuario" />
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-sm">
              <h2 className="text-2xl font-bold">
                Lo que hace deseable a Premium
              </h2>
              <p className="mt-4 leading-7 text-slate-300">
                Premium no es solo “más”. Es la versión más completa, más
                continua y más profunda del sistema VitaSmart AI.
              </p>

              <div className="mt-6 grid gap-3">
                <ValueRowDark text="Análisis ilimitados" />
                <ValueRowDark text="Mayor continuidad y contexto" />
                <ValueRowDark text="Experiencia premium en marketplace" />
                <ValueRowDark text="Máxima profundidad disponible en la app" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
              Empieza hoy
            </div>

            <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Tu primer análisis puede ser el inicio de una mejora real
            </h2>

            <p className="mt-4 text-slate-600">
              Entra gratis, descubre tu punto de partida y decide después si
              quieres seguir en lo básico o pasar a una experiencia mucho más
              valiosa.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/quiz"
                className="inline-flex justify-center rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                Hacer mi análisis ahora
              </Link>

              <Link
                href="/pricing"
                className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Comparar planes
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {homeNarrative}
            </div>

            {subscriptionStatus && (
              <p className="mt-5 text-sm text-slate-500">
                Estado actual detectado: {subscriptionStatusLabel}.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <div className="text-sm font-semibold text-amber-900">
            Aviso importante
          </div>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            VitaSmart AI no proporciona diagnóstico médico. La información y las
            recomendaciones presentadas tienen fines informativos y preventivos y
            no sustituyen la consulta con profesionales de la salud.
          </p>
        </div>
      </section>
    </main>
  );
}

function HeroPill({ text }: { text: string }) {
  return (
    <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
      {text}
    </div>
  );
}

function PreviewSignal({ label }: { label: string }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-200 ring-1 ring-white/10">
      {label}
    </div>
  );
}

function HeroStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-600">{note}</div>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
      <div className="text-sm font-semibold tracking-wide text-slate-500">
        {step}
      </div>
      <h3 className="mt-3 text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function ProblemRow({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-slate-700 ring-1 ring-slate-200">
      {text}
    </div>
  );
}

function PlanCard({
  badge,
  title,
  price,
  period,
  subtitle,
  features,
  ctaHref,
  ctaLabel,
  current,
  highlighted,
}: {
  badge: string;
  title: string;
  price: string;
  period?: string;
  subtitle: string;
  features: string[];
  ctaHref: string;
  ctaLabel: string;
  current: boolean;
  highlighted: boolean;
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

      <Link
        href={ctaHref}
        className={`mt-10 inline-flex w-full justify-center rounded-xl px-5 py-3 text-center font-semibold transition ${
          highlighted
            ? "bg-white text-slate-900 hover:bg-slate-100"
            : "bg-slate-900 text-white hover:bg-slate-700"
        }`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

function HomeComparisonRow({
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

function ValueRow({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-slate-700 ring-1 ring-slate-200">
      {text}
    </div>
  );
}

function ValueRowDark({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 text-slate-200 ring-1 ring-white/10">
      {text}
    </div>
  );
}
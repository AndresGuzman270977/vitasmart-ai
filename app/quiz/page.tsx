"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserProfile, getCurrentUserProfile } from "../lib/profile";
import {
  getPlanLimits,
  getUpgradeTargetLabel,
  normalizePlan,
  type PlanType,
} from "../lib/planLimits";
import UpgradePrompt from "../../components/UpgradePrompt";

const totalSteps = 5;

export default function QuizPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<PlanType>("free");
  const [planLoading, setPlanLoading] = useState(true);
  const [formData, setFormData] = useState({
    age: "",
    sex: "",
    stress: "",
    sleep: "",
    goal: "",
  });

  const progress = (step / totalSteps) * 100;

  useEffect(() => {
    let ignore = false;

    async function loadPlan() {
      try {
        setPlanLoading(true);

        await ensureUserProfile();
        const profile = await getCurrentUserProfile();

        if (!ignore) {
          setPlan(normalizePlan(profile?.plan));
        }
      } catch (error) {
        console.error("No se pudo cargar el plan del usuario:", error);

        if (!ignore) {
          setPlan("free");
        }
      } finally {
        if (!ignore) {
          setPlanLoading(false);
        }
      }
    }

    loadPlan();

    return () => {
      ignore = true;
    };
  }, []);

  const limits = useMemo(() => getPlanLimits(plan), [plan]);
  const advancedAIEnabled = limits.advancedAI;
  const smartMarketplaceEnabled = limits.marketplaceMode !== "basic";
  const nextRecommendedPlan =
    !planLoading && plan !== "premium" ? getUpgradeTargetLabel(plan) : null;

  const quizNarrative = useMemo(() => {
    if (planLoading) {
      return "Estamos cargando los beneficios de tu plan actual.";
    }

    if (plan === "premium") {
      return "Estás entrando con la experiencia más completa de VitaSmart AI. Tu resultado puede incluir una lectura más profunda, más refinada y más útil para actuar.";
    }

    if (plan === "pro") {
      return "Tu plan actual ya desbloquea una experiencia mucho más profunda y útil. Estás entrando con una versión más poderosa del análisis.";
    }

    return "Estás usando la entrada base. Tu análisis será útil, pero Pro y Premium desbloquean una lectura mucho más avanzada, más personalizada y más accionable.";
  }, [plan, planLoading]);

  const expectationNarrative = useMemo(() => {
    if (planLoading) {
      return "Tu resultado se está preparando según tu plan actual.";
    }

    if (plan === "premium") {
      return "Vas a obtener una lectura diseñada para aprovechar al máximo la profundidad disponible en la plataforma.";
    }

    if (plan === "pro") {
      return "Tu resultado puede darte una lectura mucho más rica y una base más fuerte para tomar decisiones.";
    }

    return "Vas a obtener una lectura inicial clara. Si luego quieres más profundidad, podrás desbloquear una versión mucho más completa del análisis.";
  }, [plan, planLoading]);

  const currentStepNarrative = useMemo(() => {
    if (step === 1) {
      return "Empezamos con una base simple para personalizar mejor tu lectura.";
    }
    if (step === 2) {
      return "Este dato ayuda a adaptar mejor el análisis a tu perfil.";
    }
    if (step === 3) {
      return "Aquí medimos una de las variables que más impactan energía, sueño y enfoque.";
    }
    if (step === 4) {
      return "El descanso influye mucho en la calidad de toda tu lectura.";
    }
    return "Tu objetivo define hacia dónde se orienta la interpretación de tu resultado.";
  }, [step]);

  const handleNext = () => {
    if (step === 1 && !formData.age) return;
    if (step === 2 && !formData.sex) return;
    if (step === 3 && !formData.stress) return;
    if (step === 4 && !formData.sleep) return;
    if (step === 5 && !formData.goal) return;

    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    const params = new URLSearchParams({
      age: formData.age,
      sex: formData.sex,
      stress: formData.stress,
      sleep: formData.sleep,
      goal: formData.goal,
    });

    router.push(`/results?${params.toString()}`);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-4 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
            VitaSmart AI · Quiz
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
              Plan actual: {planLoading ? "Cargando..." : plan.toUpperCase()}
            </div>

            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
              IA avanzada: {advancedAIEnabled ? "Activada" : "Bloqueada"}
            </div>

            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
              Marketplace inteligente:{" "}
              {smartMarketplaceEnabled ? "Activado" : "Bloqueado"}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Análisis personalizado
          </h1>

          <p className="mt-2 text-slate-600">
            Responde paso a paso para generar una lectura inicial de tu perfil
            y construir una base útil para tu evolución.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-sm font-semibold text-slate-900">
              Lectura rápida de tu experiencia actual
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {quizNarrative}
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <div className="text-sm font-semibold text-violet-900">
              Lo que viene después de este quiz
            </div>
            <p className="mt-2 text-sm leading-6 text-violet-800">
              {expectationNarrative}
            </p>
          </div>

          {!planLoading && plan === "free" && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-900">
                Estás usando el plan Free
              </div>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                Al finalizar verás tu análisis base. Las recomendaciones
                avanzadas con IA y el marketplace inteligente están disponibles
                en los planes Pro y Premium.
              </p>

              {nextRecommendedPlan && (
                <p className="mt-3 text-sm leading-6 text-amber-800">
                  Tu siguiente salto recomendado es{" "}
                  <strong>{nextRecommendedPlan}</strong> si quieres una lectura
                  mucho más profunda.
                </p>
              )}

              <div className="mt-4">
                <Link
                  href="/pricing"
                  className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Ver planes
                </Link>
              </div>
            </div>
          )}

          {!planLoading && plan === "pro" && (
            <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <div className="text-sm font-semibold text-sky-900">
                Ya estás en Pro
              </div>
              <p className="mt-2 text-sm leading-6 text-sky-800">
                Tu análisis ya entra con una capa mucho más útil de profundidad,
                priorización y valor práctico.
              </p>
            </div>
          )}

          {!planLoading && plan === "premium" && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-sm font-semibold text-emerald-900">
                Estás en la experiencia más completa
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Tu resultado aprovechará la versión más profunda y más refinada
                disponible dentro de VitaSmart AI.
              </p>
            </div>
          )}

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
              <span>
                Paso {step} de {totalSteps}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-slate-900 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-3 text-sm text-slate-600">
              {currentStepNarrative}
            </p>
          </div>

          <div className="mt-10">
            {step === 1 && (
              <StepCard
                title="¿Cuál es tu edad?"
                description="Esto nos ayuda a adaptar mejor la lectura inicial de tu perfil."
              >
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  placeholder="Ejemplo: 48"
                  className="w-full rounded-xl border border-slate-300 p-4 text-lg"
                />
              </StepCard>
            )}

            {step === 2 && (
              <StepCard
                title="¿Cuál es tu sexo?"
                description="Algunas recomendaciones y patrones de lectura cambian según el perfil."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <OptionButton
                    active={formData.sex === "male"}
                    onClick={() => setFormData({ ...formData, sex: "male" })}
                    label="Hombre"
                  />
                  <OptionButton
                    active={formData.sex === "female"}
                    onClick={() => setFormData({ ...formData, sex: "female" })}
                    label="Mujer"
                  />
                </div>
              </StepCard>
            )}

            {step === 3 && (
              <StepCard
                title="¿Cómo está tu nivel de estrés?"
                description="El estrés influye mucho en energía, recuperación, sueño y concentración."
              >
                <div className="grid gap-3">
                  <OptionButton
                    active={formData.stress === "low"}
                    onClick={() => setFormData({ ...formData, stress: "low" })}
                    label="Bajo"
                  />
                  <OptionButton
                    active={formData.stress === "medium"}
                    onClick={() =>
                      setFormData({ ...formData, stress: "medium" })
                    }
                    label="Medio"
                  />
                  <OptionButton
                    active={formData.stress === "high"}
                    onClick={() => setFormData({ ...formData, stress: "high" })}
                    label="Alto"
                  />
                </div>
              </StepCard>
            )}

            {step === 4 && (
              <StepCard
                title="¿Cuántas horas duermes normalmente?"
                description="El descanso es una de las variables más importantes de toda la lectura."
              >
                <div className="grid gap-3">
                  <OptionButton
                    active={formData.sleep === "5"}
                    onClick={() => setFormData({ ...formData, sleep: "5" })}
                    label="Menos de 5 horas"
                  />
                  <OptionButton
                    active={formData.sleep === "6"}
                    onClick={() => setFormData({ ...formData, sleep: "6" })}
                    label="6 horas"
                  />
                  <OptionButton
                    active={formData.sleep === "7"}
                    onClick={() => setFormData({ ...formData, sleep: "7" })}
                    label="7 horas"
                  />
                  <OptionButton
                    active={formData.sleep === "8"}
                    onClick={() => setFormData({ ...formData, sleep: "8" })}
                    label="8 o más horas"
                  />
                </div>
              </StepCard>
            )}

            {step === 5 && (
              <StepCard
                title="¿Cuál es tu objetivo principal?"
                description="Selecciona el resultado que más te interesa mejorar en este momento."
              >
                <div className="grid gap-3">
                  <OptionButton
                    active={formData.goal === "energy"}
                    onClick={() => setFormData({ ...formData, goal: "energy" })}
                    label="Más energía"
                  />
                  <OptionButton
                    active={formData.goal === "focus"}
                    onClick={() => setFormData({ ...formData, goal: "focus" })}
                    label="Mejor concentración"
                  />
                  <OptionButton
                    active={formData.goal === "sleep"}
                    onClick={() => setFormData({ ...formData, goal: "sleep" })}
                    label="Dormir mejor"
                  />
                  <OptionButton
                    active={formData.goal === "health"}
                    onClick={() => setFormData({ ...formData, goal: "health" })}
                    label="Salud general"
                  />
                </div>
              </StepCard>
            )}
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">
              Lo que obtienes con tu plan actual
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <FeatureItem
                title="Health Score"
                enabled
                description="Disponible para todos los planes."
              />
              <FeatureItem
                title="Análisis base"
                enabled
                description="Resumen y factores principales."
              />
              <FeatureItem
                title="Recomendaciones avanzadas"
                enabled={advancedAIEnabled}
                description={
                  advancedAIEnabled
                    ? "Incluidas en tu plan."
                    : "Disponibles en Pro y Premium."
                }
              />
            </div>
          </div>

          {!planLoading && plan !== "premium" && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">
                Lo que podrías desbloquear después
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Este quiz te dará valor desde ahora. Pero tu siguiente salto
                puede convertir ese resultado en una lectura mucho más profunda,
                más accionable y más útil para seguir mejorando.
              </p>
            </div>
          )}

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Atrás
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
            >
              {step === totalSteps
                ? plan === "free"
                  ? "Ver mi análisis"
                  : "Generar mi análisis"
                : "Siguiente"}
            </button>
          </div>
        </div>

        {!planLoading && plan !== "premium" && (
          <section className="mt-8">
            <UpgradePrompt currentPlan={plan} context="quiz" />
          </section>
        )}
      </div>
    </main>
  );
}

function StepCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mb-6 mt-2 text-slate-600">{description}</p>
      {children}
    </div>
  );
}

function OptionButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left font-medium transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function FeatureItem({
  title,
  enabled,
  description,
}: {
  title: string;
  enabled: boolean;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
            enabled
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {enabled ? "Activo" : "Bloqueado"}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}
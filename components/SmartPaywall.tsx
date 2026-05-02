"use client";

import Link from "next/link";
import type { PlanType } from "../app/lib/planLimits";
import { trackEvent } from "../app/lib/analytics";

type SmartPaywallProps = {
  plan: PlanType;
  healthScore: number;
  mainGoal?: string;
  location: string;
  potentialScore?: number;
};

function getPaywallCopy(params: {
  plan: PlanType;
  healthScore: number;
  mainGoal?: string;
  potentialScore?: number;
}) {
  const { plan, healthScore, mainGoal, potentialScore } = params;

  if (plan === "pro") {
    return {
      eyebrow: "Premium disponible",
      title: "Lleva tu análisis al nivel más completo",
      description:
        "Premium añade mayor profundidad, continuidad y una lectura más refinada para entender patrones con más precisión.",
      cta: "Subir a Premium",
      secondary: "Comparar planes",
    };
  }

  if (healthScore < 60) {
    return {
      eyebrow: "Análisis incompleto",
      title: "Tu resultado merece una lectura más profunda",
      description:
        "El score muestra señales que conviene ordenar mejor. Pro desbloquea IA avanzada, priorización real y recomendaciones más accionables.",
      cta: "Desbloquear Pro",
      secondary: "Ver qué incluye",
    };
  }

  if (mainGoal === "sleep") {
    return {
      eyebrow: "Sueño y recuperación",
      title: "Descubre qué está afectando tu descanso",
      description:
        "Pro te ayuda a conectar sueño, estrés, fatiga y hábitos para priorizar mejor tus próximos pasos.",
      cta: "Ver análisis completo",
      secondary: "Comparar planes",
    };
  }

  if (mainGoal === "energy" || mainGoal === "focus") {
    return {
      eyebrow: "Energía y enfoque",
      title: "Identifica qué está frenando tu rendimiento",
      description:
        "Pro desbloquea una lectura más clara sobre los factores que afectan tu energía, concentración y consistencia diaria.",
      cta: "Desbloquear mi lectura",
      secondary: "Ver planes",
    };
  }

  return {
    eyebrow: "Potencial de mejora",
    title: potentialScore
      ? `Tu score podría acercarse a ${potentialScore}+`
      : "Tu análisis puede ser mucho más útil",
    description:
      "Con Pro desbloqueas IA avanzada, recomendaciones priorizadas y una lectura mucho más personalizada de tu perfil.",
    cta: "Desbloquear análisis completo",
    secondary: "Comparar planes",
  };
}

export default function SmartPaywall({
  plan,
  healthScore,
  mainGoal,
  location,
  potentialScore,
}: SmartPaywallProps) {
  if (plan === "premium") return null;

  const copy = getPaywallCopy({
    plan,
    healthScore,
    mainGoal,
    potentialScore,
  });

  const targetPlan = plan === "pro" ? "premium" : "pro";

  return (
    <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
      <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700 ring-1 ring-violet-200">
        {copy.eyebrow}
      </div>

      <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        {copy.title}
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
        {copy.description}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-100">
          <div className="text-sm font-semibold text-slate-900">
            IA avanzada
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Menos plantilla, más lectura real de tu perfil.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-100">
          <div className="text-sm font-semibold text-slate-900">
            Priorización
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Qué atacar primero y por qué.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-100">
          <div className="text-sm font-semibold text-slate-900">
            Continuidad
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Más valor al repetir análisis.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/pricing?plan=${targetPlan}&source=${location}`}
          onClick={() =>
            trackEvent({
              eventName: "smart_paywall_clicked",
              page: "/results",
              plan,
              metadata: {
                location,
                targetPlan,
                healthScore,
                mainGoal: mainGoal ?? null,
              },
            })
          }
          className="inline-flex justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          {copy.cta}
        </Link>

        <Link
          href="/pricing"
          onClick={() =>
            trackEvent({
              eventName: "smart_paywall_secondary_clicked",
              page: "/results",
              plan,
              metadata: {
                location,
                targetPlan,
                healthScore,
                mainGoal: mainGoal ?? null,
              },
            })
          }
          className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {copy.secondary}
        </Link>
      </div>
    </section>
  );
}
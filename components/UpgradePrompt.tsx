"use client";

import Link from "next/link";
import { getPlanLabel, type UserPlan } from "../app/lib/planLimits";

type UpgradePromptProps = {
  currentPlan: UserPlan;
  context?: "dashboard" | "history" | "results" | "marketplace" | "quiz";
};

export default function UpgradePrompt({
  currentPlan,
  context = "dashboard",
}: UpgradePromptProps) {
  const isFree = currentPlan === "free";
  const targetPlan = isFree ? "Pro o Premium" : "Premium";

  const title = getTitle(currentPlan, context);
  const description = getDescription(currentPlan, context);
  const ctaLabel = getCtaLabel(currentPlan, context);

  return (
    <div className="rounded-3xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
      <div className="mb-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700 ring-1 ring-sky-200">
        Mejora tu experiencia
      </div>

      <h3 className="text-2xl font-bold tracking-tight text-slate-900">
        {title}
      </h3>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
        {description}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <UpgradeBenefit
          title={isFree ? "Más profundidad" : "Más personalización"}
          description={
            isFree
              ? "Desbloquea una lectura más completa, más útil y con mayor sensación de valor."
              : "Premium añade una capa más refinada para convertir cada resultado en una guía más profunda."
          }
        />
        <UpgradeBenefit
          title="Más continuidad"
          description={
            isFree
              ? "Convierte análisis aislados en una experiencia con seguimiento, contexto y progreso."
              : "Haz que cada análisis, historial y recomendación gane más peso dentro de una experiencia premium."
          }
        />
        <UpgradeBenefit
          title={isFree ? "Más inteligencia" : "Más nivel"}
          description={
            isFree
              ? "Activa IA avanzada, mejor priorización y una experiencia mucho más potente."
              : "Accede a la versión más aspiracional, completa y cuidada de VitaSmart AI."
          }
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          {ctaLabel}
        </Link>

        <Link
          href="/quiz"
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Hacer otro análisis
        </Link>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Plan actual: {getPlanLabel(currentPlan)} · Próximo salto recomendado:{" "}
        {targetPlan}
      </p>
    </div>
  );
}

function UpgradeBenefit({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-sky-200">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function getTitle(
  plan: UserPlan,
  context: UpgradePromptProps["context"]
): string {
  if (plan === "free") {
    if (context === "results") {
      return "Estás viendo solo una parte del valor real";
    }
    if (context === "history") {
      return "Tu historial puede darte mucho más valor";
    }
    if (context === "marketplace") {
      return "Tu marketplace puede sentirse mucho más inteligente";
    }
    if (context === "quiz") {
      return "Este análisis puede volverse mucho más profundo";
    }
    return "Desbloquea una experiencia mucho más completa";
  }

  if (context === "results") {
    return "Tu análisis puede llegar a otro nivel";
  }

  if (context === "marketplace") {
    return "Da el salto a la experiencia Premium";
  }

  return "Lleva tu experiencia al nivel más alto";
}

function getDescription(
  plan: UserPlan,
  context: UpgradePromptProps["context"]
): string {
  if (plan === "free") {
    if (context === "results") {
      return "Ahora mismo estás viendo una versión inicial de tu lectura. Al mejorar tu plan, puedes desbloquear recomendaciones avanzadas, mejor priorización y una interpretación mucho más útil para actuar con intención.";
    }
    if (context === "history") {
      return "El historial gana valor cuando puedes ver más contexto, más registros y detectar tendencias con mayor claridad a lo largo del tiempo.";
    }
    if (context === "marketplace") {
      return "Tu catálogo actual es útil, pero Pro y Premium activan una capa de personalización que hace que el orden y la exploración se sientan mucho más relevantes para ti.";
    }
    if (context === "quiz") {
      return "Si mejoras tu plan, este mismo flujo puede activar una versión más avanzada del análisis y entregarte una experiencia claramente superior.";
    }
    return "Free es una excelente puerta de entrada, pero Pro y Premium convierten VitaSmart AI en una herramienta mucho más útil, inteligente y valiosa.";
  }

  if (context === "results") {
    return "Ya tienes una experiencia sólida, pero Premium desbloquea una versión más profunda, más refinada y más personalizada de tu análisis, para que cada resultado se sienta mucho más accionable.";
  }

  return "Ya tienes una experiencia sólida, pero Premium desbloquea la versión más profunda, más refinada y más aspiracional del ecosistema VitaSmart AI.";
}

function getCtaLabel(
  plan: UserPlan,
  context: UpgradePromptProps["context"]
): string {
  if (context === "results") {
    return plan === "free"
      ? "Desbloquear mi análisis completo"
      : "Pasar a Premium";
  }

  return "Ver planes";
}
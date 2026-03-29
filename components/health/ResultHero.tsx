// components/health/ResultHero.tsx

"use client";

import ConfidenceBadge from "./ConfidenceBadge";

type ResultHeroProps = {
  plan: "free" | "pro" | "premium";
  healthScore: number;
  confidenceLevel: "high" | "moderate" | "limited";
  confidenceExplanation: string;
  executiveSummary: string;
  clinicalStyleSummary: string;
  upgradeMessage?: string | null;
  advancedAI: boolean;
};

function getScoreTone(score: number) {
  if (score >= 80) {
    return {
      label: "Strong preventive profile",
      accent: "text-emerald-700",
      ring: "border-emerald-200 bg-emerald-50",
    };
  }

  if (score >= 60) {
    return {
      label: "Mixed profile with optimization opportunities",
      accent: "text-amber-700",
      ring: "border-amber-200 bg-amber-50",
    };
  }

  return {
    label: "Priority preventive support suggested",
    accent: "text-rose-700",
    ring: "border-rose-200 bg-rose-50",
  };
}

function getPlanLabel(plan: ResultHeroProps["plan"]) {
  if (plan === "premium") return "Premium";
  if (plan === "pro") return "Pro";
  return "Free";
}

export default function ResultHero({
  plan,
  healthScore,
  confidenceLevel,
  confidenceExplanation,
  executiveSummary,
  clinicalStyleSummary,
  upgradeMessage,
  advancedAI,
}: ResultHeroProps) {
  const tone = getScoreTone(healthScore);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-8 p-6 md:grid-cols-[280px_1fr] md:p-8">
        <div className="flex flex-col items-start gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
              Plan {getPlanLabel(plan)}
            </span>

            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${tone.ring} ${tone.accent}`}
            >
              {tone.label}
            </span>

            {advancedAI ? (
              <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
                Advanced AI
              </span>
            ) : null}
          </div>

          <div className="flex h-44 w-44 flex-col items-center justify-center rounded-full border border-slate-200 bg-slate-50">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Health Score
            </span>
            <span className="mt-2 text-5xl font-bold tracking-tight text-slate-900">
              {healthScore}
            </span>
            <span className="mt-1 text-sm text-slate-500">/100</span>
          </div>

          <ConfidenceBadge
            level={confidenceLevel}
            explanation={confidenceExplanation}
          />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Preventive Health Interpretation
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              {executiveSummary}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              Clinical-style summary
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {clinicalStyleSummary}
            </p>
          </div>

          {upgradeMessage ? (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-700">
                Upgrade insight
              </h3>
              <p className="mt-2 text-sm leading-7 text-violet-800">
                {upgradeMessage}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
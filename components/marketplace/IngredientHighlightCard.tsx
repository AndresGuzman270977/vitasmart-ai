"use client";

import ProductEvidenceBadge from "./ProductEvidenceBadge";

type Locale = "es" | "en";

type IngredientHighlightCardProps = {
  item: {
    ingredientName: string;
    matchScore: number;
    whyMatched: string[];
    evidenceLevel?: "high" | "moderate" | "limited";
    evidenceSummary?: string;
    scientificContext?: string;
  };
  locale?: Locale;
};

const textByLocale = {
  es: {
    primaryIngredient: "Ingrediente principal",
    prioritized:
      "Priorizado según tu perfil actual y tus necesidades de soporte dominantes.",
    matchScore: "Nivel de afinidad",
    whyItAppears: "Por qué aparece",
    evidenceSummary: "Resumen de evidencia",
    scientificContext: "Contexto científico",
    scientificContextUnavailable: "Contexto científico no disponible.",
  },
  en: {
    primaryIngredient: "Primary ingredient",
    prioritized:
      "Prioritized based on your current profile and dominant support needs.",
    matchScore: "Match score",
    whyItAppears: "Why it appears",
    evidenceSummary: "Evidence summary",
    scientificContext: "Scientific context",
    scientificContextUnavailable: "Scientific context unavailable.",
  },
} as const;

export default function IngredientHighlightCard({
  item,
  locale = "es",
}: IngredientHighlightCardProps) {
  const t = textByLocale[locale] ?? textByLocale.es;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
            {t.primaryIngredient}
          </span>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
            {item.ingredientName}
          </h2>

          <p className="mt-2 text-sm text-slate-500">{t.prioritized}</p>
        </div>

        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {t.matchScore}
          </div>
          <div className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {item.matchScore}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <ProductEvidenceBadge evidenceLevel={item.evidenceLevel} />
      </div>

      {item.whyMatched.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            {t.whyItAppears}
          </h3>

          <div className="mt-3 space-y-2">
            {item.whyMatched.map((reason, index) => (
              <div
                key={`${reason}-${index}`}
                className="rounded-xl bg-white px-3 py-2 text-sm leading-6 text-slate-700"
              >
                {reason}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {item.evidenceSummary ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              {t.evidenceSummary}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {item.evidenceSummary}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              {t.scientificContext}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {item.scientificContext || t.scientificContextUnavailable}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
"use client";

import ProductEvidenceBadge from "./ProductEvidenceBadge";

type IngredientHighlightCardProps = {
  item: {
    ingredientName: string;
    matchScore: number;
    whyMatched: string[];
    evidenceLevel?: "high" | "moderate" | "limited";
    evidenceSummary?: string;
    scientificContext?: string;
  };
};

export default function IngredientHighlightCard({
  item,
}: IngredientHighlightCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
            Primary ingredient
          </span>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
            {item.ingredientName}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Prioritized based on your current profile and dominant support needs.
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Match score
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
            Why it appears
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
              Evidence summary
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {item.evidenceSummary}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              Scientific context
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {item.scientificContext || "Scientific context unavailable."}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
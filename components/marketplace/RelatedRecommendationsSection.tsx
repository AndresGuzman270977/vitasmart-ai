"use client";

import Link from "next/link";
import ProductEvidenceBadge from "./ProductEvidenceBadge";

type RelatedRecommendationsSectionProps = {
  items: Array<{
    ingredientSlug: string;
    ingredientName: string;
    matchScore: number;
    whyMatched: string[];
    evidenceLevel?: "high" | "moderate" | "limited";
  }>;
};

export default function RelatedRecommendationsSection({
  items,
}: RelatedRecommendationsSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Recomendaciones relacionadas
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Ingredientes adicionales que también pueden ser relevantes según tu
            perfil actual.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.ingredientSlug}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                  {item.ingredientName}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Nivel de afinidad {item.matchScore}/100
                </p>
              </div>

              <ProductEvidenceBadge evidenceLevel={item.evidenceLevel} />
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-700">
              {item.whyMatched?.[0] ||
                "Relevante dentro de tu perfil actual de soporte."}
            </p>

            <div className="mt-4">
              <Link
                href={`/marketplace?ingredient=${item.ingredientSlug}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Ver comparación de este ingrediente
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
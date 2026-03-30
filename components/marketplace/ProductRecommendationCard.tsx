"use client";

import Link from "next/link";
import ProductVisualScore from "./ProductVisualScore";
import ProductQualityBadge from "./ProductQualityBadge";
import ProductSafetyPanel from "./ProductSafetyPanel";

type Locale = "es" | "en";

type ProductRecommendationCardProps = {
  tierLabel: string;
  tierValue: "excellent" | "very_good" | "good";
  item?: {
    product: {
      slug: string;
      productName: string;
      brand: string;
      manufacturer: string;
      presentation: string;
      priceLabel: string;
      estimatedCostPerDayUsd: number | null;
      qualityScore: number;
      valueScore: number;
      qualitySeals: string[];
      qualityNotes: string[];
      imageUrl: string;
      buyUrl: string;
    };
    narratives: {
      whyForUser: string;
      scienceSummary: string;
      labQualitySummary: string;
      howToTake: string;
      restrictionsSummary: string;
      sideEffectsSummary: string;
      budgetReason: string;
    };
    fitScore: number;
    qualityScore: number;
    valueScore: number;
  };
  cautions?: string[];
  locale?: Locale;
};

const textByLocale = {
  es: {
    structuredBy: "Organizado por calidad, valor y ajuste al perfil.",
    noProduct: "Aún no hay un producto disponible para este tier.",
    imageUnavailable: "Imagen no disponible",
    fit: "Ajuste",
    quality: "Calidad",
    value: "Valor",
    price: "Precio",
    dailyCost: "Costo diario",
    na: "N/A",
    whyForYou: "Por qué para ti",
    scienceSummary: "Base científica resumida",
    qualityAndLabContext: "Calidad y contexto de laboratorio",
    howToTake: "Cómo tomarlo",
    whyThisTier: "Por qué entra en este tier",
    qualityNotes: "Notas de calidad",
    viewDetail: "Ver detalle",
    viewProduct: "Ver producto",
  },
  en: {
    structuredBy: "Structured by quality, value, and profile fit.",
    noProduct: "No product available for this tier yet.",
    imageUnavailable: "Image unavailable",
    fit: "Fit",
    quality: "Quality",
    value: "Value",
    price: "Price",
    dailyCost: "Daily cost",
    na: "N/A",
    whyForYou: "Why for you",
    scienceSummary: "Science summary",
    qualityAndLabContext: "Quality and lab context",
    howToTake: "How to take",
    whyThisTier: "Why this tier",
    qualityNotes: "Quality notes",
    viewDetail: "View detail",
    viewProduct: "View product",
  },
} as const;

export default function ProductRecommendationCard({
  tierLabel,
  tierValue,
  item,
  cautions = [],
  locale = "es",
}: ProductRecommendationCardProps) {
  const t = textByLocale[locale] ?? textByLocale.es;

  if (!item) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">{tierLabel}</h3>
          <ProductQualityBadge value={tierValue} />
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          {t.noProduct}
        </div>
      </div>
    );
  }

  const product = item.product;
  const narratives = item.narratives;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">
            {tierLabel}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{t.structuredBy}</p>
        </div>

        <ProductQualityBadge value={tierValue} />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.productName}
            className="h-64 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
            {t.imageUnavailable}
          </div>
        )}
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xl font-semibold tracking-tight text-slate-900">
            {product.productName}
          </p>

          {product.qualitySeals.map((seal) => (
            <ProductQualityBadge
              key={seal}
              value={
                seal as
                  | "USP_VERIFIED"
                  | "NSF_173"
                  | "GMP"
                  | "THIRD_PARTY_TESTED"
                  | "NONE"
              }
            />
          ))}
        </div>

        <p className="mt-2 text-sm text-slate-600">
          {product.brand} · {product.manufacturer}
        </p>

        <p className="mt-1 text-sm text-slate-500">{product.presentation}</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ProductVisualScore label={t.fit} value={item.fitScore} />
        <ProductVisualScore label={t.quality} value={item.qualityScore} />
        <ProductVisualScore label={t.value} value={item.valueScore} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            {t.price}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {product.priceLabel}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            {t.dailyCost}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {product.estimatedCostPerDayUsd != null
              ? `$${product.estimatedCostPerDayUsd.toFixed(2)}`
              : t.na}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <TextBlock title={t.whyForYou} text={narratives.whyForUser} />
        <TextBlock title={t.scienceSummary} text={narratives.scienceSummary} />
        <TextBlock
          title={t.qualityAndLabContext}
          text={narratives.labQualitySummary}
        />
        <TextBlock title={t.howToTake} text={narratives.howToTake} />
        <TextBlock title={t.whyThisTier} text={narratives.budgetReason} />
      </div>

      <div className="mt-5">
        <ProductSafetyPanel
          restrictionsSummary={narratives.restrictionsSummary}
          sideEffectsSummary={narratives.sideEffectsSummary}
          cautions={cautions}
        />
      </div>

      {product.qualityNotes.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            {t.qualityNotes}
          </h4>

          <div className="mt-3 space-y-2">
            {product.qualityNotes.map((note, index) => (
              <div
                key={`${note}-${index}`}
                className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700"
              >
                {note}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/marketplace/${product.slug}`}
          className="inline-flex items-center rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          {t.viewDetail}
        </Link>

        {product.buyUrl && product.buyUrl !== "#" ? (
          <a
            href={product.buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {t.viewProduct}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </h4>
      <p className="mt-2 text-sm leading-6 text-slate-700">{text}</p>
    </div>
  );
}
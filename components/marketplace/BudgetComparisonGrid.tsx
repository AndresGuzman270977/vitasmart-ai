"use client";

import ProductRecommendationCard from "./ProductRecommendationCard";

type Locale = "es" | "en";

type ProductRecommendationView = {
  product: {
    slug: string;
    ingredientSlug: string;
    productName: string;
    brand: string;
    manufacturer: string;
    form: "capsule" | "tablet" | "softgel" | "powder" | "liquid" | "gummy";
    presentation: string;
    servings: number | null;
    priceUsd: number | null;
    priceLabel: string;
    estimatedCostPerDayUsd: number | null;
    budgetTier: "excellent" | "very_good" | "good";
    qualityScore: number;
    valueScore: number;
    qualitySeals: string[];
    qualityNotes: string[];
    imageUrl: string;
    buyUrl: string;
    availableMarkets: ("amazon" | "iherb" | "direct")[];
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

type IngredientRecommendationView = {
  cautions: string[];
  options: {
    excellent?: ProductRecommendationView;
    veryGood?: ProductRecommendationView;
    good?: ProductRecommendationView;
  };
};

type BudgetComparisonGridProps = {
  ingredient: IngredientRecommendationView;
  locale?: Locale;
};

const labels = {
  es: {
    excellent: "Excelente",
    veryGood: "Muy buena",
    good: "Buena",
  },
  en: {
    excellent: "Excellent",
    veryGood: "Very good",
    good: "Good",
  },
} as const;

export default function BudgetComparisonGrid({
  ingredient,
  locale = "es",
}: BudgetComparisonGridProps) {
  const t = labels[locale] ?? labels.es;

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <ProductRecommendationCard
        tierLabel={t.excellent}
        tierValue="excellent"
        item={ingredient.options.excellent}
        cautions={ingredient.cautions}
        locale={locale}
      />

      <ProductRecommendationCard
        tierLabel={t.veryGood}
        tierValue="very_good"
        item={ingredient.options.veryGood}
        cautions={ingredient.cautions}
        locale={locale}
      />

      <ProductRecommendationCard
        tierLabel={t.good}
        tierValue="good"
        item={ingredient.options.good}
        cautions={ingredient.cautions}
        locale={locale}
      />
    </div>
  );
}
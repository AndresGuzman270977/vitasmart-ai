"use client";

import ProductRecommendationCard from "./ProductRecommendationCard";

type BudgetComparisonGridProps = {
  ingredient: {
    cautions: string[];
    options: {
      excellent?: any;
      veryGood?: any;
      good?: any;
    };
  };
};

export default function BudgetComparisonGrid({
  ingredient,
}: BudgetComparisonGridProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <ProductRecommendationCard
        tierLabel="Excelente"
        tierValue="excellent"
        item={ingredient.options.excellent}
        cautions={ingredient.cautions}
      />

      <ProductRecommendationCard
        tierLabel="Muy buena"
        tierValue="very_good"
        item={ingredient.options.veryGood}
        cautions={ingredient.cautions}
      />

      <ProductRecommendationCard
        tierLabel="Buena"
        tierValue="good"
        item={ingredient.options.good}
        cautions={ingredient.cautions}
      />
    </div>
  );
}
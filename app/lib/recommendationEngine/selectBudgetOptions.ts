// app/lib/recommendationEngine/selectBudgetOptions.ts

import { productCatalog } from "../catalog/productCatalog";
import { ProductCatalogItem } from "../catalog/catalogTypes";

type BudgetOptions = {
  excellent?: ProductCatalogItem;
  veryGood?: ProductCatalogItem;
  good?: ProductCatalogItem;
};

function certificationScore(product: ProductCatalogItem): number {
  return product.qualitySeals.reduce((acc, seal) => {
    if (seal === "USP_VERIFIED") return acc + 12;
    if (seal === "NSF_173") return acc + 10;
    if (seal === "THIRD_PARTY_TESTED") return acc + 8;
    if (seal === "GMP") return acc + 5;
    return acc;
  }, 0);
}

function usabilityScore(product: ProductCatalogItem): number {
  let score = 0;

  if (product.form === "capsule" || product.form === "softgel") score += 8;
  if (product.estimatedCostPerDayUsd != null && product.estimatedCostPerDayUsd <= 1.5) score += 8;
  if (product.servings != null && product.servings >= 60) score += 6;

  return score;
}

function computeProductFitScore(product: ProductCatalogItem, ingredientMatchScore: number): number {
  const finalScore =
    ingredientMatchScore * 0.35 +
    product.qualityScore * 0.25 +
    certificationScore(product) * 0.15 +
    product.valueScore * 0.15 +
    usabilityScore(product) * 0.1;

  return Math.round(finalScore);
}

export function selectBudgetOptions(
  ingredientSlug: string,
  ingredientMatchScore: number
): BudgetOptions {
  const products = productCatalog.filter(
    (product) => product.ingredientSlug === ingredientSlug
  );

  const scored = products
    .map((product) => ({
      product,
      finalScore: computeProductFitScore(product, ingredientMatchScore),
    }))
    .sort((a, b) => b.finalScore - a.finalScore);

  const excellent = scored
    .filter((item) => item.product.budgetTier === "excellent")
    .at(0)?.product;

  const veryGood = scored
    .filter((item) => item.product.budgetTier === "very_good")
    .at(0)?.product;

  const good = scored
    .filter((item) => item.product.budgetTier === "good")
    .at(0)?.product;

  return {
    excellent,
    veryGood,
    good,
  };
}
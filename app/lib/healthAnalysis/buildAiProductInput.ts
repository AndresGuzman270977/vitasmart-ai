// app/lib/healthAnalysis/buildAiProductInput.ts

import { IngredientCatalogItem } from "../catalog/catalogTypes";
import { ProductCatalogItem } from "../catalog/catalogTypes";

type BuildAiProductInputParams = {
  ingredient: IngredientCatalogItem;
  product: ProductCatalogItem;
  mainGoal?: string;
  whyMatched: string[];
  cautions: string[];
};

export function buildAiProductInput(params: BuildAiProductInputParams) {
  return {
    ingredientSlug: params.ingredient.slug,
    ingredientName: params.ingredient.name,
    ingredientEvidenceLevel: params.ingredient.evidenceLevel,
    ingredientEvidenceSummary: params.ingredient.evidenceSummary,
    scientificContext: params.ingredient.scientificContext,
    productName: params.product.productName,
    brand: params.product.brand,
    manufacturer: params.product.manufacturer,
    qualitySeals: params.product.qualitySeals,
    qualityNotes: params.product.qualityNotes,
    suggestedUse: params.ingredient.suggestedUse,
    restrictions: params.ingredient.restrictions,
    sideEffects: params.ingredient.sideEffects,
    mainGoal: params.mainGoal ?? "general_health",
    whyMatched: params.whyMatched,
    cautions: params.cautions,
    budgetTier: params.product.budgetTier,
  };
}
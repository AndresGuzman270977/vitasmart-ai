// app/lib/recommendationEngine/recommendationTypes.ts

import { ProductCatalogItem } from "../catalog/catalogTypes";

export type IngredientSafetyDecision =
  | "allow"
  | "allow_with_caution"
  | "high_caution"
  | "avoid";

export type RankedIngredient = {
  ingredientSlug: string;
  ingredientName: string;
  matchScore: number;
  safetyDecision: IngredientSafetyDecision;
  matchReasons: string[];
  cautionReasons: string[];
  rejectedReasons: string[];
};

export type RecommendationEngineOutput = {
  userNeedSummary: {
    dominantNeeds: string[];
    secondaryNeeds: string[];
  };

  topIngredients: Array<{
    ingredientSlug: string;
    ingredientName: string;
    matchScore: number;
    safetyDecision: IngredientSafetyDecision;
    whyMatched: string[];
    cautions: string[];
    budgetOptions: {
      excellent?: ProductCatalogItem;
      veryGood?: ProductCatalogItem;
      good?: ProductCatalogItem;
    };
  }>;
};
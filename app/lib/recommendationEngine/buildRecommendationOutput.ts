// app/lib/recommendationEngine/buildRecommendationOutput.ts

import { RecommendationEngineOutput, RankedIngredient } from "./recommendationTypes";
import { selectBudgetOptions } from "./selectBudgetOptions";

type BuildRecommendationOutputParams = {
  rankedIngredients: RankedIngredient[];
  dominantNeeds: string[];
  secondaryNeeds: string[];
};

export function buildRecommendationOutput({
  rankedIngredients,
  dominantNeeds,
  secondaryNeeds,
}: BuildRecommendationOutputParams): RecommendationEngineOutput {
  const topIngredients = rankedIngredients
    .filter((item) => item.safetyDecision !== "avoid")
    .slice(0, 4)
    .map((item) => ({
      ingredientSlug: item.ingredientSlug,
      ingredientName: item.ingredientName,
      matchScore: item.matchScore,
      safetyDecision: item.safetyDecision,
      whyMatched: item.matchReasons,
      cautions: item.cautionReasons,
      budgetOptions: selectBudgetOptions(item.ingredientSlug, item.matchScore),
    }));

  return {
    userNeedSummary: {
      dominantNeeds,
      secondaryNeeds,
    },
    topIngredients,
  };
}
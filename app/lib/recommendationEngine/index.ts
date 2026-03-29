// app/lib/recommendationEngine/index.ts

import { NeedScores } from "../healthEngine/computeNeedScores";
import { NormalizedProfile } from "../healthEngine/normalizeProfile";
import { buildRecommendationOutput } from "./buildRecommendationOutput";
import { rankIngredients } from "./rankIngredients";

type RecommendationEngineInput = {
  profile: NormalizedProfile & {
    baseConditions?: string[];
    currentMedications?: string[];
    currentSupplements?: string[];
    biomarkers?: Record<string, number | string | undefined>;
  };
  needScores: NeedScores;
  dominantNeeds: string[];
  secondaryNeeds: string[];
};

export function runRecommendationEngine({
  profile,
  needScores,
  dominantNeeds,
  secondaryNeeds,
}: RecommendationEngineInput) {
  const rankedIngredients = rankIngredients({
    profile,
    needs: needScores,
  });

  const recommendationOutput = buildRecommendationOutput({
    rankedIngredients,
    dominantNeeds,
    secondaryNeeds,
  });

  return {
    rankedIngredients,
    recommendationOutput,
  };
}
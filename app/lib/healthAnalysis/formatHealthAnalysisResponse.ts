// app/lib/healthAnalysis/formatHealthAnalysisResponse.ts

import { ingredientCatalog } from "../catalog/ingredientCatalog";
import { buildFallbackProductNarrative } from "./fallbackNarratives";
import {
  HealthAnalysisResponse,
  ProductRecommendationView,
  TopIngredientRecommendationView,
} from "./types";

type FormatParams = {
  planMeta: Pick<
    HealthAnalysisResponse,
    | "plan"
    | "requestedAiMode"
    | "appliedAiMode"
    | "advancedAI"
    | "wasDowngraded"
    | "upgradeRequired"
    | "upgradeMessage"
  >;
  scores: HealthAnalysisResponse["scores"];
  confidence: HealthAnalysisResponse["confidence"];
  summaries: HealthAnalysisResponse["summaries"];
  insights: HealthAnalysisResponse["insights"];
  userNeeds: HealthAnalysisResponse["userNeeds"];
  advancedRecommendations: string[];
  rawProductRecommendations: Array<{
    ingredientSlug: string;
    ingredientName: string;
    matchScore: number;
    safetyDecision: TopIngredientRecommendationView["safetyDecision"];
    whyMatched: string[];
    cautions: string[];
    budgetOptions: {
      excellent?: ProductRecommendationView["product"];
      veryGood?: ProductRecommendationView["product"];
      good?: ProductRecommendationView["product"];
    };
  }>;
};

function buildProductView(
  ingredientSlug: string,
  whyMatched: string[],
  cautions: string[],
  product?: ProductRecommendationView["product"]
): ProductRecommendationView | undefined {
  if (!product) return undefined;

  const narratives = buildFallbackProductNarrative({
    ingredientSlug,
    product,
    whyMatched,
    cautions,
  });

  return {
    product,
    narratives,
    fitScore: Math.round((product.qualityScore * 0.35 + product.valueScore * 0.25 + 35) % 100),
    qualityScore: product.qualityScore,
    valueScore: product.valueScore,
  };
}

export function formatHealthAnalysisResponse(
  params: FormatParams
): HealthAnalysisResponse {
  const productRecommendations: TopIngredientRecommendationView[] =
    params.rawProductRecommendations.map((item) => {
      const ingredient = ingredientCatalog.find(
        (ing) => ing.slug === item.ingredientSlug
      );

      return {
        ingredientSlug: item.ingredientSlug,
        ingredientName: item.ingredientName,
        matchScore: item.matchScore,
        safetyDecision: item.safetyDecision,
        whyMatched: item.whyMatched,
        cautions: item.cautions,
        evidenceLevel: ingredient?.evidenceLevel,
        evidenceSummary: ingredient?.evidenceSummary,
        scientificContext: ingredient?.scientificContext,
        options: {
          excellent: buildProductView(
            item.ingredientSlug,
            item.whyMatched,
            item.cautions,
            item.budgetOptions.excellent
          ),
          veryGood: buildProductView(
            item.ingredientSlug,
            item.whyMatched,
            item.cautions,
            item.budgetOptions.veryGood
          ),
          good: buildProductView(
            item.ingredientSlug,
            item.whyMatched,
            item.cautions,
            item.budgetOptions.good
          ),
        },
      };
    });

  return {
    ...params.planMeta,
    assessmentVersion: "v2.0.0",
    scores: params.scores,
    confidence: params.confidence,
    summaries: params.summaries,
    insights: params.insights,
    userNeeds: params.userNeeds,
    advancedRecommendations: params.advancedRecommendations,
    productRecommendations,
  };
}
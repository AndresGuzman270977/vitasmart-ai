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

function cleanText(value: unknown, fallback = ""): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function cleanStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, max);
}

function clampScore(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildFitScore(product: ProductRecommendationView["product"]): number {
  const quality = clampScore(product.qualityScore, 60);
  const value = clampScore(product.valueScore, 60);

  // Más estable y lógica que usar % 100
  return clampScore(quality * 0.65 + value * 0.35, 60);
}

function buildProductView(
  ingredientSlug: string,
  whyMatched: string[],
  cautions: string[],
  product?: ProductRecommendationView["product"]
): ProductRecommendationView | undefined {
  if (!product) return undefined;

  const safeWhyMatched = cleanStringArray(whyMatched, 6);
  const safeCautions = cleanStringArray(cautions, 6);

  const narratives = buildFallbackProductNarrative({
    ingredientSlug,
    product,
    whyMatched: safeWhyMatched,
    cautions: safeCautions,
  });

  return {
    product,
    narratives: {
      whyForUser: cleanText(narratives.whyForUser),
      scienceSummary: cleanText(narratives.scienceSummary),
      labQualitySummary: cleanText(narratives.labQualitySummary),
      howToTake: cleanText(narratives.howToTake),
      restrictionsSummary: cleanText(narratives.restrictionsSummary),
      sideEffectsSummary: cleanText(narratives.sideEffectsSummary),
      budgetReason: cleanText(narratives.budgetReason),
    },
    fitScore: buildFitScore(product),
    qualityScore: clampScore(product.qualityScore),
    valueScore: clampScore(product.valueScore),
  };
}

export function formatHealthAnalysisResponse(
  params: FormatParams
): HealthAnalysisResponse {
  const productRecommendations: TopIngredientRecommendationView[] =
    (params.rawProductRecommendations || []).map((item) => {
      const ingredient = ingredientCatalog.find(
        (ing) => ing.slug === item.ingredientSlug
      );

      return {
        ingredientSlug: cleanText(item.ingredientSlug),
        ingredientName: cleanText(
          item.ingredientName,
          ingredient?.name || item.ingredientSlug
        ),
        matchScore: clampScore(item.matchScore),
        safetyDecision: item.safetyDecision,
        whyMatched: cleanStringArray(item.whyMatched, 8),
        cautions: cleanStringArray(item.cautions, 8),
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
    scores: {
      healthScore: clampScore(params.scores.healthScore),
      sleepScore:
        params.scores.sleepScore == null
          ? null
          : clampScore(params.scores.sleepScore),
      stressScore:
        params.scores.stressScore == null
          ? null
          : clampScore(params.scores.stressScore),
      energyScore:
        params.scores.energyScore == null
          ? null
          : clampScore(params.scores.energyScore),
      focusScore:
        params.scores.focusScore == null
          ? null
          : clampScore(params.scores.focusScore),
      metabolicScore:
        params.scores.metabolicScore == null
          ? null
          : clampScore(params.scores.metabolicScore),
    },
    confidence: {
      confidenceLevel: params.confidence.confidenceLevel,
      confidenceExplanation: cleanText(params.confidence.confidenceExplanation),
      completenessScore: clampScore(params.confidence.completenessScore),
    },
    summaries: {
      executiveSummary: cleanText(params.summaries.executiveSummary),
      clinicalStyleSummary: cleanText(params.summaries.clinicalStyleSummary),
      scoreNarrative: cleanText(params.summaries.scoreNarrative),
      professionalFollowUpAdvice: cleanText(
        params.summaries.professionalFollowUpAdvice
      ),
    },
    insights: {
      strengths: cleanStringArray(params.insights.strengths, 12),
      mainDrivers: cleanStringArray(params.insights.mainDrivers, 12),
      priorityActions: cleanStringArray(params.insights.priorityActions, 12),
      riskSignals: cleanStringArray(params.insights.riskSignals, 12),
    },
    userNeeds: {
      dominantNeeds: cleanStringArray(params.userNeeds.dominantNeeds, 10),
      secondaryNeeds: cleanStringArray(params.userNeeds.secondaryNeeds, 10),
    },
    advancedRecommendations: cleanStringArray(params.advancedRecommendations, 8),
    productRecommendations,
  };
}
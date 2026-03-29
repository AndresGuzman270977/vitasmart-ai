// app/lib/healthAnalysis/fallbackNarratives.ts

import { ingredientCatalog } from "../catalog/ingredientCatalog";
import { ProductCatalogItem } from "../catalog/catalogTypes";
import {
  HealthAnalysisConfidenceBlock,
  HealthAnalysisScoreBlock,
  HealthAnalysisSummaryBlock,
  ProductNarrativeOutput,
} from "./types";

function scoreBand(score: number): "strong" | "mixed" | "fragile" {
  if (score >= 80) return "strong";
  if (score >= 60) return "mixed";
  return "fragile";
}

function humanizeNeedLabel(value: string): string {
  return value
    .replace(/Need$/i, "")
    .replace(/([A-Z])/g, " $1")
    .replaceAll("_", " ")
    .trim()
    .toLowerCase();
}

export function buildFallbackResultNarratives(params: {
  scores: HealthAnalysisScoreBlock;
  confidence: HealthAnalysisConfidenceBlock;
  strengths: string[];
  mainDrivers: string[];
  priorityActions: string[];
  riskSignals: string[];
  mainGoal?: string;
  dominantNeeds: string[];
  secondaryNeeds: string[];
}): HealthAnalysisSummaryBlock {
  const band = scoreBand(params.scores.healthScore);

  const executiveSummary =
    band === "strong"
      ? `Your current profile shows a relatively solid preventive health picture, although there are still targeted areas that could be optimized. The strongest opportunities appear around ${params.dominantNeeds
          .map(humanizeNeedLabel)
          .slice(0, 2)
          .join(" and ")}.`
      : band === "mixed"
      ? `Your current profile suggests a mixed preventive health picture. Some areas look reasonably stable, but there are clear opportunities to prioritize ${params.dominantNeeds
          .map(humanizeNeedLabel)
          .slice(0, 2)
          .join(" and ")}.`
      : `Your current profile suggests several preventive areas deserve closer attention. The most relevant priorities appear to be ${params.dominantNeeds
          .map(humanizeNeedLabel)
          .slice(0, 2)
          .join(" and ")}.`

  const clinicalStyleSummary = `This interpretation is not diagnostic. It is a structured preventive reading of self-reported inputs${
    params.confidence.completenessScore >= 70
      ? " with relatively good data completeness"
      : params.confidence.completenessScore >= 40
      ? " with moderate data completeness"
      : " with limited data completeness"
  }. The dominant drivers in this profile are ${
    params.mainDrivers.length > 0
      ? params.mainDrivers.join(", ").toLowerCase()
      : "general preventive support needs"
  }. These findings may be consistent with a need for lifestyle reinforcement and, when relevant, professional follow-up.`

  const scoreNarrative = `Health Score: ${params.scores.healthScore}/100. Sleep: ${
    params.scores.sleepScore ?? "N/A"
  }, Stress: ${params.scores.stressScore ?? "N/A"}, Energy: ${
    params.scores.energyScore ?? "N/A"
  }, Focus: ${params.scores.focusScore ?? "N/A"}, Metabolic: ${
    params.scores.metabolicScore ?? "N/A"
  }. Confidence level: ${params.confidence.confidenceLevel}.`

  const professionalFollowUpAdvice =
    params.riskSignals.length > 0
      ? `Some preventive follow-up signals were identified: ${params.riskSignals
          .slice(0, 3)
          .join("; ")}. If these patterns persist, or if there are symptoms, medications, or known medical conditions involved, it would be reasonable to validate the findings with a qualified health professional.`
      : `This profile does not generate strong preventive warning signals, but it would still be reasonable to review progress over time, especially if the main goal is ${params.mainGoal ?? "general health"}. A professional review may be useful if symptoms persist or additional lab data becomes available.`

  return {
    executiveSummary,
    clinicalStyleSummary,
    scoreNarrative,
    professionalFollowUpAdvice,
  };
}

function qualitySealNarrative(product: ProductCatalogItem): string {
  if (product.qualitySeals.length === 0 || product.qualitySeals.includes("NONE")) {
    return "No strong third-party seal is highlighted in this catalog entry, so confidence depends more on brand and formulation context.";
  }

  return `Quality context includes ${product.qualitySeals.join(
    ", "
  )}, which may increase confidence in manufacturing or verification standards depending on the specific product.`;
}

export function buildFallbackProductNarrative(params: {
  ingredientSlug: string;
  product: ProductCatalogItem;
  whyMatched: string[];
  cautions: string[];
}): ProductNarrativeOutput {
  const ingredient = ingredientCatalog.find(
    (item) => item.slug === params.ingredientSlug
  );

  const whyForUser = params.whyMatched.length
    ? `This product appears relevant because ${params.whyMatched
        .slice(0, 3)
        .join(" ")}`
    : `This product appears relevant because the ingredient aligns with one of the stronger support priorities in the current profile.`

  const scienceSummary = ingredient
    ? `${ingredient.evidenceSummary} ${ingredient.scientificContext}`
    : "This ingredient was selected because it may align with the current preventive support profile, although scientific relevance can vary depending on context."

  const labQualitySummary = `${qualitySealNarrative(params.product)} ${
    params.product.qualityNotes.length > 0
      ? `Additional product notes: ${params.product.qualityNotes.join(", ")}.`
      : ""
  }`

  const howToTake = ingredient
    ? `${ingredient.suggestedUse.timing}. ${
        ingredient.suggestedUse.withFood === true
          ? "Typically used with food."
          : ingredient.suggestedUse.withFood === false
          ? "Often not dependent on food."
          : "Food timing depends on the formulation."
      } ${ingredient.suggestedUse.generalDoseNote} ${ingredient.suggestedUse.durationNote}`
    : "Use according to the product label and individual professional guidance when needed."

  const restrictionsSummary =
    ingredient && ingredient.restrictions.length > 0
      ? `Relevant restrictions may include: ${ingredient.restrictions.join(
          ", "
        )}. ${
          params.cautions.length > 0
            ? `Additional caution context: ${params.cautions.join(" ")}`
            : ""
        }`
      : params.cautions.length > 0
      ? params.cautions.join(" ")
      : "No major restriction signal was programmatically highlighted beyond general label review and medication/context screening."

  const sideEffectsSummary =
    ingredient && ingredient.sideEffects.length > 0
      ? `Possible side effects may include: ${ingredient.sideEffects.join(", ")}.`
      : "Possible side effects depend on the ingredient and dose context; label review is still recommended."

  const budgetReason =
    params.product.budgetTier === "excellent"
      ? "This option enters the Excellent tier because it scores strongly on formulation confidence, brand quality context, and overall premium positioning."
      : params.product.budgetTier === "very_good"
      ? "This option enters the Muy buena tier because it balances quality and value in a practical way."
      : "This option enters the Buena tier because it keeps the ingredient accessible at a lower entry cost, even if the quality context is more basic."

  return {
    whyForUser,
    scienceSummary,
    labQualitySummary,
    howToTake,
    restrictionsSummary,
    sideEffectsSummary,
    budgetReason,
  };
}

export function buildFallbackAdvancedRecommendations(params: {
  dominantNeeds: string[];
  secondaryNeeds: string[];
  riskSignals: string[];
  mainGoal?: string;
}): string[] {
  const items: string[] = [];

  if (params.dominantNeeds.some((n) => n.toLowerCase().includes("sleep"))) {
    items.push(
      "Prioritize sleep consistency, sleep timing, and evening stimulus reduction before escalating supplement complexity."
    );
  }

  if (params.dominantNeeds.some((n) => n.toLowerCase().includes("stress"))) {
    items.push(
      "Use stress-reduction support as part of a broader strategy that includes routine, recovery capacity, and workload regulation."
    );
  }

  if (params.dominantNeeds.some((n) => n.toLowerCase().includes("metabolic"))) {
    items.push(
      "Metabolic support should emphasize daily movement, waist/weight tracking, and lab follow-up when available."
    );
  }

  if (params.mainGoal === "focus") {
    items.push(
      "For focus-related goals, it is useful to separate poor concentration caused by stress or sleep loss from true daytime cognitive performance issues."
    );
  }

  if (params.riskSignals.length > 0) {
    items.push(
      "Because preventive follow-up signals are present, any persistent symptoms or abnormal laboratory concerns deserve professional review."
    );
  }

  if (items.length === 0) {
    items.push(
      "Keep the current analysis as a preventive baseline and reassess after consistent changes in routine, sleep, activity, or nutrition."
    );
  }

  return items.slice(0, 4);
}
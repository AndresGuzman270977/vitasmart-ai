// app/lib/healthAnalysis/buildAiNarrativeContext.ts

import type {
  BiomarkerInput,
  HealthAnalysisSummaryBlock,
  MainGoal,
} from "./types";

export type AiNarrativeContext = {
  plan: "free" | "pro" | "premium";
  requestedAiMode: "basic" | "advanced";
  appliedAiMode: "basic" | "advanced";

  assessment: {
    age?: number;
    sex?: "male" | "female";
    weightKg?: number;
    heightCm?: number;
    waistCm?: number;
    stressLevel?: number;
    sleepHours?: number;
    sleepQuality?: number;
    fatigueLevel?: number;
    focusDifficulty?: number;
    physicalActivity?: number;
    alcoholUse?: number;
    smokingStatus?: string;
    sunExposure?: number;
    hydrationLevel?: number;
    ultraProcessedFoodLevel?: number;
    bloodPressureKnown?: boolean;
    systolicBp?: number;
    diastolicBp?: number;
    mainGoal?: MainGoal;
    baseConditions?: string[];
    currentMedications?: string[];
    currentSupplements?: string[];
  };

  biomarkers?: BiomarkerInput;

  scores: {
    healthScore: number;
    sleepScore: number | null;
    stressScore: number | null;
    energyScore: number | null;
    focusScore: number | null;
    metabolicScore: number | null;
  };

  confidence: {
    confidenceLevel: "high" | "moderate" | "limited";
    confidenceExplanation: string;
    completenessScore: number;
  };

  insights: {
    strengths: string[];
    mainDrivers: string[];
    priorityActions: string[];
    riskSignals: string[];
  };

  userNeeds: {
    dominantNeeds: string[];
    secondaryNeeds: string[];
  };

  fallbackSummaries: HealthAnalysisSummaryBlock;
  fallbackAdvancedRecommendations: string[];
  topIngredientNames: string[];
};

type BuildAiNarrativeContextInput = {
  planMeta: {
    plan: "free" | "pro" | "premium";
    requestedAiMode: "basic" | "advanced";
    appliedAiMode: "basic" | "advanced";
  };
  assessment: AiNarrativeContext["assessment"];
  biomarkers?: BiomarkerInput;
  scores: AiNarrativeContext["scores"];
  confidence: AiNarrativeContext["confidence"];
  insights: AiNarrativeContext["insights"];
  userNeeds: AiNarrativeContext["userNeeds"];
  fallbackSummaries: HealthAnalysisSummaryBlock;
  fallbackAdvancedRecommendations: string[];
  topIngredientNames: string[];
};

export function buildAiNarrativeContext(
  input: BuildAiNarrativeContextInput
): AiNarrativeContext {
  return {
    plan: input.planMeta.plan,
    requestedAiMode: input.planMeta.requestedAiMode,
    appliedAiMode: input.planMeta.appliedAiMode,

    assessment: input.assessment,
    biomarkers: input.biomarkers,

    scores: input.scores,
    confidence: input.confidence,
    insights: input.insights,
    userNeeds: input.userNeeds,

    fallbackSummaries: input.fallbackSummaries,
    fallbackAdvancedRecommendations: input.fallbackAdvancedRecommendations,
    topIngredientNames: input.topIngredientNames,
  };
}
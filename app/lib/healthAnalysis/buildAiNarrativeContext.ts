// app/lib/healthAnalysis/buildAiNarrativeContext.ts

import type {
  BiomarkerInput,
  HealthAnalysisSummaryBlock,
  MainGoal,
} from "./types";
import {
  detectUserProfileType,
  type UserProfileType,
} from "./detectUserProfileType";

export type AiNarrativeContext = {
  plan: "free" | "pro" | "premium";
  requestedAiMode: "basic" | "advanced";
  appliedAiMode: "basic" | "advanced";

  profileType: UserProfileType;

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

function cleanArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, max);
}

export function buildAiNarrativeContext(
  input: BuildAiNarrativeContextInput
): AiNarrativeContext {
  const profileType = detectUserProfileType({
    stressScore: input.scores.stressScore,
    sleepScore: input.scores.sleepScore,
    energyScore: input.scores.energyScore,
    healthScore: input.scores.healthScore,
    metabolicScore: input.scores.metabolicScore,
    physicalActivity: input.assessment.physicalActivity,
    sleepHours: input.assessment.sleepHours,
    stressLevel: input.assessment.stressLevel,
    fatigueLevel: input.assessment.fatigueLevel,
    focusDifficulty: input.assessment.focusDifficulty,
    ultraProcessedFoodLevel: input.assessment.ultraProcessedFoodLevel,
  });

  return {
    plan: input.planMeta.plan,
    requestedAiMode: input.planMeta.requestedAiMode,
    appliedAiMode: input.planMeta.appliedAiMode,

    profileType,

    assessment: {
      ...input.assessment,
      baseConditions: cleanArray(input.assessment.baseConditions, 20),
      currentMedications: cleanArray(input.assessment.currentMedications, 20),
      currentSupplements: cleanArray(input.assessment.currentSupplements, 20),
    },

    biomarkers: input.biomarkers,

    scores: input.scores,
    confidence: input.confidence,

    insights: {
      strengths: cleanArray(input.insights.strengths, 12),
      mainDrivers: cleanArray(input.insights.mainDrivers, 12),
      priorityActions: cleanArray(input.insights.priorityActions, 12),
      riskSignals: cleanArray(input.insights.riskSignals, 12),
    },

    userNeeds: {
      dominantNeeds: cleanArray(input.userNeeds.dominantNeeds, 8),
      secondaryNeeds: cleanArray(input.userNeeds.secondaryNeeds, 8),
    },

    fallbackSummaries: input.fallbackSummaries,
    fallbackAdvancedRecommendations: cleanArray(
      input.fallbackAdvancedRecommendations,
      8
    ),
    topIngredientNames: cleanArray(input.topIngredientNames, 8),
  };
}
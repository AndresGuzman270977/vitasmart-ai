// app/lib/healthAnalysis/types.ts

import { IngredientSafetyDecision } from "../recommendationEngine/recommendationTypes";
import { ProductCatalogItem } from "../catalog/catalogTypes";

export type UserPlan = "free" | "pro" | "premium";
export type RequestedAiMode = "basic" | "advanced";
export type AppliedAiMode = "basic" | "advanced";
export type ConfidenceLevel = "high" | "moderate" | "limited";

export type MainGoal =
  | "energy"
  | "focus"
  | "sleep"
  | "general_health"
  | "weight"
  | "recovery";

export type SmokingStatus =
  | "never"
  | "former"
  | "current"
  | "occasional"
  | "unknown";

export type AssessmentInput = {
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
  smokingStatus?: SmokingStatus;
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

export type BiomarkerInput = {
  fasting_glucose?: number;
  hba1c?: number;
  total_cholesterol?: number;
  hdl?: number;
  ldl?: number;
  triglycerides?: number;
  vitamin_d?: number;
  b12?: number;
  ferritin?: number;
  tsh?: number;
  creatinine?: number;
  ast?: number;
  alt?: number;
  lab_date?: string;
};

export type HealthAnalysisRequest = {
  plan?: UserPlan;
  requestedAiMode?: RequestedAiMode;
  assessment: AssessmentInput;
  biomarkers?: BiomarkerInput;
};

export type HealthAnalysisScoreBlock = {
  healthScore: number;
  sleepScore: number | null;
  stressScore: number | null;
  energyScore: number | null;
  focusScore: number | null;
  metabolicScore: number | null;
};

export type HealthAnalysisConfidenceBlock = {
  confidenceLevel: ConfidenceLevel;
  confidenceExplanation: string;
  completenessScore: number;
};

export type HealthAnalysisSummaryBlock = {
  executiveSummary: string;
  clinicalStyleSummary: string;
  scoreNarrative: string;
  professionalFollowUpAdvice: string;
};

export type HealthAnalysisInsightBlock = {
  strengths: string[];
  mainDrivers: string[];
  priorityActions: string[];
  riskSignals: string[];
};

export type ProductNarrativeOutput = {
  whyForUser: string;
  scienceSummary: string;
  labQualitySummary: string;
  howToTake: string;
  restrictionsSummary: string;
  sideEffectsSummary: string;
  budgetReason: string;
};

export type ProductRecommendationView = {
  product: ProductCatalogItem;
  narratives: ProductNarrativeOutput;
  fitScore: number;
  qualityScore: number;
  valueScore: number;
};

export type TopIngredientRecommendationView = {
  ingredientSlug: string;
  ingredientName: string;
  matchScore: number;
  safetyDecision: IngredientSafetyDecision;
  whyMatched: string[];
  cautions: string[];
  evidenceLevel?: "high" | "moderate" | "limited";
  evidenceSummary?: string;
  scientificContext?: string;
  options: {
    excellent?: ProductRecommendationView;
    veryGood?: ProductRecommendationView;
    good?: ProductRecommendationView;
  };
};

export type HealthAnalysisResponse = {
  plan: UserPlan;
  requestedAiMode: RequestedAiMode;
  appliedAiMode: AppliedAiMode;
  advancedAI: boolean;
  wasDowngraded: boolean;
  upgradeRequired: boolean;
  upgradeMessage: string | null;

  assessmentVersion: string;

  scores: HealthAnalysisScoreBlock;
  confidence: HealthAnalysisConfidenceBlock;

  summaries: HealthAnalysisSummaryBlock;
  insights: HealthAnalysisInsightBlock;

  userNeeds: {
    dominantNeeds: string[];
    secondaryNeeds: string[];
  };

  advancedRecommendations: string[];
  productRecommendations: TopIngredientRecommendationView[];
};
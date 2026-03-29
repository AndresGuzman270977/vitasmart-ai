// app/lib/catalog/catalogTypes.ts

export type IngredientCategory =
  | "energy"
  | "stress"
  | "sleep"
  | "focus"
  | "general"
  | "metabolic"
  | "recovery";

export type EvidenceLevel = "high" | "moderate" | "limited";

export type IngredientCatalogItem = {
  slug: string;
  name: string;
  aliases: string[];

  categories: IngredientCategory[];

  evidenceLevel: EvidenceLevel;
  evidenceSummary: string;
  scientificContext: string;

  commonUseCases: string[];
  possibleBenefits: string[];

  suggestedUse: {
    timing: string;
    withFood: boolean | null;
    generalDoseNote: string;
    durationNote: string;
  };

  quizSignalsThatIncreaseRelevance: string[];
  labSignalsThatIncreaseRelevance: string[];

  restrictions: string[];
  sideEffects: string[];
  interactions: string[];

  avoidIf: string[];
  cautionIf: string[];

  qualitySignals: string[];

  sourceBasis: {
    nihOds: boolean;
    fdaRelevant: boolean;
    uspRelevant: boolean;
    nsfRelevant: boolean;
  };
};

export type BudgetTier = "excellent" | "very_good" | "good";

export type QualitySeal =
  | "USP_VERIFIED"
  | "NSF_173"
  | "GMP"
  | "THIRD_PARTY_TESTED"
  | "NONE";

export type ProductCatalogItem = {
  slug: string;
  ingredientSlug: string;

  productName: string;
  brand: string;
  manufacturer: string;

  form: "capsule" | "tablet" | "softgel" | "powder" | "liquid" | "gummy";
  presentation: string;

  servings: number | null;
  priceUsd: number | null;
  priceLabel: string;
  estimatedCostPerDayUsd: number | null;

  budgetTier: BudgetTier;

  qualityScore: number;
  valueScore: number;

  qualitySeals: QualitySeal[];
  qualityNotes: string[];

  imageUrl: string;
  buyUrl: string;

  availableMarkets: ("amazon" | "iherb" | "direct")[];
};
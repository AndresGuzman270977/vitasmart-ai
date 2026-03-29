// app/lib/recommendationEngine/rankIngredients.ts

import { ingredientCatalog } from "../catalog/ingredientCatalog";
import { IngredientCatalogItem } from "../catalog/catalogTypes";
import { NormalizedProfile } from "../healthEngine/normalizeProfile";
import { NeedScores } from "../healthEngine/computeNeedScores";
import { evaluateIngredientSafety } from "./ingredientSafety";
import { RankedIngredient } from "./recommendationTypes";

type RankingContext = {
  profile: NormalizedProfile & {
    baseConditions?: string[];
    currentMedications?: string[];
    currentSupplements?: string[];
    biomarkers?: Record<string, number | string | undefined> | undefined;
  };
  needs: NeedScores;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildCategoryFit(
  ingredient: IngredientCatalogItem,
  needs: NeedScores
): number {
  let score = 0;

  for (const category of ingredient.categories) {
    if (category === "sleep") score += needs.sleepNeed * 0.5;
    if (category === "stress") score += needs.stressNeed * 0.5;
    if (category === "energy") score += needs.energyNeed * 0.5;
    if (category === "focus") score += needs.focusNeed * 0.5;
    if (category === "metabolic") score += needs.metabolicNeed * 0.5;
    if (category === "recovery") score += needs.recoveryNeed * 0.4;
    if (category === "general") score += needs.generalSupportNeed * 0.3;
  }

  return score;
}

function buildGoalFit(
  ingredient: IngredientCatalogItem,
  mainGoal?: string
): number {
  if (!mainGoal) return 0;

  if (mainGoal === "sleep" && ingredient.categories.includes("sleep")) return 18;
  if (mainGoal === "focus" && ingredient.categories.includes("focus")) return 18;
  if (mainGoal === "energy" && ingredient.categories.includes("energy")) return 18;
  if (mainGoal === "recovery" && ingredient.categories.includes("recovery")) return 18;
  if (mainGoal === "weight" && ingredient.categories.includes("metabolic")) return 18;
  if (mainGoal === "general_health" && ingredient.categories.includes("general")) return 14;

  return 0;
}

function buildSignalFit(
  ingredient: IngredientCatalogItem,
  profile: RankingContext["profile"]
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const signalMap: Record<string, boolean> = {
    low_sleep_quality: Boolean(
      (profile.sleepQuality ?? 0) > 0 && (profile.sleepQuality ?? 0) <= 2
    ),
    short_sleep_duration: Boolean(
      (profile.sleepHours ?? 0) > 0 && (profile.sleepHours ?? 0) < 6
    ),
    high_stress: Boolean((profile.stressLevel ?? 0) >= 4),
    fatigue: Boolean(
      profile.mainGoal === "energy" || profile.mainGoal === "recovery"
    ),
    low_physical_activity: Boolean((profile.activityLevel ?? 0) <= 2),
    low_sun_exposure: false,
    poor_diet: false,
    focus_difficulty: Boolean(profile.mainGoal === "focus"),
  };

  for (const signal of ingredient.quizSignalsThatIncreaseRelevance) {
    if (signalMap[signal]) {
      score += 10;
      reasons.push(`Relevant due to ${signal.replaceAll("_", " ")}.`);
    }
  }

  return { score, reasons };
}

function buildBiomarkerFit(
  ingredient: IngredientCatalogItem,
  biomarkers?: Record<string, number | string | undefined>
): { score: number; reasons: string[] } {
  if (!biomarkers) return { score: 0, reasons: [] };

  let score = 0;
  const reasons: string[] = [];

  for (const signal of ingredient.labSignalsThatIncreaseRelevance) {
    if (signal === "low_vitamin_d" && typeof biomarkers.vitamin_d === "number" && biomarkers.vitamin_d < 30) {
      score += 18;
      reasons.push("Relevant because vitamin D appears lower than optimal.");
    }

    if (
      signal === "high_triglycerides" &&
      typeof biomarkers.triglycerides === "number" &&
      biomarkers.triglycerides >= 150
    ) {
      score += 18;
      reasons.push("Relevant because triglycerides appear elevated.");
    }
  }

  return { score, reasons };
}

function evidenceBonus(ingredient: IngredientCatalogItem): number {
  if (ingredient.evidenceLevel === "high") return 10;
  if (ingredient.evidenceLevel === "moderate") return 6;
  return 2;
}

function safetyPenalty(decision: RankedIngredient["safetyDecision"]): number {
  if (decision === "avoid") return 100;
  if (decision === "high_caution") return 28;
  if (decision === "allow_with_caution") return 12;
  return 0;
}

export function rankIngredients(context: RankingContext): RankedIngredient[] {
  return ingredientCatalog
    .map((ingredient) => {
      const safety = evaluateIngredientSafety(ingredient, context.profile);
      const categoryFit = buildCategoryFit(ingredient, context.needs);
      const goalFit = buildGoalFit(ingredient, context.profile.mainGoal);
      const signalFit = buildSignalFit(ingredient, context.profile);
      const biomarkerFit = buildBiomarkerFit(ingredient, context.profile.biomarkers);

      const rawScore =
        categoryFit * 0.45 +
        goalFit +
        signalFit.score +
        biomarkerFit.score +
        evidenceBonus(ingredient) -
        safetyPenalty(safety.safetyDecision);

      const ingredientName = ingredient.name;
      const matchReasons = [
        ...signalFit.reasons,
        ...biomarkerFit.reasons,
      ];

      if (ingredient.categories.includes("sleep") && context.needs.sleepNeed >= 55) {
        matchReasons.push("Sleep-related need appears to be one of the main priorities.");
      }

      if (ingredient.categories.includes("stress") && context.needs.stressNeed >= 55) {
        matchReasons.push("Stress regulation appears highly relevant in the current profile.");
      }

      if (ingredient.categories.includes("energy") && context.needs.energyNeed >= 55) {
        matchReasons.push("Energy support appears relevant based on the current profile.");
      }

      if (ingredient.categories.includes("metabolic") && context.needs.metabolicNeed >= 55) {
        matchReasons.push("Metabolic support appears relevant based on the current profile.");
      }

      if (ingredient.categories.includes("focus") && context.needs.focusNeed >= 55) {
        matchReasons.push("Focus support appears relevant for the stated goal and profile.");
      }

      return {
        ingredientSlug: ingredient.slug,
        ingredientName,
        matchScore: clampScore(rawScore),
        safetyDecision: safety.safetyDecision,
        matchReasons: Array.from(new Set(matchReasons)).slice(0, 4),
        cautionReasons: safety.cautionReasons,
        rejectedReasons: safety.rejectedReasons,
      } satisfies RankedIngredient;
    })
    .filter((item) => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}
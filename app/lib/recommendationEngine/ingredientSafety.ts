// app/lib/recommendationEngine/ingredientSafety.ts

import { IngredientCatalogItem } from "../catalog/catalogTypes";
import { NormalizedProfile } from "../healthEngine/normalizeProfile";
import { IngredientSafetyDecision } from "./recommendationTypes";

export type IngredientSafetyResult = {
  safetyDecision: IngredientSafetyDecision;
  cautionReasons: string[];
  rejectedReasons: string[];
};

function normalizeTextArray(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => String(v).trim().toLowerCase())
    .filter(Boolean);
}

function hasKeywordMatch(haystack: string[], keywords: string[]): boolean {
  return keywords.some((keyword) =>
    haystack.some((value) => value.includes(keyword) || keyword.includes(value))
  );
}

export function evaluateIngredientSafety(
  ingredient: IngredientCatalogItem,
  profile: NormalizedProfile & {
    baseConditions?: string[];
    currentMedications?: string[];
    currentSupplements?: string[];
  }
): IngredientSafetyResult {
  const conditionList = normalizeTextArray(profile.baseConditions);
  const medicationList = normalizeTextArray(profile.currentMedications);
  const supplementList = normalizeTextArray(profile.currentSupplements);

  const cautionReasons: string[] = [];
  const rejectedReasons: string[] = [];

  const avoidKeywords = normalizeTextArray(ingredient.avoidIf);
  const cautionKeywords = normalizeTextArray(ingredient.cautionIf);
  const interactionKeywords = normalizeTextArray(ingredient.interactions);
  const restrictionKeywords = normalizeTextArray(ingredient.restrictions);

  if (hasKeywordMatch(conditionList, avoidKeywords)) {
    rejectedReasons.push(
      `This ingredient may not be appropriate given the reported health context: ${ingredient.avoidIf.join(
        ", "
      )}.`
    );
  }

  if (hasKeywordMatch(conditionList, cautionKeywords)) {
    cautionReasons.push(
      `Extra caution may be appropriate due to reported conditions: ${ingredient.cautionIf.join(
        ", "
      )}.`
    );
  }

  if (hasKeywordMatch(conditionList, restrictionKeywords)) {
    cautionReasons.push(
      `This ingredient has usage restrictions relevant to the reported profile: ${ingredient.restrictions.join(
        ", "
      )}.`
    );
  }

  if (hasKeywordMatch(medicationList, interactionKeywords)) {
    cautionReasons.push(
      `Potential medication interaction context detected: ${ingredient.interactions.join(
        ", "
      )}.`
    );
  }

  if (
    ingredient.slug === "melatonin" &&
    supplementList.some((s) => s.includes("melatonin"))
  ) {
    cautionReasons.push(
      "The user already reports taking melatonin, so duplicate use should be reviewed."
    );
  }

  if (
    ingredient.slug === "vitamin-d" &&
    supplementList.some((s) => s.includes("vitamin d") || s.includes("vitamin-d"))
  ) {
    cautionReasons.push(
      "The user already reports taking vitamin D, so total intake should be reviewed."
    );
  }

  if (rejectedReasons.length > 0) {
    return {
      safetyDecision: "avoid",
      cautionReasons,
      rejectedReasons,
    };
  }

  if (cautionReasons.length >= 2) {
    return {
      safetyDecision: "high_caution",
      cautionReasons,
      rejectedReasons,
    };
  }

  if (cautionReasons.length === 1) {
    return {
      safetyDecision: "allow_with_caution",
      cautionReasons,
      rejectedReasons,
    };
  }

  return {
    safetyDecision: "allow",
    cautionReasons,
    rejectedReasons,
  };
}
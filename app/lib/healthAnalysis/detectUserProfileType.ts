// app/lib/healthAnalysis/detectUserProfileType.ts

export type UserProfileType =
  | "disciplined"
  | "overloaded"
  | "inconsistent"
  | "reactive";

export function detectUserProfileType(params: {
  stressScore?: number | null;
  sleepScore?: number | null;
  energyScore?: number | null;
  healthScore?: number | null;
  metabolicScore?: number | null;
  physicalActivity?: number;
  sleepHours?: number;
  stressLevel?: number;
  fatigueLevel?: number;
  focusDifficulty?: number;
  ultraProcessedFoodLevel?: number;
}): UserProfileType {
  const {
    stressScore,
    sleepScore,
    energyScore,
    healthScore,
    metabolicScore,
    physicalActivity,
    sleepHours,
    stressLevel,
    fatigueLevel,
    focusDifficulty,
    ultraProcessedFoodLevel,
  } = params;

  if (
    (healthScore ?? 0) >= 75 &&
    (sleepScore ?? 0) >= 70 &&
    (stressScore ?? 100) <= 45 &&
    (physicalActivity ?? 0) >= 4
  ) {
    return "disciplined";
  }

  if (
    (stressScore ?? 0) >= 65 ||
    (stressLevel ?? 0) >= 4 ||
    ((energyScore ?? 100) <= 50 && (fatigueLevel ?? 0) >= 4)
  ) {
    return "overloaded";
  }

  if (
    (physicalActivity ?? 0) <= 2 ||
    (sleepHours ?? 8) < 6 ||
    (sleepScore ?? 100) < 55 ||
    (ultraProcessedFoodLevel ?? 0) >= 4
  ) {
    return "inconsistent";
  }

  if (
    (metabolicScore ?? 100) < 60 ||
    (focusDifficulty ?? 0) >= 4 ||
    (healthScore ?? 100) < 65
  ) {
    return "reactive";
  }

  return "reactive";
}
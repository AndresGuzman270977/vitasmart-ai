// app/lib/healthEngine/normalizeProfile.ts

export type NormalizedProfile = {
  age?: number;
  sex?: "male" | "female";

  bmi?: number;
  waistCm?: number;

  sleepQuality?: number;
  sleepHours?: number;
  stressLevel?: number;
  fatigueLevel?: number;
  focusDifficulty?: number;

  activityLevel?: number;
  alcoholUse?: number;
  smokingStatus?: string;
  sunExposure?: number;
  hydrationLevel?: number;
  ultraProcessedFoodLevel?: number;

  systolicBp?: number;
  diastolicBp?: number;

  hasBiomarkers: boolean;

  mainGoal?: string;

  flags: {
    poorSleep: boolean;
    highStress: boolean;
    lowActivity: boolean;
    metabolicRisk: boolean;
    possibleHighBp: boolean;
    highFatigue: boolean;
    focusStrain: boolean;
    lowSunExposure: boolean;
    poorDietPattern: boolean;
  };
};

export function normalizeProfile(input: any): NormalizedProfile {
  const bmi =
    input.weightKg && input.heightCm
      ? input.weightKg / Math.pow(input.heightCm / 100, 2)
      : undefined;

  const poorSleep =
    ((input.sleepQuality ?? 0) > 0 && (input.sleepQuality ?? 0) <= 2) ||
    ((input.sleepHours ?? 0) > 0 && (input.sleepHours ?? 0) < 6);

  const highStress = (input.stressLevel ?? 0) >= 4;
  const lowActivity = (input.physicalActivity ?? 0) <= 2;

  const metabolicRisk =
    (bmi !== undefined && bmi >= 27) ||
    ((input.waistCm ?? 0) > 0 && (input.waistCm ?? 0) >= 94);

  const possibleHighBp =
    (input.systolicBp ?? 0) >= 130 || (input.diastolicBp ?? 0) >= 85;

  const highFatigue = (input.fatigueLevel ?? 0) >= 4;
  const focusStrain = (input.focusDifficulty ?? 0) >= 4;
  const lowSunExposure = (input.sunExposure ?? 0) > 0 && (input.sunExposure ?? 0) <= 2;
  const poorDietPattern =
    (input.ultraProcessedFoodLevel ?? 0) >= 4 || (input.hydrationLevel ?? 5) <= 2;

  return {
    age: input.age,
    sex: input.sex,
    bmi,
    waistCm: input.waistCm,
    sleepQuality: input.sleepQuality,
    sleepHours: input.sleepHours,
    stressLevel: input.stressLevel,
    fatigueLevel: input.fatigueLevel,
    focusDifficulty: input.focusDifficulty,
    activityLevel: input.physicalActivity,
    alcoholUse: input.alcoholUse,
    smokingStatus: input.smokingStatus,
    sunExposure: input.sunExposure,
    hydrationLevel: input.hydrationLevel,
    ultraProcessedFoodLevel: input.ultraProcessedFoodLevel,
    systolicBp: input.systolicBp,
    diastolicBp: input.diastolicBp,
    hasBiomarkers: Boolean(input.biomarkers),
    mainGoal: input.mainGoal,
    flags: {
      poorSleep,
      highStress,
      lowActivity,
      metabolicRisk,
      possibleHighBp,
      highFatigue,
      focusStrain,
      lowSunExposure,
      poorDietPattern,
    },
  };
}
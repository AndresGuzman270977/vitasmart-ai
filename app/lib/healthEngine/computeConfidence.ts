// app/lib/healthEngine/computeConfidence.ts

import { NormalizedProfile } from "./normalizeProfile";

export function computeConfidence(profile: NormalizedProfile) {
  let score = 0;

  if (profile.age) score += 8;
  if (profile.sex) score += 6;
  if (profile.bmi) score += 16;
  if (profile.waistCm) score += 8;

  if (profile.sleepHours) score += 10;
  if (profile.sleepQuality) score += 10;
  if (profile.stressLevel) score += 10;
  if (profile.fatigueLevel) score += 6;
  if (profile.focusDifficulty) score += 6;

  if (profile.activityLevel) score += 8;
  if (profile.sunExposure) score += 4;
  if (profile.hydrationLevel) score += 4;

  if (profile.systolicBp || profile.diastolicBp) score += 6;
  if (profile.hasBiomarkers) score += 18;

  let confidenceLevel: "high" | "moderate" | "limited" = "limited";

  if (score >= 70) confidenceLevel = "high";
  else if (score >= 40) confidenceLevel = "moderate";

  const confidenceExplanation =
    confidenceLevel === "high"
      ? "The interpretation is supported by a relatively complete set of body, lifestyle, and health-context inputs."
      : confidenceLevel === "moderate"
      ? "The interpretation is based on partial but still useful inputs. More complete body, lifestyle, or lab data could improve precision."
      : "The interpretation is limited because several key fields are missing. This still offers directional guidance, but not a deep preventive picture.";

  return {
    confidenceLevel,
    confidenceExplanation,
    completenessScore: score,
  };
}
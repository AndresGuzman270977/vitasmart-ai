// app/lib/healthEngine/computeNeedScores.ts

import { NormalizedProfile } from "./normalizeProfile";

export type NeedScores = {
  sleepNeed: number;
  stressNeed: number;
  energyNeed: number;
  focusNeed: number;
  metabolicNeed: number;
  recoveryNeed: number;
  generalSupportNeed: number;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeNeedScores(profile: NormalizedProfile): NeedScores {
  let sleepNeed = 0;
  let stressNeed = 0;
  let energyNeed = 0;
  let focusNeed = 0;
  let metabolicNeed = 0;
  let recoveryNeed = 0;
  let generalSupportNeed = 10;

  if (profile.flags.poorSleep) sleepNeed += 55;
  if ((profile.sleepHours ?? 0) > 0 && (profile.sleepHours ?? 0) < 6) sleepNeed += 20;
  if ((profile.sleepQuality ?? 0) > 0 && (profile.sleepQuality ?? 0) <= 2) sleepNeed += 20;

  if (profile.flags.highStress) stressNeed += 55;
  if ((profile.stressLevel ?? 0) === 5) stressNeed += 20;

  if (profile.flags.highFatigue) energyNeed += 45;
  if (profile.flags.lowActivity) energyNeed += 20;
  if (profile.flags.poorSleep) energyNeed += 15;

  if (profile.flags.focusStrain) focusNeed += 45;
  if (profile.flags.highStress) focusNeed += 15;
  if (profile.flags.poorSleep) focusNeed += 10;

  if (profile.flags.metabolicRisk) metabolicNeed += 45;
  if (profile.flags.possibleHighBp) metabolicNeed += 18;
  if (profile.flags.lowActivity) metabolicNeed += 12;
  if (profile.flags.poorDietPattern) metabolicNeed += 15;

  if (profile.flags.highFatigue || profile.flags.poorSleep || profile.flags.lowActivity) {
    recoveryNeed += 35;
  }

  if (profile.flags.lowSunExposure) generalSupportNeed += 15;
  if (profile.flags.poorDietPattern) generalSupportNeed += 10;

  if (profile.mainGoal === "sleep") sleepNeed += 25;
  if (profile.mainGoal === "energy") energyNeed += 25;
  if (profile.mainGoal === "focus") focusNeed += 25;
  if (profile.mainGoal === "weight") metabolicNeed += 25;
  if (profile.mainGoal === "recovery") recoveryNeed += 20;
  if (profile.mainGoal === "general_health") generalSupportNeed += 10;

  return {
    sleepNeed: clamp(sleepNeed),
    stressNeed: clamp(stressNeed),
    energyNeed: clamp(energyNeed),
    focusNeed: clamp(focusNeed),
    metabolicNeed: clamp(metabolicNeed),
    recoveryNeed: clamp(recoveryNeed),
    generalSupportNeed: clamp(generalSupportNeed),
  };
}
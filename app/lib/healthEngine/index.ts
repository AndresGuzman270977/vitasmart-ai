// app/lib/healthEngine/index.ts

import { normalizeProfile } from "./normalizeProfile";
import { computeNeedScores } from "./computeNeedScores";
import { computeSubscores } from "./computeSubscores";
import { computeHealthScore } from "./computeHealthScore";
import { computeConfidence } from "./computeConfidence";
import { buildDrivers } from "./buildDrivers";
import { buildPriorities } from "./buildPriorities";
import { buildRiskSignals } from "./buildRiskSignals";

export function runHealthEngine(input: any) {
  const profile = normalizeProfile(input);

  const needs = computeNeedScores(profile);

  const subscores = computeSubscores(needs);

  const healthScore = computeHealthScore(subscores);

  const confidence = computeConfidence(profile);

  const drivers = buildDrivers(needs);

  const priorities = buildPriorities(needs);

  const risks = buildRiskSignals(profile);

  return {
    normalizedProfile: profile,
    needScores: needs,
    subscores,
    healthScore,
    confidence,
    strengths: buildStrengths(subscores),
    mainDrivers: drivers,
    priorityActions: priorities,
    riskSignals: risks,
    dominantNeeds: extractDominantNeeds(needs),
    secondaryNeeds: extractSecondaryNeeds(needs),
  };
}

function buildStrengths(sub: any): string[] {
  const strengths: string[] = [];

  if ((sub.sleepScore ?? 0) > 75)
    strengths.push("Good sleep indicators");

  if ((sub.metabolicScore ?? 0) > 75)
    strengths.push("Healthy metabolic profile");

  return strengths;
}

function extractDominantNeeds(needs: any): string[] {
  return Object.entries(needs)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 2)
    .map((i: any) => i[0]);
}

function extractSecondaryNeeds(needs: any): string[] {
  return Object.entries(needs)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(2, 4)
    .map((i: any) => i[0]);
}
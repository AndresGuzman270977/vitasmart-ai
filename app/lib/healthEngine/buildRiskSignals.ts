// app/lib/healthEngine/buildRiskSignals.ts

import { NormalizedProfile } from "./normalizeProfile";

export function buildRiskSignals(profile: NormalizedProfile): string[] {
  const risks: string[] = [];

  if (profile.flags.metabolicRisk)
    risks.push("Elevated BMI may require follow-up");

  if (profile.flags.poorSleep)
    risks.push("Persistent poor sleep patterns");

  if (profile.flags.highStress)
    risks.push("Chronic stress indicators");

  return risks;
}
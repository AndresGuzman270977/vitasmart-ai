// app/lib/healthEngine/buildDrivers.ts

import { NeedScores } from "./computeNeedScores";

export function buildDrivers(needs: NeedScores): string[] {
  const drivers: string[] = [];

  if (needs.sleepNeed > 60)
    drivers.push("Suboptimal sleep patterns");

  if (needs.stressNeed > 60)
    drivers.push("Elevated stress load");

  if (needs.metabolicNeed > 60)
    drivers.push("Metabolic risk signals");

  if (needs.energyNeed > 60)
    drivers.push("Low energy indicators");

  return drivers.slice(0, 3);
}
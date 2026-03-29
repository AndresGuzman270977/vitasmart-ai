// app/lib/healthEngine/buildPriorities.ts

import { NeedScores } from "./computeNeedScores";

export function buildPriorities(needs: NeedScores): string[] {
  const items = [
    { key: "sleep", value: needs.sleepNeed },
    { key: "stress", value: needs.stressNeed },
    { key: "metabolic", value: needs.metabolicNeed },
    { key: "energy", value: needs.energyNeed },
  ];

  return items
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((i) => `Improve ${i.key}`);
}
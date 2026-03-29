// app/lib/healthEngine/computeSubscores.ts

import { NeedScores } from "./computeNeedScores";

export type Subscores = {
  sleepScore: number | null;
  stressScore: number | null;
  energyScore: number | null;
  focusScore: number | null;
  metabolicScore: number | null;
};

export function computeSubscores(needs: NeedScores): Subscores {
  return {
    sleepScore: 100 - needs.sleepNeed,
    stressScore: 100 - needs.stressNeed,
    energyScore: 100 - needs.energyNeed,
    focusScore: 100 - needs.focusNeed,
    metabolicScore: 100 - needs.metabolicNeed,
  };
}
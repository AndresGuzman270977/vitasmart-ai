// app/lib/healthEngine/computeHealthScore.ts

import { Subscores } from "./computeSubscores";

export function computeHealthScore(sub: Subscores): number {
  const weights = {
    sleep: 0.22,
    stress: 0.18,
    energy: 0.2,
    focus: 0.15,
    metabolic: 0.25,
  };

  const values: number[] = [];

  if (sub.sleepScore != null) values.push(sub.sleepScore * weights.sleep);
  if (sub.stressScore != null) values.push(sub.stressScore * weights.stress);
  if (sub.energyScore != null) values.push(sub.energyScore * weights.energy);
  if (sub.focusScore != null) values.push(sub.focusScore * weights.focus);
  if (sub.metabolicScore != null)
    values.push(sub.metabolicScore * weights.metabolic);

  const total = values.reduce((a, b) => a + b, 0);

  return Math.round(total);
}
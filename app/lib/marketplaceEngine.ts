import type { MarketplaceMode } from "./planLimits";
import { SUPPLEMENTS, type SupplementGoal, type SupplementProduct } from "./marketplaceData";

export type HealthAssessmentLite = {
  id?: number | string;
  created_at?: string;
  age?: string | number | null;
  sex?: string | null;
  stress?: string | null;
  sleep?: string | null;
  goal?: string | null;
  score?: number | null;
  summary?: string | null;
  factors?: string[] | null;
};

export type RankedProduct = SupplementProduct & {
  scoreValue: number;
  reasons: string[];
};

export type BundleRecommendation = {
  id: string;
  title: string;
  description: string;
  items: RankedProduct[];
};

function normalizeGoal(goal?: string | null): SupplementGoal | null {
  if (!goal) return null;

  const value = goal.toLowerCase().trim();

  if (value.includes("sleep")) return "better_sleep";
  if (value.includes("stress")) return "stress_support";
  if (value.includes("focus")) return "mental_focus";
  if (value.includes("energy")) return "more_energy";
  if (value.includes("sport")) return "sports_performance";
  if (value.includes("performance")) return "sports_performance";
  if (value.includes("wellness")) return "general_wellness";

  return "general_wellness";
}

function normalizeSleep(sleep?: string | null): string {
  return (sleep || "").toLowerCase().trim();
}

function normalizeStress(stress?: string | null): string {
  return (stress || "").toLowerCase().trim();
}

function scoreProduct(
  product: SupplementProduct,
  assessment: HealthAssessmentLite | null,
  mode: MarketplaceMode
): RankedProduct {
  let scoreValue = product.featured ? 12 : 0;
  scoreValue += product.rating * 10;

  const reasons: string[] = [];

  if (!assessment) {
    if (product.featured) reasons.push("Producto destacado del catálogo");
    reasons.push("Buena valoración general");
    return {
      ...product,
      scoreValue,
      reasons,
    };
  }

  const goal = normalizeGoal(assessment.goal);
  const stress = normalizeStress(assessment.stress);
  const sleep = normalizeSleep(assessment.sleep);

  if (goal && product.goals.includes(goal)) {
    scoreValue += 45;
    reasons.push("Coincide con tu objetivo principal");
  }

  if (stress.includes("high") || stress.includes("alto") || stress.includes("severe")) {
    if (product.goals.includes("stress_support")) {
      scoreValue += 25;
      reasons.push("Puede apoyar rutinas orientadas al manejo del estrés");
    }
  }

  if (sleep.includes("poor") || sleep.includes("malo") || sleep.includes("bad") || sleep.includes("low")) {
    if (product.goals.includes("better_sleep")) {
      scoreValue += 25;
      reasons.push("Relacionado con apoyo a descanso y recuperación");
    }
  }

  if (
    goal === "mental_focus" &&
    (product.goals.includes("mental_focus") || product.category === "focus")
  ) {
    scoreValue += 20;
    reasons.push("Alineado con enfoque y claridad mental");
  }

  if (
    goal === "more_energy" &&
    (product.goals.includes("more_energy") || product.category === "energy")
  ) {
    scoreValue += 20;
    reasons.push("Alineado con energía y vitalidad");
  }

  if (
    goal === "sports_performance" &&
    (product.goals.includes("sports_performance") || product.category === "performance")
  ) {
    scoreValue += 25;
    reasons.push("Alineado con rendimiento físico");
  }

  if (mode === "premium") {
    scoreValue += 8;
    if (product.tags.includes("daily")) {
      scoreValue += 5;
      reasons.push("Útil como base de bienestar diario");
    }
  }

  if (reasons.length === 0) {
    reasons.push("Selección basada en valoración general del catálogo");
  }

  return {
    ...product,
    scoreValue,
    reasons,
  };
}

export function getMarketplaceRecommendations(
  assessment: HealthAssessmentLite | null,
  mode: MarketplaceMode
): RankedProduct[] {
  const ranked = SUPPLEMENTS.map((product) => scoreProduct(product, assessment, mode));
  ranked.sort((a, b) => b.scoreValue - a.scoreValue);
  return ranked;
}

export function getBasicMarketplaceProducts(): SupplementProduct[] {
  return [...SUPPLEMENTS].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return b.rating - a.rating;
  });
}

export function getPremiumBundles(
  rankedProducts: RankedProduct[],
  assessment: HealthAssessmentLite | null
): BundleRecommendation[] {
  const goal = normalizeGoal(assessment?.goal);

  const top = rankedProducts.slice(0, 6);

  const sleepStack = top.filter(
    (item) => item.goals.includes("better_sleep") || item.goals.includes("stress_support")
  );

  const focusStack = top.filter(
    (item) => item.goals.includes("mental_focus") || item.goals.includes("more_energy")
  );

  const wellnessStack = top.filter(
    (item) => item.goals.includes("general_wellness") || item.category === "immunity"
  );

  const bundles: BundleRecommendation[] = [];

  if (goal === "better_sleep" || sleepStack.length >= 2) {
    bundles.push({
      id: "sleep-bundle",
      title: "Sleep Recovery Stack",
      description: "Combinación sugerida para descanso, calma y recuperación.",
      items: sleepStack.slice(0, 3),
    });
  }

  if (goal === "mental_focus" || goal === "more_energy" || focusStack.length >= 2) {
    bundles.push({
      id: "focus-bundle",
      title: "Focus & Energy Stack",
      description: "Selección orientada a claridad mental y energía funcional.",
      items: focusStack.slice(0, 3),
    });
  }

  if (wellnessStack.length >= 2) {
    bundles.push({
      id: "wellness-bundle",
      title: "Daily Wellness Stack",
      description: "Base de bienestar general para uso diario y soporte integral.",
      items: wellnessStack.slice(0, 3),
    });
  }

  return bundles.filter((bundle) => bundle.items.length > 0).slice(0, 3);
}
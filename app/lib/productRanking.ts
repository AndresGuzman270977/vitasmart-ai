import { PRODUCTS, type Product, type ProductCategory } from "./products";

export type AssessmentProfile = {
  age: string;
  sex: string;
  stress: string;
  sleep: string;
  goal: string;
};

export type RankedProduct = Product & {
  rankScore: number;
  reasons: string[];
};

/**
 * LEGACY PRODUCT RANKING
 *
 * Este archivo se conserva como capa de compatibilidad para flujos antiguos.
 * La nueva arquitectura premium debe depender principalmente de:
 *
 * - app/lib/healthEngine/*
 * - app/lib/recommendationEngine/*
 * - app/lib/catalog/*
 * - app/api/health-analysis/route.ts
 *
 * Mientras la migración total termina, esta utilidad sigue funcionando
 * como ranking legacy coherente para recomendaciones básicas.
 */

export function rankProductsForAssessment(
  profile: AssessmentProfile
): RankedProduct[] {
  const normalized = normalizeProfile(profile);

  const ranked = PRODUCTS.map((product) => {
    let rankScore = 0;
    const reasons: string[] = [];

    applyGoalRules(product, normalized, reasons, (value) => {
      rankScore += value;
    });

    applyStressRules(product, normalized, reasons, (value) => {
      rankScore += value;
    });

    applySleepRules(product, normalized, reasons, (value) => {
      rankScore += value;
    });

    applyAgeSexRules(product, normalized, reasons, (value) => {
      rankScore += value;
    });

    applyIngredientAffinityRules(product, normalized, reasons, (value) => {
      rankScore += value;
    });

    rankScore += getPriorityBaseScore(product.priority);

    return {
      ...product,
      rankScore,
      reasons: uniqueReasons(reasons).slice(0, 3),
    };
  });

  return ranked.sort((a, b) => {
    if (b.rankScore !== a.rankScore) {
      return b.rankScore - a.rankScore;
    }

    const priorityRank: Record<Product["priority"], number> = {
      high: 1,
      medium: 2,
      low: 3,
    };

    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }

    return a.productName.localeCompare(b.productName);
  });
}

type NormalizedAssessmentProfile = {
  age: number;
  sex: string;
  stress: string;
  sleep: string;
  goal: string;
};

function normalizeProfile(
  profile: AssessmentProfile
): NormalizedAssessmentProfile {
  return {
    age: Number(profile.age || 0),
    sex: String(profile.sex || "").trim().toLowerCase(),
    stress: String(profile.stress || "").trim().toLowerCase(),
    sleep: String(profile.sleep || "").trim(),
    goal: normalizeGoal(String(profile.goal || "").trim().toLowerCase()),
  };
}

function normalizeGoal(goal: string): string {
  if (goal === "general_health") return "health";
  if (goal === "weight") return "health";
  if (goal === "recovery") return "energy";
  return goal;
}

function applyGoalRules(
  product: Product,
  profile: NormalizedAssessmentProfile,
  reasons: string[],
  addScore: (value: number) => void
) {
  const goal = profile.goal;

  if (goal === "energy" && product.category === "energy") {
    addScore(42);
    reasons.push("alineado con tu objetivo principal de energía");
  }

  if (goal === "focus" && product.category === "focus") {
    addScore(42);
    reasons.push("alineado con tu objetivo principal de concentración");
  }

  if (goal === "sleep" && product.category === "sleep") {
    addScore(42);
    reasons.push("alineado con tu objetivo principal de descanso");
  }

  if (goal === "health" && product.category === "general") {
    addScore(38);
    reasons.push("alineado con tu objetivo de salud general");
  }

  if (goal === "focus" && product.category === "energy") {
    addScore(12);
    reasons.push("puede complementar energía mental y claridad diaria");
  }

  if (goal === "energy" && product.category === "general") {
    addScore(10);
    reasons.push("puede reforzar tu base general de bienestar");
  }

  if (goal === "sleep" && product.category === "stress") {
    addScore(12);
    reasons.push("puede ser relevante cuando el descanso se ve afectado por tensión");
  }

  if (goal === "health" && product.category === "focus") {
    addScore(8);
    reasons.push("puede aportar apoyo complementario dentro de una estrategia integral");
  }

  if (goal === "health" && product.category === "sleep") {
    addScore(8);
    reasons.push("el descanso suele ser una palanca importante para tu bienestar general");
  }
}

function applyStressRules(
  product: Product,
  profile: NormalizedAssessmentProfile,
  reasons: string[],
  addScore: (value: number) => void
) {
  const stress = profile.stress;
  const goal = profile.goal;

  if (stress === "high" && product.category === "stress") {
    addScore(34);
    reasons.push("encaja mejor con perfiles de estrés alto");
  }

  if (stress === "medium" && product.category === "stress") {
    addScore(18);
    reasons.push("puede aportar apoyo útil con estrés moderado");
  }

  if (stress === "high" && product.category === "sleep") {
    addScore(10);
    reasons.push("el estrés alto puede afectar recuperación y descanso");
  }

  if (stress === "high" && goal === "focus" && product.category === "focus") {
    addScore(8);
    reasons.push("puede tener más sentido cuando el enfoque también sufre por carga mental");
  }
}

function applySleepRules(
  product: Product,
  profile: NormalizedAssessmentProfile,
  reasons: string[],
  addScore: (value: number) => void
) {
  const sleep = profile.sleep;
  const goal = profile.goal;

  if ((sleep === "5" || sleep === "6") && product.category === "sleep") {
    addScore(34);
    reasons.push("gana prioridad cuando el descanso actual es insuficiente");
  }

  if (sleep === "5" && product.category === "general") {
    addScore(6);
    reasons.push("puede acompañar una estrategia general cuando hay fatiga acumulada");
  }

  if (
    (sleep === "5" || sleep === "6") &&
    goal === "energy" &&
    product.category === "energy"
  ) {
    addScore(8);
    reasons.push("puede ser relevante cuando la energía también está limitada por poco descanso");
  }
}

function applyAgeSexRules(
  product: Product,
  profile: NormalizedAssessmentProfile,
  reasons: string[],
  addScore: (value: number) => void
) {
  const age = profile.age;
  const sex = profile.sex;

  if (
    age >= 40 &&
    sex === "male" &&
    product.supplementName === "Multivitamínico para hombre 40+"
  ) {
    addScore(26);
    reasons.push("especialmente alineado con perfiles masculinos mayores de 40");
  }

  if (
    age >= 40 &&
    sex === "female" &&
    product.supplementName === "Multivitamínico de soporte general"
  ) {
    addScore(20);
    reasons.push("puede ser una base útil en perfiles adultos que buscan soporte general");
  }

  if (age >= 40 && product.category === "general") {
    addScore(6);
    reasons.push("la base general de soporte suele ganar importancia con la edad");
  }
}

function applyIngredientAffinityRules(
  product: Product,
  profile: NormalizedAssessmentProfile,
  reasons: string[],
  addScore: (value: number) => void
) {
  const goal = profile.goal;
  const stress = profile.stress;
  const sleep = profile.sleep;

  if (goal === "sleep" && product.supplementName === "Magnesio glicinato") {
    addScore(10);
    reasons.push("es una referencia frecuente cuando la prioridad es descanso nocturno");
  }

  if (stress === "high" && product.supplementName === "Ashwagandha") {
    addScore(10);
    reasons.push("suele considerarse cuando la carga mental es una señal dominante");
  }

  if (goal === "focus" && product.supplementName === "Omega-3") {
    addScore(10);
    reasons.push("suele aparecer como referencia relevante para soporte cognitivo");
  }

  if (goal === "energy" && product.supplementName === "CoQ10") {
    addScore(10);
    reasons.push("suele tener alta afinidad con búsquedas orientadas a energía");
  }

  if (sleep === "5" && product.supplementName === "Melatonina de apoyo ocasional") {
    addScore(8);
    reasons.push("puede resultar especialmente coherente cuando el descanso actual es muy corto");
  }
}

function getPriorityBaseScore(priority: Product["priority"]): number {
  if (priority === "high") return 15;
  if (priority === "medium") return 8;
  return 3;
}

function uniqueReasons(reasons: string[]) {
  return Array.from(new Set(reasons.map((item) => item.trim()).filter(Boolean)));
}

export function getTopRankedProducts(
  profile: AssessmentProfile,
  limit = 5
): RankedProduct[] {
  return rankProductsForAssessment(profile).slice(0, limit);
}

export function getRankedProductsByCategory(
  profile: AssessmentProfile,
  category: ProductCategory
): RankedProduct[] {
  return rankProductsForAssessment(profile).filter(
    (product) => product.category === category
  );
}
import { PRODUCTS, type Product } from "./products";

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

export function rankProductsForAssessment(
  profile: AssessmentProfile
): RankedProduct[] {
  const age = Number(profile.age || 0);
  const sex = String(profile.sex || "").trim();
  const stress = String(profile.stress || "").trim();
  const sleep = String(profile.sleep || "").trim();
  const goal = String(profile.goal || "").trim();

  const ranked = PRODUCTS.map((product) => {
    let rankScore = 0;
    const reasons: string[] = [];

    if (goal === "energy" && product.category === "energy") {
      rankScore += 42;
      reasons.push("alineado con tu objetivo principal de energía");
    }

    if (goal === "focus" && product.category === "focus") {
      rankScore += 42;
      reasons.push("alineado con tu objetivo principal de concentración");
    }

    if (goal === "sleep" && product.category === "sleep") {
      rankScore += 42;
      reasons.push("alineado con tu objetivo principal de descanso");
    }

    if (goal === "health" && product.category === "general") {
      rankScore += 38;
      reasons.push("alineado con tu objetivo de salud general");
    }

    if (goal === "focus" && product.category === "energy") {
      rankScore += 12;
      reasons.push("puede complementar energía mental y claridad diaria");
    }

    if (goal === "energy" && product.category === "general") {
      rankScore += 10;
      reasons.push("puede reforzar tu base general de bienestar");
    }

    if (goal === "sleep" && product.category === "stress") {
      rankScore += 12;
      reasons.push("puede ser relevante cuando el descanso se ve afectado por tensión");
    }

    if (goal === "health" && product.category === "focus") {
      rankScore += 8;
      reasons.push("puede aportar apoyo complementario dentro de una estrategia integral");
    }

    if (goal === "health" && product.category === "sleep") {
      rankScore += 8;
      reasons.push("el descanso suele ser una palanca importante para tu bienestar general");
    }

    if (stress === "high" && product.category === "stress") {
      rankScore += 34;
      reasons.push("encaja mejor con perfiles de estrés alto");
    }

    if (stress === "medium" && product.category === "stress") {
      rankScore += 18;
      reasons.push("puede aportar apoyo útil con estrés moderado");
    }

    if (stress === "high" && product.category === "sleep") {
      rankScore += 10;
      reasons.push("el estrés alto puede afectar recuperación y descanso");
    }

    if (
      stress === "high" &&
      goal === "focus" &&
      product.category === "focus"
    ) {
      rankScore += 8;
      reasons.push("puede tener más sentido cuando el enfoque también sufre por carga mental");
    }

    if ((sleep === "5" || sleep === "6") && product.category === "sleep") {
      rankScore += 34;
      reasons.push("gana prioridad cuando el descanso actual es insuficiente");
    }

    if (sleep === "5" && product.category === "general") {
      rankScore += 6;
      reasons.push("puede acompañar una estrategia general cuando hay fatiga acumulada");
    }

    if (
      (sleep === "5" || sleep === "6") &&
      goal === "energy" &&
      product.category === "energy"
    ) {
      rankScore += 8;
      reasons.push("puede ser relevante cuando la energía también está limitada por poco descanso");
    }

    if (
      age >= 40 &&
      sex === "male" &&
      product.supplementName === "Multivitamínico para hombre 40+"
    ) {
      rankScore += 26;
      reasons.push("especialmente alineado con perfiles masculinos mayores de 40");
    }

    if (
      age >= 40 &&
      sex === "female" &&
      product.supplementName === "Multivitamínico de soporte general"
    ) {
      rankScore += 20;
      reasons.push("puede ser una base útil en perfiles adultos que buscan soporte general");
    }

    if (age >= 40 && product.category === "general") {
      rankScore += 6;
      reasons.push("la base general de soporte suele ganar importancia con la edad");
    }

    if (goal === "sleep" && product.supplementName === "Magnesio glicinato") {
      rankScore += 10;
      reasons.push("es una referencia frecuente cuando la prioridad es descanso nocturno");
    }

    if (stress === "high" && product.supplementName === "Ashwagandha") {
      rankScore += 10;
      reasons.push("suele considerarse cuando la carga mental es una señal dominante");
    }

    if (goal === "focus" && product.supplementName === "Omega-3") {
      rankScore += 10;
      reasons.push("suele aparecer como referencia relevante para soporte cognitivo");
    }

    if (goal === "energy" && product.supplementName === "CoQ10") {
      rankScore += 10;
      reasons.push("suele tener alta afinidad con búsquedas orientadas a energía");
    }

    if (
      sleep === "5" &&
      product.supplementName === "Melatonina de apoyo ocasional"
    ) {
      rankScore += 8;
      reasons.push("puede resultar especialmente coherente cuando el descanso actual es muy corto");
    }

    if (product.priority === "high") {
      rankScore += 15;
    } else if (product.priority === "medium") {
      rankScore += 8;
    } else {
      rankScore += 3;
    }

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

function uniqueReasons(reasons: string[]) {
  return Array.from(new Set(reasons));
}
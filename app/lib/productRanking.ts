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

  const ranked = PRODUCTS.map((product) => {
    let rankScore = 0;
    const reasons: string[] = [];

    // Reglas por objetivo principal
    if (profile.goal === "energy" && product.category === "energy") {
      rankScore += 40;
      reasons.push("alineado con tu objetivo de energía");
    }

    if (profile.goal === "focus" && product.category === "focus") {
      rankScore += 40;
      reasons.push("alineado con tu objetivo de concentración");
    }

    if (profile.goal === "sleep" && product.category === "sleep") {
      rankScore += 40;
      reasons.push("alineado con tu objetivo de sueño");
    }

    if (profile.goal === "health" && product.category === "general") {
      rankScore += 35;
      reasons.push("alineado con tu objetivo de salud general");
    }

    // Reglas por estrés
    if (profile.stress === "high" && product.category === "stress") {
      rankScore += 35;
      reasons.push("útil para perfiles con estrés alto");
    }

    if (profile.stress === "medium" && product.category === "stress") {
      rankScore += 20;
      reasons.push("puede apoyar el manejo de estrés moderado");
    }

    // Reglas por sueño
    if ((profile.sleep === "5" || profile.sleep === "6") && product.category === "sleep") {
      rankScore += 35;
      reasons.push("apoya recuperación y descanso cuando duermes poco");
    }

    // Reglas por edad
    if (age >= 40 && product.supplementName === "Multivitamínico para hombre 40+") {
      rankScore += 25;
      reasons.push("adecuado para perfiles masculinos mayores de 40");
    }

    // Bonificación por prioridad del producto en catálogo
    if (product.priority === "high") {
      rankScore += 15;
    } else if (product.priority === "medium") {
      rankScore += 8;
    } else {
      rankScore += 3;
    }

    // Bonus general por categorías compatibles
    if (profile.goal === "health" && product.category === "focus") {
      rankScore += 5;
    }

    if (profile.goal === "focus" && product.category === "energy") {
      rankScore += 8;
    }

    if (profile.goal === "energy" && product.category === "general") {
      rankScore += 6;
    }

    return {
      ...product,
      rankScore,
      reasons: uniqueReasons(reasons),
    };
  });

  return ranked.sort((a, b) => b.rankScore - a.rankScore);
}

function uniqueReasons(reasons: string[]) {
  return Array.from(new Set(reasons));
}
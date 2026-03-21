import { PRODUCTS, type Product, type ProductCategory, type ProductPriority } from "./products";

export type QuizData = {
  age: string;
  sex: string;
  stress: string;
  sleep: string;
  goal: string;
};

export type RecommendationItem = {
  name: string;
  reason: string;
  schedule: string;
  category: ProductCategory;
  priority: ProductPriority;
  product?: Product;
};

export function getRecommendations(data: QuizData): RecommendationItem[] {
  const recommendations: RecommendationItem[] = [];
  const age = Number(data.age);

  if (age >= 40 && data.sex === "male") {
    recommendations.push({
      name: "Multivitamínico para hombre 40+",
      reason:
        "Puede ayudar a cubrir micronutrientes clave que suelen cobrar más importancia después de los 40.",
      schedule: "Tomar en la mañana con el desayuno.",
      category: "general",
      priority: "medium",
    });
  }

  if (data.stress === "high") {
    recommendations.push({
      name: "Magnesio glicinato",
      reason:
        "Puede ser una opción prioritaria cuando hay estrés alto y se busca apoyo para relajación y recuperación.",
      schedule: "Tomar en la noche.",
      category: "stress",
      priority: "high",
    });

    recommendations.push({
      name: "Ashwagandha",
      reason:
        "Se utiliza frecuentemente como apoyo para el manejo del estrés y la carga mental.",
      schedule: "Tomar 1 vez al día, preferiblemente en la mañana o tarde.",
      category: "stress",
      priority: "high",
    });
  }

  if (data.sleep === "5" || data.sleep === "6") {
    recommendations.push({
      name: "Magnesio para sueño y recuperación",
      reason:
        "Dormir poco suele afectar energía y recuperación; por eso este apoyo se vuelve prioritario.",
      schedule: "Tomar en la noche antes de dormir.",
      category: "sleep",
      priority: "high",
    });
  }

  if (data.goal === "energy") {
    recommendations.push({
      name: "CoQ10",
      reason:
        "Es una de las opciones más usadas cuando el objetivo principal es apoyar energía física y mental.",
      schedule: "Tomar en la mañana con comida.",
      category: "energy",
      priority: "high",
    });

    recommendations.push({
      name: "Complejo B",
      reason:
        "Las vitaminas del complejo B participan en el metabolismo energético y pueden complementar el soporte general.",
      schedule: "Tomar en la mañana.",
      category: "energy",
      priority: "medium",
    });
  }

  if (data.goal === "focus") {
    recommendations.push({
      name: "Omega-3",
      reason:
        "Puede ser una opción importante para apoyar función cerebral, enfoque y bienestar cognitivo.",
      schedule: "Tomar con una comida principal.",
      category: "focus",
      priority: "high",
    });

    recommendations.push({
      name: "Complejo B",
      reason:
        "Puede complementar el soporte del sistema nervioso y el metabolismo energético.",
      schedule: "Tomar en la mañana.",
      category: "energy",
      priority: "medium",
    });
  }

  if (data.goal === "sleep") {
    recommendations.push({
      name: "Magnesio glicinato",
      reason:
        "Es una de las opciones más utilizadas cuando se busca apoyo para relajación y descanso nocturno.",
      schedule: "Tomar en la noche.",
      category: "sleep",
      priority: "high",
    });
  }

  if (data.goal === "health") {
    recommendations.push({
      name: "Omega-3",
      reason:
        "Suele recomendarse como apoyo general para salud cardiovascular y bienestar integral.",
      schedule: "Tomar con una comida principal.",
      category: "general",
      priority: "high",
    });

    recommendations.push({
      name: "Vitamina D",
      reason:
        "Es un nutriente relevante en salud general, especialmente si hay poca exposición solar.",
      schedule: "Tomar en la mañana con comida.",
      category: "general",
      priority: "medium",
    });
  }

  const unique = uniqueRecommendations(recommendations);

  return unique
    .map((item) => ({
      ...item,
      product: findProductBySupplement(item.name),
    }))
    .sort(sortByPriority);
}

function uniqueRecommendations(items: RecommendationItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}

function findProductBySupplement(name: string): Product | undefined {
  return PRODUCTS.find((product) => product.supplementName === name);
}

function sortByPriority(a: RecommendationItem, b: RecommendationItem) {
  const rank: Record<ProductPriority, number> = {
    high: 1,
    medium: 2,
    low: 3,
  };

  return rank[a.priority] - rank[b.priority];
}
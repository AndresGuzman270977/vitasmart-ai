import {
  PRODUCTS,
  type Product,
  type ProductCategory,
  type ProductPriority,
} from "./products";

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

type DraftRecommendation = Omit<RecommendationItem, "product">;

export function getRecommendations(data: QuizData): RecommendationItem[] {
  const recommendations: DraftRecommendation[] = [];
  const age = Number(data.age || 0);
  const sex = String(data.sex || "").trim();
  const stress = String(data.stress || "").trim();
  const sleep = String(data.sleep || "").trim();
  const goal = String(data.goal || "").trim();

  if (age >= 40 && sex === "male") {
    recommendations.push({
      name: "Multivitamínico para hombre 40+",
      reason:
        "Puede ayudar a reforzar micronutrientes que suelen cobrar más importancia con el paso de los años.",
      schedule: "Tomar en la mañana con el desayuno.",
      category: "general",
      priority: "medium",
    });
  }

  if (stress === "high") {
    recommendations.push(
      {
        name: "Magnesio glicinato",
        reason:
          "Suele ser una opción prioritaria cuando hay estrés alto y se busca apoyo para relajación y recuperación.",
        schedule: "Tomar en la noche.",
        category: "stress",
        priority: "high",
      },
      {
        name: "Ashwagandha",
        reason:
          "Se utiliza frecuentemente como apoyo para manejar mejor la carga mental y el estrés sostenido.",
        schedule: "Tomar 1 vez al día, preferiblemente en la mañana o tarde.",
        category: "stress",
        priority: "high",
      }
    );
  }

  if (stress === "medium") {
    recommendations.push({
      name: "Magnesio glicinato",
      reason:
        "Puede aportar apoyo útil cuando hay señales moderadas de tensión o carga acumulada.",
      schedule: "Tomar en la noche.",
      category: "stress",
      priority: "medium",
    });
  }

  if (sleep === "5" || sleep === "6") {
    recommendations.push({
      name: "Magnesio para sueño y recuperación",
      reason:
        "Dormir poco suele afectar energía, recuperación y claridad mental; por eso este apoyo gana prioridad.",
      schedule: "Tomar en la noche antes de dormir.",
      category: "sleep",
      priority: "high",
    });
  }

  if (goal === "energy") {
    recommendations.push(
      {
        name: "CoQ10",
        reason:
          "Es una de las opciones más usadas cuando el objetivo principal es apoyar energía física y mental.",
        schedule: "Tomar en la mañana con comida.",
        category: "energy",
        priority: "high",
      },
      {
        name: "Complejo B",
        reason:
          "Las vitaminas del complejo B participan en el metabolismo energético y pueden complementar el soporte general.",
        schedule: "Tomar en la mañana.",
        category: "energy",
        priority: "medium",
      }
    );

    if (sleep === "5" || sleep === "6") {
      recommendations.push({
        name: "Omega-3",
        reason:
          "Puede complementar una estrategia general cuando la energía también se ve afectada por descanso subóptimo.",
        schedule: "Tomar con una comida principal.",
        category: "general",
        priority: "medium",
      });
    }
  }

  if (goal === "focus") {
    recommendations.push(
      {
        name: "Omega-3",
        reason:
          "Puede ser una opción relevante para apoyar función cerebral, claridad y bienestar cognitivo.",
        schedule: "Tomar con una comida principal.",
        category: "focus",
        priority: "high",
      },
      {
        name: "Complejo B",
        reason:
          "Puede complementar el soporte del sistema nervioso y del metabolismo energético diario.",
        schedule: "Tomar en la mañana.",
        category: "energy",
        priority: "medium",
      }
    );

    if (stress === "high") {
      recommendations.push({
        name: "Ashwagandha",
        reason:
          "Cuando el enfoque se ve afectado por estrés alto, puede aportar apoyo útil como parte de una estrategia más integral.",
        schedule: "Tomar 1 vez al día, preferiblemente en la mañana o tarde.",
        category: "stress",
        priority: "medium",
      });
    }
  }

  if (goal === "sleep") {
    recommendations.push({
      name: "Magnesio glicinato",
      reason:
        "Es una de las opciones más utilizadas cuando se busca apoyo para relajación y descanso nocturno.",
      schedule: "Tomar en la noche.",
      category: "sleep",
      priority: "high",
    });

    if (stress === "high") {
      recommendations.push({
        name: "Ashwagandha",
        reason:
          "Puede complementar una estrategia de descanso cuando la tensión mental está afectando el sueño.",
        schedule: "Tomar en la tarde o noche.",
        category: "sleep",
        priority: "medium",
      });
    }
  }

  if (goal === "health") {
    recommendations.push(
      {
        name: "Omega-3",
        reason:
          "Suele recomendarse como apoyo general para bienestar integral y equilibrio diario.",
        schedule: "Tomar con una comida principal.",
        category: "general",
        priority: "high",
      },
      {
        name: "Vitamina D",
        reason:
          "Es un nutriente relevante para salud general, especialmente cuando la exposición solar es limitada.",
        schedule: "Tomar en la mañana con comida.",
        category: "general",
        priority: "medium",
      }
    );
  }

  if ((goal === "energy" || goal === "focus") && stress === "high") {
    recommendations.push({
      name: "Magnesio glicinato",
      reason:
        "Cuando energía o enfoque se ven afectados por estrés alto, apoyar relajación y recuperación puede ser especialmente útil.",
      schedule: "Tomar en la noche.",
      category: "stress",
      priority: "high",
    });
  }

  if ((goal === "focus" || goal === "health") && sleep === "5") {
    recommendations.push({
      name: "Magnesio para sueño y recuperación",
      reason:
        "Mejorar el descanso puede ser una de las palancas más importantes cuando el sueño actual es claramente insuficiente.",
      schedule: "Tomar en la noche antes de dormir.",
      category: "sleep",
      priority: "high",
    });
  }

  const unique = mergeAndDeduplicateRecommendations(recommendations);

  return unique
    .map((item) => ({
      ...item,
      product: findProductBySupplement(item.name),
    }))
    .sort(sortByPriorityThenCategory);
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function mergeAndDeduplicateRecommendations(
  items: DraftRecommendation[]
): DraftRecommendation[] {
  const map = new Map<string, DraftRecommendation>();

  for (const item of items) {
    const key = normalizeKey(item.name);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      continue;
    }

    const keep =
      comparePriority(item.priority, existing.priority) < 0 ? item : existing;

    map.set(key, keep);
  }

  return Array.from(map.values());
}

function findProductBySupplement(name: string): Product | undefined {
  const normalizedName = normalizeKey(name);

  return PRODUCTS.find(
    (product) => normalizeKey(product.supplementName) === normalizedName
  );
}

function comparePriority(a: ProductPriority, b: ProductPriority) {
  const rank: Record<ProductPriority, number> = {
    high: 1,
    medium: 2,
    low: 3,
  };

  return rank[a] - rank[b];
}

function sortByPriorityThenCategory(
  a: RecommendationItem,
  b: RecommendationItem
) {
  const priorityComparison = comparePriority(a.priority, b.priority);

  if (priorityComparison !== 0) {
    return priorityComparison;
  }

  return a.category.localeCompare(b.category);
}
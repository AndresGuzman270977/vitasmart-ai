export type ProductCategory =
  | "energy"
  | "stress"
  | "sleep"
  | "focus"
  | "general";

export type ProductPriority = "high" | "medium" | "low";

export type Product = {
  slug: string;
  supplementName: string;
  brand: string;
  productName: string;
  price: string;
  buyUrl: string;
  category: ProductCategory;
  priority: ProductPriority;
  description: string;
};

/**
 * LEGACY PRODUCT CATALOG
 *
 * Este archivo se mantiene como compatibilidad temporal con partes
 * anteriores de la aplicación. La nueva arquitectura premium debe
 * apoyarse principalmente en:
 *
 * - app/lib/catalog/ingredientCatalog.ts
 * - app/lib/catalog/productCatalog.ts
 * - app/lib/recommendationEngine/*
 * - app/api/health-analysis/route.ts
 *
 * Mientras la migración total termina, este catálogo sigue disponible
 * para no romper imports o flujos viejos.
 */

export const PRODUCTS: Product[] = [
  {
    slug: "multivitamin-men-40",
    supplementName: "Multivitamínico para hombre 40+",
    brand: "Nature Made",
    productName: "Nature Made Multi for Him",
    price: "USD 18 - 25",
    buyUrl: "https://www.amazon.com/",
    category: "general",
    priority: "medium",
    description:
      "Multivitamínico formulado para cubrir micronutrientes clave en hombres mayores de 40 años, útil como apoyo general de bienestar.",
  },
  {
    slug: "general-multivitamin-support",
    supplementName: "Multivitamínico de soporte general",
    brand: "Centrum",
    productName: "Centrum Adult Multivitamin",
    price: "USD 14 - 24",
    buyUrl: "https://www.amazon.com/",
    category: "general",
    priority: "medium",
    description:
      "Opción orientada a soporte nutricional general, útil como base para complementar hábitos de bienestar diario.",
  },
  {
    slug: "magnesium-glycinate",
    supplementName: "Magnesio glicinato",
    brand: "Doctor's Best",
    productName: "High Absorption Magnesium",
    price: "USD 15 - 25",
    buyUrl: "https://www.amazon.com/",
    category: "stress",
    priority: "high",
    description:
      "Suplemento de magnesio en forma de glicinato, comúnmente utilizado como apoyo para relajación, recuperación y manejo de estrés.",
  },
  {
    slug: "magnesium-sleep",
    supplementName: "Magnesio para sueño y recuperación",
    brand: "NOW Foods",
    productName: "Magnesium Glycinate",
    price: "USD 18 - 28",
    buyUrl: "https://www.amazon.com/",
    category: "sleep",
    priority: "high",
    description:
      "Opción orientada a descanso y recuperación, especialmente útil en perfiles con sueño insuficiente o fatiga acumulada.",
  },
  {
    slug: "melatonin-occasional-support",
    supplementName: "Melatonina de apoyo ocasional",
    brand: "Natrol",
    productName: "Melatonin Fast Dissolve",
    price: "USD 10 - 18",
    buyUrl: "https://www.amazon.com/",
    category: "sleep",
    priority: "medium",
    description:
      "Apoyo de uso ocasional enfocado en la rutina nocturna y en perfiles donde el descanso necesita más estructura.",
  },
  {
    slug: "ashwagandha",
    supplementName: "Ashwagandha",
    brand: "Himalaya",
    productName: "Organic Ashwagandha",
    price: "USD 15 - 22",
    buyUrl: "https://www.amazon.com/",
    category: "stress",
    priority: "high",
    description:
      "Adaptógeno popular usado como apoyo para estrés mental, carga diaria y equilibrio general.",
  },
  {
    slug: "coq10",
    supplementName: "CoQ10",
    brand: "Qunol",
    productName: "Ultra CoQ10",
    price: "USD 20 - 35",
    buyUrl: "https://www.amazon.com/",
    category: "energy",
    priority: "high",
    description:
      "La coenzima Q10 suele utilizarse como apoyo del metabolismo energético y del rendimiento general.",
  },
  {
    slug: "complex-b",
    supplementName: "Complejo B",
    brand: "Nature Made",
    productName: "Super B-Complex",
    price: "USD 12 - 20",
    buyUrl: "https://www.amazon.com/",
    category: "energy",
    priority: "medium",
    description:
      "Conjunto de vitaminas del complejo B relacionado con metabolismo energético, sistema nervioso y apoyo general.",
  },
  {
    slug: "omega-3",
    supplementName: "Omega-3",
    brand: "Nordic Naturals",
    productName: "Ultimate Omega",
    price: "USD 25 - 40",
    buyUrl: "https://www.amazon.com/",
    category: "focus",
    priority: "high",
    description:
      "Ácidos grasos omega-3 comúnmente recomendados como apoyo para salud cardiovascular, función cerebral y bienestar integral.",
  },
  {
    slug: "vitamin-d",
    supplementName: "Vitamina D",
    brand: "Nature Made",
    productName: "Vitamin D3",
    price: "USD 10 - 18",
    buyUrl: "https://www.amazon.com/",
    category: "general",
    priority: "medium",
    description:
      "Vitamina clave para bienestar general, especialmente relevante cuando hay baja exposición solar o necesidad de soporte integral.",
  },
  {
    slug: "l-theanine",
    supplementName: "L-Teanina",
    brand: "NOW Foods",
    productName: "L-Theanine 200 mg",
    price: "USD 16 - 24",
    buyUrl: "https://www.amazon.com/",
    category: "focus",
    priority: "medium",
    description:
      "Suplemento frecuentemente considerado cuando se busca una sensación de enfoque más estable y una carga mental más ordenada.",
  },
  {
    slug: "rhodiola",
    supplementName: "Rhodiola rosea",
    brand: "Gaia Herbs",
    productName: "Rhodiola Rosea",
    price: "USD 18 - 30",
    buyUrl: "https://www.amazon.com/",
    category: "energy",
    priority: "medium",
    description:
      "Opción utilizada en contextos de fatiga mental o física cuando se busca apoyo adaptativo para sostener energía y rendimiento.",
  },
  {
    slug: "glycine",
    supplementName: "Glicina",
    brand: "BulkSupplements",
    productName: "Glycine Powder",
    price: "USD 14 - 22",
    buyUrl: "https://www.amazon.com/",
    category: "sleep",
    priority: "medium",
    description:
      "Ingrediente que suele aparecer en rutinas orientadas a descanso y recuperación cuando se busca una noche más estructurada.",
  },
  {
    slug: "electrolytes",
    supplementName: "Electrolitos de soporte diario",
    brand: "LMNT",
    productName: "Electrolyte Drink Mix",
    price: "USD 35 - 45",
    buyUrl: "https://www.amazon.com/",
    category: "energy",
    priority: "low",
    description:
      "Apoyo complementario para hidratación y sensación de energía más estable, especialmente en perfiles con desgaste diario o baja recuperación.",
  },
  {
    slug: "probiotic-general",
    supplementName: "Probiótico de soporte general",
    brand: "Culturelle",
    productName: "Daily Probiotic",
    price: "USD 20 - 32",
    buyUrl: "https://www.amazon.com/",
    category: "general",
    priority: "low",
    description:
      "Opción orientada a soporte general de bienestar, útil dentro de una estrategia más amplia de hábitos y cuidado integral.",
  },
];

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function getProductBySlug(slug: string): Product | undefined {
  const normalizedSlug = normalizeText(slug);
  return PRODUCTS.find((product) => normalizeText(product.slug) === normalizedSlug);
}

export function getProductsByCategory(category: ProductCategory): Product[] {
  return PRODUCTS.filter((product) => product.category === category);
}

export function getProductsByPriority(priority: ProductPriority): Product[] {
  return PRODUCTS.filter((product) => product.priority === priority);
}

export function searchProducts(term: string): Product[] {
  const normalizedTerm = normalizeText(term);

  if (!normalizedTerm) return PRODUCTS;

  return PRODUCTS.filter((product) =>
    [
      product.slug,
      product.supplementName,
      product.brand,
      product.productName,
      product.category,
      product.priority,
      product.description,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedTerm)
  );
}

export function getRelatedProductsByCategory(
  slug: string,
  limit = 3
): Product[] {
  const current = getProductBySlug(slug);
  if (!current) return [];

  return PRODUCTS.filter(
    (product) =>
      product.slug !== current.slug && product.category === current.category
  ).slice(0, limit);
}

export function getLegacyProductCatalogMeta() {
  return {
    total: PRODUCTS.length,
    categories: Array.from(new Set(PRODUCTS.map((product) => product.category))),
    priorities: Array.from(new Set(PRODUCTS.map((product) => product.priority))),
    isLegacyCatalog: true,
  } as const;
}
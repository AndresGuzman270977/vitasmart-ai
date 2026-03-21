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
];
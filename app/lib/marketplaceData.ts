export type SupplementCategory =
  | "energy"
  | "sleep"
  | "stress"
  | "focus"
  | "immunity"
  | "performance";

export type SupplementGoal =
  | "more_energy"
  | "better_sleep"
  | "stress_support"
  | "mental_focus"
  | "general_wellness"
  | "sports_performance"
  | "immunity";

export type SupplementProduct = {
  id: string;
  slug: string;
  name: string;
  category: SupplementCategory;
  goals: SupplementGoal[];
  shortDescription: string;
  description: string;
  price: number;
  image: string;
  rating: number;
  featured?: boolean;
  tags: string[];
};

export const SUPPLEMENTS: SupplementProduct[] = [
  {
    id: "magnesium-glycinate",
    slug: "magnesium-glycinate",
    name: "Magnesium Glycinate",
    category: "sleep",
    goals: ["better_sleep", "stress_support", "general_wellness"],
    shortDescription: "Apoyo para descanso, relajación y recuperación.",
    description:
      "Suplemento orientado a mejorar la relajación muscular y apoyar rutinas de sueño y manejo del estrés.",
    price: 24.9,
    image: "/supplements/magnesium.jpg",
    rating: 4.8,
    featured: true,
    tags: ["sleep", "recovery", "calm"],
  },
  {
    id: "omega-3",
    slug: "omega-3",
    name: "Omega-3",
    category: "focus",
    goals: ["mental_focus", "general_wellness"],
    shortDescription: "Soporte cognitivo y bienestar general.",
    description:
      "Ácidos grasos esenciales utilizados comúnmente para apoyo cognitivo y salud integral.",
    price: 29.9,
    image: "/supplements/omega3.jpg",
    rating: 4.7,
    featured: true,
    tags: ["brain", "focus", "wellness"],
  },
  {
    id: "vitamin-d3-k2",
    slug: "vitamin-d3-k2",
    name: "Vitamin D3 + K2",
    category: "immunity",
    goals: ["general_wellness", "immunity"],
    shortDescription: "Bienestar integral y soporte diario.",
    description:
      "Fórmula popular para rutinas de bienestar diario, especialmente útil en hábitos de soporte general.",
    price: 21.5,
    image: "/supplements/d3k2.jpg",
    rating: 4.6,
    featured: false,
    tags: ["daily", "bones", "wellness"],
  },
  {
    id: "ashwagandha",
    slug: "ashwagandha",
    name: "Ashwagandha",
    category: "stress",
    goals: ["stress_support", "better_sleep", "mental_focus"],
    shortDescription: "Apoyo para estrés, calma y enfoque.",
    description:
      "Adaptógeno muy usado en protocolos de bienestar para equilibrio diario, concentración y relajación.",
    price: 27.9,
    image: "/supplements/ashwagandha.jpg",
    rating: 4.8,
    featured: true,
    tags: ["stress", "calm", "focus"],
  },
  {
    id: "rhodiola",
    slug: "rhodiola",
    name: "Rhodiola Rosea",
    category: "energy",
    goals: ["more_energy", "mental_focus", "stress_support"],
    shortDescription: "Energía mental y resistencia al estrés.",
    description:
      "Muy utilizada para apoyar claridad mental, sensación de energía y tolerancia al estrés.",
    price: 25.5,
    image: "/supplements/rhodiola.jpg",
    rating: 4.5,
    featured: false,
    tags: ["energy", "focus", "adaptogen"],
  },
  {
    id: "l-theanine",
    slug: "l-theanine",
    name: "L-Theanine",
    category: "focus",
    goals: ["mental_focus", "stress_support", "better_sleep"],
    shortDescription: "Calma mental y enfoque sostenido.",
    description:
      "Componente frecuentemente utilizado para enfoque más estable, reducción de tensión y relajación.",
    price: 19.9,
    image: "/supplements/ltheanine.jpg",
    rating: 4.7,
    featured: false,
    tags: ["calm", "focus", "clarity"],
  },
  {
    id: "b-complex",
    slug: "b-complex",
    name: "Vitamin B-Complex",
    category: "energy",
    goals: ["more_energy", "general_wellness"],
    shortDescription: "Soporte de energía y metabolismo.",
    description:
      "Complejo vitamínico orientado al soporte del metabolismo energético y rutinas de vitalidad diaria.",
    price: 18.9,
    image: "/supplements/bcomplex.jpg",
    rating: 4.4,
    featured: false,
    tags: ["energy", "daily", "metabolism"],
  },
  {
    id: "creatine",
    slug: "creatine",
    name: "Creatine Monohydrate",
    category: "performance",
    goals: ["sports_performance", "mental_focus", "more_energy"],
    shortDescription: "Apoyo para rendimiento físico y mental.",
    description:
      "Suplemento ampliamente usado en contextos de rendimiento, recuperación y energía funcional.",
    price: 31.9,
    image: "/supplements/creatine.jpg",
    rating: 4.9,
    featured: true,
    tags: ["performance", "strength", "focus"],
  },
];
// app/lib/architectureStatus.ts

export const VITASMART_ARCHITECTURE_STATUS = {
  activeSourceOfTruth: {
    ingredients: "app/lib/catalog/ingredientCatalog.ts",
    products: "app/lib/catalog/productCatalog.ts",
    healthEngine: "app/lib/healthEngine",
    recommendationEngine: "app/lib/recommendationEngine",
    healthAnalysis: "app/lib/healthAnalysis",
    api: "app/api/health-analysis/route.ts",
  },

  migratedPages: {
    quiz: true,
    results: true,
    marketplace: true,
    productDetail: true,
    history: true,
    dashboard: true,
  },

  deprecatedLegacyModules: [
    "app/lib/products.ts",
    "app/lib/productRanking.ts",
    "app/lib/recommendations.ts",
  ],
} as const;
"use client";

import { useMemo, useState } from "react";
import type { MarketplaceMode, PlanType } from "../app/lib/planLimits";
import type {
  SupplementCategory,
  SupplementProduct,
} from "../app/lib/marketplaceData";
import type {
  BundleRecommendation,
  HealthAssessmentLite,
  RankedProduct,
} from "../app/lib/marketplaceEngine";
import PremiumGate from "./PremiumGate";

type MarketplaceCatalogProps = {
  plan: PlanType;
  mode: MarketplaceMode;
  assessment: HealthAssessmentLite | null;
  basicProducts: SupplementProduct[];
  rankedProducts: RankedProduct[];
  bundles: BundleRecommendation[];
};

type SortOption = "featured" | "rating" | "priceAsc" | "priceDesc";

type DisplayProduct = SupplementProduct | RankedProduct;

function isRankedProduct(product: DisplayProduct): product is RankedProduct {
  return "scoreValue" in product && "reasons" in product;
}

export default function MarketplaceCatalog({
  plan,
  mode,
  assessment,
  basicProducts,
  rankedProducts,
  bundles,
}: MarketplaceCatalogProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<SupplementCategory | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("featured");

  const smartEnabled = mode === "smart" || mode === "premium";
  const premiumEnabled = mode === "premium";

  const sourceProducts: DisplayProduct[] = smartEnabled
    ? rankedProducts
    : basicProducts;

  const filteredProducts = useMemo<DisplayProduct[]>(() => {
    let items = [...sourceProducts];

    if (search.trim()) {
      const term = search.toLowerCase().trim();

      items = items.filter((item) => {
        const haystack = [
          item.name,
          item.shortDescription,
          item.description,
          ...item.tags,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(term);
      });
    }

    if (category !== "all") {
      items = items.filter((item) => item.category === category);
    }

    if (sortBy === "rating") {
      items.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "priceAsc") {
      items.sort((a, b) => a.price - b.price);
    } else if (sortBy === "priceDesc") {
      items.sort((a, b) => b.price - a.price);
    } else {
      items.sort((a, b) => {
        if (smartEnabled && isRankedProduct(a) && isRankedProduct(b)) {
          return b.scoreValue - a.scoreValue;
        }

        const aFeatured = a.featured ? 1 : 0;
        const bFeatured = b.featured ? 1 : 0;

        if (bFeatured !== aFeatured) {
          return bFeatured - aFeatured;
        }

        return b.rating - a.rating;
      });
    }

    return items;
  }, [sourceProducts, search, category, sortBy, smartEnabled]);

  const topRecommended = useMemo<RankedProduct[]>(() => {
    return smartEnabled ? rankedProducts.slice(0, 3) : [];
  }, [rankedProducts, smartEnabled]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Plan actual: {plan.toUpperCase()}
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Marketplace</h1>
            <p className="mt-2 text-sm text-slate-600">
              Explora suplementos según tu plan y nivel de personalización.
            </p>
          </div>

          {assessment && (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div>
                <span className="font-semibold">Objetivo:</span>{" "}
                {assessment.goal || "No definido"}
              </div>
              <div>
                <span className="font-semibold">Estrés:</span>{" "}
                {assessment.stress || "N/D"}
              </div>
              <div>
                <span className="font-semibold">Sueño:</span>{" "}
                {assessment.sleep || "N/D"}
              </div>
            </div>
          )}
        </div>

        {smartEnabled ? (
          <div className="grid gap-4 md:grid-cols-3">
            <input
              type="text"
              placeholder="Buscar suplemento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            />

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as SupplementCategory | "all")
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            >
              <option value="all">Todas las categorías</option>
              <option value="energy">Energy</option>
              <option value="sleep">Sleep</option>
              <option value="stress">Stress</option>
              <option value="focus">Focus</option>
              <option value="immunity">Immunity</option>
              <option value="performance">Performance</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            >
              <option value="featured">
                {smartEnabled ? "Orden inteligente" : "Destacados"}
              </option>
              <option value="rating">Mejor valoración</option>
              <option value="priceAsc">Precio menor</option>
              <option value="priceDesc">Precio mayor</option>
            </select>
          </div>
        ) : (
          <PremiumGate
            title="Marketplace inteligente bloqueado"
            description="Con VitaSmart Pro desbloqueas ranking personalizado, filtros inteligentes y recomendaciones basadas en tu último análisis."
            requiredPlan="pro"
          />
        )}
      </section>

      {smartEnabled && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-slate-900">
              Recomendaciones inteligentes
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Ordenadas según tu último health assessment.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {topRecommended.map((product) => (
              <div
                key={product.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold text-slate-900">
                    {product.name}
                  </h3>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Score {Math.round(product.scoreValue)}
                  </span>
                </div>

                <p className="mb-3 text-sm text-slate-600">
                  {product.shortDescription}
                </p>

                <div className="mb-4 flex flex-wrap gap-2">
                  {product.reasons.slice(0, 3).map((reason, idx) => (
                    <span
                      key={`${product.id}-reason-${idx}`}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                    >
                      {reason}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-slate-900">
                    ${product.price.toFixed(2)}
                  </span>
                  <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                    Add to cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {premiumEnabled ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-slate-900">
              Premium smart bundles
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Combinaciones agrupadas según tu perfil y objetivo.
            </p>
          </div>

          {bundles.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Aún no hay suficientes señales para generar bundles premium.
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
              {bundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className="rounded-2xl border border-violet-200 bg-violet-50 p-5"
                >
                  <div className="mb-3 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
                    Premium Bundle
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">
                    {bundle.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {bundle.description}
                  </p>

                  <div className="mt-4 space-y-3">
                    {bundle.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-white bg-white p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-900">
                              {item.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {item.shortDescription}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-slate-900">
                            ${item.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                    Add premium bundle
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : smartEnabled ? (
        <PremiumGate
          title="Bundles premium bloqueados"
          description="Con VitaSmart Premium desbloqueas stacks agrupados, mayor personalización y experiencia de compra avanzada."
          requiredPlan="premium"
        />
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">
            {smartEnabled ? "Catálogo personalizado" : "Catálogo base"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {smartEnabled
              ? "Catálogo ordenado según relevancia para tu perfil."
              : "En el plan Free solo se muestra el catálogo general."}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl border border-slate-200 p-5 transition hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900">
                  {product.name}
                </h3>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  ★ {product.rating.toFixed(1)}
                </div>
              </div>

              <p className="mb-2 text-sm text-slate-600">
                {product.shortDescription}
              </p>
              <p className="mb-4 text-sm text-slate-500">{product.description}</p>

              <div className="mb-4 flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={`${product.id}-${tag}`}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {smartEnabled && isRankedProduct(product) && (
                <div className="mb-4 rounded-xl bg-emerald-50 p-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    Why recommended
                  </div>
                  <div className="space-y-1 text-xs text-emerald-900">
                    {product.reasons.slice(0, 2).map((reason, idx) => (
                      <div key={`${product.id}-mini-reason-${idx}`}>
                        • {reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-slate-900">
                  ${product.price.toFixed(2)}
                </span>
                <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  Add to cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
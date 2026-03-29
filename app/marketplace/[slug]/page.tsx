"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo } from "react";
import ProductVisualScore from "../../../components/marketplace/ProductVisualScore";
import ProductQualityBadge from "../../../components/marketplace/ProductQualityBadge";
import ProductSafetyPanel from "../../../components/marketplace/ProductSafetyPanel";
import ProductEvidenceBadge from "../../../components/marketplace/ProductEvidenceBadge";

type ProductRecommendationView = {
  product: {
    slug: string;
    ingredientSlug: string;
    productName: string;
    brand: string;
    manufacturer: string;
    form: "capsule" | "tablet" | "softgel" | "powder" | "liquid" | "gummy";
    presentation: string;
    servings: number | null;
    priceUsd: number | null;
    priceLabel: string;
    estimatedCostPerDayUsd: number | null;
    budgetTier: "excellent" | "very_good" | "good";
    qualityScore: number;
    valueScore: number;
    qualitySeals: string[];
    qualityNotes: string[];
    imageUrl: string;
    buyUrl: string;
    availableMarkets: ("amazon" | "iherb" | "direct")[];
  };
  narratives: {
    whyForUser: string;
    scienceSummary: string;
    labQualitySummary: string;
    howToTake: string;
    restrictionsSummary: string;
    sideEffectsSummary: string;
    budgetReason: string;
  };
  fitScore: number;
  qualityScore: number;
  valueScore: number;
};

type TopIngredientRecommendationView = {
  ingredientSlug: string;
  ingredientName: string;
  matchScore: number;
  safetyDecision: "allow" | "allow_with_caution" | "high_caution" | "avoid";
  whyMatched: string[];
  cautions: string[];
  evidenceLevel?: "high" | "moderate" | "limited";
  evidenceSummary?: string;
  scientificContext?: string;
  options: {
    excellent?: ProductRecommendationView;
    veryGood?: ProductRecommendationView;
    good?: ProductRecommendationView;
  };
};

type HealthAnalysisResponse = {
  plan: "free" | "pro" | "premium";
  productRecommendations: TopIngredientRecommendationView[];
};

type FlattenedProductItem = {
  ingredient: TopIngredientRecommendationView;
  tier: "excellent" | "very_good" | "good";
  view: ProductRecommendationView;
};

const LAST_ANALYSIS_CACHE_KEY = "vitaSmartLastHealthAnalysis";

function getStoredAnalysis(): HealthAnalysisResponse | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(LAST_ANALYSIS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as HealthAnalysisResponse;

    if (!parsed || !Array.isArray(parsed.productRecommendations)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function flattenProducts(
  recommendations: TopIngredientRecommendationView[]
): FlattenedProductItem[] {
  const result: FlattenedProductItem[] = [];

  for (const ingredient of recommendations) {
    if (ingredient.options.excellent) {
      result.push({
        ingredient,
        tier: "excellent",
        view: ingredient.options.excellent,
      });
    }

    if (ingredient.options.veryGood) {
      result.push({
        ingredient,
        tier: "very_good",
        view: ingredient.options.veryGood,
      });
    }

    if (ingredient.options.good) {
      result.push({
        ingredient,
        tier: "good",
        view: ingredient.options.good,
      });
    }
  }

  return result;
}

export default function ProductDetailPage() {
  const params = useParams();

  const slug =
    typeof params?.slug === "string"
      ? params.slug
      : Array.isArray(params?.slug)
      ? params.slug[0]
      : "";

  const analysis = getStoredAnalysis();

  const flattenedProducts = useMemo(() => {
    return flattenProducts(analysis?.productRecommendations || []);
  }, [analysis]);

  const productData = useMemo(() => {
    if (!flattenedProducts.length || !slug) return null;

    return (
      flattenedProducts.find((item) => item.view.product.slug === slug) || null
    );
  }, [flattenedProducts, slug]);

  if (!slug || !productData) {
    notFound();
  }

  const { ingredient, view, tier } = productData;
  const product = view.product;
  const narratives = view.narratives;

  const relatedSameIngredient = flattenedProducts
    .filter(
      (item) =>
        item.view.product.slug !== product.slug &&
        item.ingredient.ingredientSlug === ingredient.ingredientSlug
    )
    .slice(0, 3);

  const relatedIngredients = (analysis?.productRecommendations || [])
    .filter((item) => item.ingredientSlug !== ingredient.ingredientSlug)
    .slice(0, 3);

  const qualitySeals = Array.isArray(product.qualitySeals)
    ? product.qualitySeals
    : [];

  const qualityNotes = Array.isArray(product.qualityNotes)
    ? product.qualityNotes
    : [];

  const markets = Array.isArray(product.availableMarkets)
    ? product.availableMarkets
    : [];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/marketplace"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            ← Volver al marketplace
          </Link>

          <div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1 text-sm text-slate-600 shadow-sm">
            VitaSmart AI · Product Detail
          </div>
        </div>

        <section className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <ProductQualityBadge value={tier} />
              <ProductEvidenceBadge evidenceLevel={ingredient.evidenceLevel} />
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                Selección VitaSmart
              </span>
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              {product.productName}
            </h1>

            <p className="mt-3 text-lg text-slate-500">
              {product.brand} · {product.manufacturer}
            </p>

            <div className="mt-8 overflow-hidden rounded-3xl bg-slate-50 ring-1 ring-slate-200">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.productName}
                  className="h-[360px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[360px] items-center justify-center text-sm text-slate-400">
                  Imagen no disponible
                </div>
              )}
            </div>

            <div className="mt-8 rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Ingrediente principal
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                {ingredient.ingredientName}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Este producto aparece dentro del ecosistema VitaSmart AI como
                una opción relevante dentro de un comparador estructurado por
                ingrediente, evidencia, contexto de calidad y tier de presupuesto.
              </p>

              {ingredient.evidenceSummary ? (
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  <strong className="text-slate-900">Evidencia resumida:</strong>{" "}
                  {ingredient.evidenceSummary}
                </p>
              ) : null}

              {ingredient.scientificContext ? (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  <strong className="text-slate-900">Contexto científico:</strong>{" "}
                  {ingredient.scientificContext}
                </p>
              ) : null}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <ProductVisualScore label="Fit" value={view.fitScore} />
              <ProductVisualScore label="Quality" value={view.qualityScore} />
              <ProductVisualScore label="Value" value={view.valueScore} />
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-semibold text-slate-900">
                Por qué puede ser bueno para ti
              </h2>
              <p className="mt-4 leading-8 text-slate-600">
                {narratives.whyForUser}
              </p>
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-semibold text-slate-900">
                Base científica resumida
              </h2>
              <p className="mt-4 leading-8 text-slate-600">
                {narratives.scienceSummary}
              </p>
            </div>

            <div className="mt-10 rounded-2xl border border-sky-200 bg-sky-50 p-6">
              <div className="text-sm font-semibold uppercase tracking-wide text-sky-900">
                Calidad y confianza
              </div>

              <p className="mt-4 text-sm leading-7 text-sky-900">
                {narratives.labQualitySummary}
              </p>

              {qualitySeals.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {qualitySeals.map((seal) => (
                    <ProductQualityBadge
                      key={seal}
                      value={
                        seal as
                          | "USP_VERIFIED"
                          | "NSF_173"
                          | "GMP"
                          | "THIRD_PARTY_TESTED"
                          | "NONE"
                      }
                    />
                  ))}
                </div>
              ) : null}

              {qualityNotes.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {qualityNotes.map((note, index) => (
                    <div
                      key={`${note}-${index}`}
                      className="rounded-xl bg-white/70 px-4 py-3 text-sm leading-6 text-sky-900"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-semibold text-slate-900">
                Cómo tomarlo
              </h2>
              <p className="mt-4 leading-8 text-slate-600">
                {narratives.howToTake}
              </p>
            </div>

            <div className="mt-10">
              <ProductSafetyPanel
                restrictionsSummary={narratives.restrictionsSummary}
                sideEffectsSummary={narratives.sideEffectsSummary}
                cautions={ingredient.cautions}
              />
            </div>

            <div className="mt-10 rounded-2xl border border-violet-200 bg-violet-50 p-6">
              <div className="text-sm font-semibold uppercase tracking-wide text-violet-900">
                Por qué entra en este tier
              </div>
              <p className="mt-4 text-sm leading-7 text-violet-900">
                {narratives.budgetReason}
              </p>
            </div>

            <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Compatibilidad dentro del comparador
              </div>

              <div className="mt-4 grid gap-3">
                {ingredient.whyMatched.length > 0 ? (
                  ingredient.whyMatched.slice(0, 4).map((reason, index) => (
                    <div
                      key={`${reason}-${index}`}
                      className="rounded-xl bg-white px-4 py-3 text-sm leading-6 text-slate-700"
                    >
                      {reason}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                    Este ingrediente fue incluido dentro del conjunto actual de
                    recomendaciones por su afinidad estimada con tu perfil.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <InfoCard label="Tier" value={translateTier(tier)} />
              <InfoCard label="Precio estimado" value={product.priceLabel} />
              <InfoCard label="Presentación" value={product.presentation} />
              <InfoCard label="Forma" value={translateForm(product.form)} />
              <InfoCard
                label="Porciones"
                value={
                  product.servings != null ? String(product.servings) : "N/A"
                }
              />
              <InfoCard
                label="Costo diario estimado"
                value={
                  product.estimatedCostPerDayUsd != null
                    ? `$${product.estimatedCostPerDayUsd.toFixed(2)}`
                    : "N/A"
                }
              />
            </div>

            {markets.length > 0 ? (
              <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">
                  Mercados disponibles
                </h2>

                <div className="mt-4 flex flex-wrap gap-2">
                  {markets.map((market) => (
                    <span
                      key={market}
                      className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                    >
                      {translateMarket(market)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              Esta información es orientativa y educativa. No sustituye una
              consulta médica, diagnóstico ni tratamiento profesional.
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Precio estimado
              </div>
              <div className="mt-3 text-3xl font-bold">{product.priceLabel}</div>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                Revisa el producto, compara detalles y valida si encaja con tu
                criterio personal antes de tomar cualquier decisión.
              </p>

              {product.buyUrl && product.buyUrl !== "#" ? (
                <a
                  href={product.buyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex w-full justify-center rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Ver producto
                </a>
              ) : null}
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                ¿Por qué llama la atención?
              </h2>

              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                {ingredient.whyMatched.length > 0 ? (
                  ingredient.whyMatched.slice(0, 4).map((reason, index) => (
                    <li key={index}>• {reason}</li>
                  ))
                ) : (
                  <>
                    <li>• Encaja dentro de un ingrediente relevante del perfil.</li>
                    <li>• Puede alinearse con el objetivo principal del usuario.</li>
                    <li>
                      • Ayuda a comparar opciones dentro de una experiencia más
                      estructurada.
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Estado de seguridad
              </h2>

              <div className="mt-4">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    ingredient.safetyDecision === "allow"
                      ? "bg-emerald-100 text-emerald-700"
                      : ingredient.safetyDecision === "allow_with_caution"
                      ? "bg-amber-100 text-amber-700"
                      : ingredient.safetyDecision === "high_caution"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {translateSafetyDecision(ingredient.safetyDecision)}
                </span>
              </div>

              {ingredient.cautions.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {ingredient.cautions.slice(0, 4).map((caution, index) => (
                    <div
                      key={`${caution}-${index}`}
                      className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
                    >
                      {caution}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  No se registraron advertencias destacadas adicionales dentro
                  del comparador actual.
                </p>
              )}
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Siguiente mejor paso
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                Vuelve al comparador para revisar otras opciones del mismo
                ingrediente o explorar ingredientes relacionados con afinidad en
                tu perfil actual.
              </p>

              <div className="mt-5 grid gap-3">
                <Link
                  href="/marketplace"
                  className="inline-flex w-full justify-center rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
                >
                  Volver al comparador
                </Link>

                <Link
                  href="/results"
                  className="inline-flex w-full justify-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Volver a resultados
                </Link>

                <Link
                  href="/pricing"
                  className="inline-flex w-full justify-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ver planes
                </Link>
              </div>
            </div>
          </div>
        </section>

        {relatedSameIngredient.length > 0 && (
          <section className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Otras opciones del mismo ingrediente
                </h2>
                <p className="mt-2 text-slate-600">
                  Compara otras alternativas para el mismo ingrediente en
                  distintos tiers.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {relatedSameIngredient.map((item) => (
                <RelatedProductCard
                  key={item.view.product.slug}
                  slug={item.view.product.slug}
                  title={item.view.product.productName}
                  subtitle={`${item.view.product.brand} · ${translateTier(
                    item.tier
                  )}`}
                  description={item.view.narratives.whyForUser}
                  price={item.view.product.priceLabel}
                />
              ))}
            </div>
          </section>
        )}

        {relatedIngredients.length > 0 && (
          <section className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Ingredientes relacionados
                </h2>
                <p className="mt-2 text-slate-600">
                  Más ingredientes priorizados dentro de tu ecosistema actual de
                  recomendaciones.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {relatedIngredients.map((item) => {
                const relatedProduct =
                  item.options.excellent ??
                  item.options.veryGood ??
                  item.options.good;

                return (
                  <Link
                    key={item.ingredientSlug}
                    href={
                      relatedProduct
                        ? `/marketplace/${relatedProduct.product.slug}`
                        : "/marketplace"
                    }
                    className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap gap-2">
                      <ProductEvidenceBadge evidenceLevel={item.evidenceLevel} />
                    </div>

                    <h3 className="mt-4 text-xl font-semibold text-slate-900">
                      {item.ingredientName}
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      Match score {item.matchScore}/100
                    </p>

                    <p className="mt-4 leading-7 text-slate-600">
                      {item.whyMatched?.[0] ||
                        "Ingrediente relacionado dentro del análisis actual."}
                    </p>

                    {relatedProduct ? (
                      <div className="mt-5 text-lg font-semibold text-slate-900">
                        {relatedProduct.product.productName}
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function RelatedProductCard({
  slug,
  title,
  subtitle,
  description,
  price,
}: {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  price: string;
}) {
  return (
    <Link
      href={`/marketplace/${slug}`}
      className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
    >
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>

      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>

      <p className="mt-4 leading-7 text-slate-600">{description}</p>

      <div className="mt-5 text-lg font-semibold text-slate-900">{price}</div>
    </Link>
  );
}

function translateTier(value: "excellent" | "very_good" | "good") {
  if (value === "excellent") return "Excelente";
  if (value === "very_good") return "Muy buena";
  return "Buena";
}

function translateForm(
  value: "capsule" | "tablet" | "softgel" | "powder" | "liquid" | "gummy"
) {
  if (value === "capsule") return "Cápsula";
  if (value === "tablet") return "Tableta";
  if (value === "softgel") return "Softgel";
  if (value === "powder") return "Polvo";
  if (value === "liquid") return "Líquido";
  return "Gomita";
}

function translateMarket(value: "amazon" | "iherb" | "direct") {
  if (value === "amazon") return "Amazon";
  if (value === "iherb") return "iHerb";
  return "Directo";
}

function translateSafetyDecision(
  value: "allow" | "allow_with_caution" | "high_caution" | "avoid"
) {
  if (value === "allow") return "Permitido";
  if (value === "allow_with_caution") return "Permitido con cautela";
  if (value === "high_caution") return "Alta cautela";
  return "Evitar";
}
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PRODUCTS, type Product } from "../lib/products";
import {
  rankProductsForAssessment,
  type AssessmentProfile,
  type RankedProduct,
} from "../lib/productRanking";
import { supabase } from "../lib/supabase";
import {
  getPlanLabel,
  getPlanLimits,
  getUpgradeTargetLabel,
  normalizePlan,
  type PlanType,
} from "../lib/planLimits";
import { ensureUserProfile, getCurrentUserProfile } from "../lib/profile";
import UpgradePrompt from "../../components/UpgradePrompt";

type CategoryFilter =
  | "all"
  | "energy"
  | "stress"
  | "sleep"
  | "focus"
  | "general";

type PriorityFilter = "all" | "high" | "medium" | "low";

type HealthAssessment = {
  id: number;
  age: string;
  sex: string;
  stress: string;
  sleep: string;
  goal: string;
};

type UserProfileRow = {
  id: string;
  email?: string | null;
  plan?: PlanType | string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function MarketplacePage() {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [latestAssessment, setLatestAssessment] =
    useState<HealthAssessment | null>(null);
  const [rankedProducts, setRankedProducts] = useState<RankedProduct[]>([]);
  const [plan, setPlan] = useState<PlanType>("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null
  );
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadMarketplace() {
      try {
        if (!ignore) {
          setLoading(true);
          setError("");
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          if (!ignore) {
            setPlan("free");
            setSubscriptionStatus(null);
            setHasStripeCustomer(false);
            setLatestAssessment(null);
            setRankedProducts([]);
          }
          return;
        }

        await ensureUserProfile();
        const profile = (await getCurrentUserProfile()) as UserProfileRow | null;
        const currentPlan: PlanType = normalizePlan(profile?.plan);

        const { data, error: assessmentError } = await supabase
          .from("health_assessments")
          .select("id, age, sex, stress, sleep, goal")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (assessmentError) {
          throw assessmentError;
        }

        const latest = data?.[0] ?? null;
        const limits = getPlanLimits(currentPlan);

        if (!ignore) {
          setPlan(currentPlan);
          setSubscriptionStatus(profile?.subscription_status ?? null);
          setHasStripeCustomer(Boolean(profile?.stripe_customer_id));
          setLatestAssessment(latest);

          if (latest && limits.marketplaceMode !== "basic") {
            const ranked = rankProductsForAssessment(
              latest as AssessmentProfile
            );
            setRankedProducts(ranked);
          } else {
            setRankedProducts([]);
          }
        }
      } catch (err: any) {
        console.error("Error loading marketplace:", err);

        if (!ignore) {
          setError(err?.message || "No se pudo cargar el marketplace.");
          setPlan("free");
          setSubscriptionStatus(null);
          setHasStripeCustomer(false);
          setLatestAssessment(null);
          setRankedProducts([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadMarketplace();

    return () => {
      ignore = true;
    };
  }, []);

  const planLimits = useMemo(() => getPlanLimits(plan), [plan]);
  const smartMarketplaceEnabled = planLimits.marketplaceMode !== "basic";
  const premiumMarketplaceEnabled = planLimits.marketplaceMode === "premium";
  const nextRecommendedPlan =
    plan !== "premium" ? getUpgradeTargetLabel(plan) : null;

  const marketplaceModeLabel = useMemo(() => {
    if (premiumMarketplaceEnabled) return "Inteligente Premium";
    if (smartMarketplaceEnabled) return "Inteligente";
    return "General";
  }, [premiumMarketplaceEnabled, smartMarketplaceEnabled]);

  const subscriptionStatusLabel = useMemo(() => {
    if (!subscriptionStatus) return "Sin suscripción activa";
    if (subscriptionStatus === "active") return "Activa";
    if (subscriptionStatus === "trialing") return "En prueba";
    if (subscriptionStatus === "past_due") return "Pago pendiente";
    if (subscriptionStatus === "payment_failed") return "Pago fallido";
    if (subscriptionStatus === "canceled") return "Cancelada";
    if (subscriptionStatus === "checkout_completed") {
      return "Procesando activación";
    }
    return subscriptionStatus;
  }, [subscriptionStatus]);

  const filteredProducts = useMemo(() => {
    const baseProducts =
      smartMarketplaceEnabled && rankedProducts.length > 0
        ? rankedProducts
        : PRODUCTS.map((product) => ({
            ...product,
            rankScore: 0,
            reasons: [],
          }));

    return baseProducts.filter((product) => {
      const matchCategory =
        category === "all" ? true : product.category === category;

      const matchPriority =
        priority === "all" ? true : product.priority === priority;

      const term = search.trim().toLowerCase();

      const matchSearch =
        term.length === 0
          ? true
          : [
              product.productName,
              product.brand,
              product.supplementName,
              translateCategory(product.category),
            ]
              .join(" ")
              .toLowerCase()
              .includes(term);

      return matchCategory && matchPriority && matchSearch;
    });
  }, [category, priority, search, rankedProducts, smartMarketplaceEnabled]);

  const topRecommended = smartMarketplaceEnabled
    ? filteredProducts.slice(0, 3)
    : [];
  const remainingProducts = smartMarketplaceEnabled
    ? filteredProducts.slice(3)
    : filteredProducts;

  const marketplaceNarrative = useMemo(() => {
    if (premiumMarketplaceEnabled) {
      return "Tu experiencia actual te permite explorar recomendaciones mejor priorizadas, con una sensación más premium y más alineada con tu perfil.";
    }

    if (smartMarketplaceEnabled) {
      return "Tu marketplace ya usa señales de tu perfil para ayudarte a descubrir opciones con más intención y más contexto.";
    }

    return "Ahora mismo estás viendo el catálogo general. El verdadero salto aparece cuando el marketplace deja de ser genérico y empieza a responder a tu perfil.";
  }, [premiumMarketplaceEnabled, smartMarketplaceEnabled]);

  const personalizationNarrative = useMemo(() => {
    if (premiumMarketplaceEnabled && latestAssessment) {
      return "Tu catálogo no solo muestra productos: intenta priorizar mejor lo que podría tener más afinidad con tu momento actual.";
    }

    if (smartMarketplaceEnabled && latestAssessment) {
      return "Ya estás viendo una versión más inteligente del catálogo, usando señales de tu último análisis para ordenar mejor las recomendaciones.";
    }

    if (smartMarketplaceEnabled) {
      return "Tu plan ya permite una experiencia más inteligente, pero hará más sentido cuando la plataforma tenga un análisis reciente para trabajar.";
    }

    return "El catálogo base te permite explorar, pero todavía no se adapta a lo que más te conviene según tu objetivo y tus señales actuales.";
  }, [premiumMarketplaceEnabled, smartMarketplaceEnabled, latestAssessment]);

  const canShowUpgradePrompt = plan !== "premium";
  const hasAssessmentForRanking = Boolean(latestAssessment);

  const experienceNarrative = useMemo(() => {
    if (plan === "premium") {
      return "Ya estás en la versión más completa del marketplace, con la capa más profunda de personalización disponible.";
    }

    if (plan === "pro") {
      return hasAssessmentForRanking
        ? "Tu marketplace ya se siente mucho más útil porque el orden empieza a responder a tu perfil."
        : "Tu plan ya permite una experiencia más inteligente. En cuanto tengas un análisis reciente, el catálogo podrá ordenarse con más intención.";
    }

    return "Tu experiencia actual te deja explorar el catálogo, pero todavía no convierte la tienda en una herramienta realmente personalizada.";
  }, [plan, hasAssessmentForRanking]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
            VitaSmart AI · Marketplace
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full bg-slate-900 px-4 py-1 text-sm font-semibold text-white">
              Plan actual: {getPlanLabel(plan)}
            </div>

            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
              Modo: {marketplaceModeLabel}
            </div>

            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
              Estado: {subscriptionStatusLabel}
            </div>
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">
            Marketplace inteligente de suplementos
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Descubre suplementos por categoría, prioridad y afinidad con tu
            perfil actual. Cuanto mejor te conoce la plataforma, más sentido
            tiene el orden del catálogo.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-sm font-semibold text-slate-900">
              Lectura rápida de tu experiencia actual
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {marketplaceNarrative}
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <div className="text-sm font-semibold text-violet-900">
              Cómo se siente este marketplace hoy para ti
            </div>
            <p className="mt-2 text-sm leading-6 text-violet-800">
              {personalizationNarrative}
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">
              Lectura rápida del nivel de experiencia
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {experienceNarrative}
            </p>
          </div>

          {smartMarketplaceEnabled && latestAssessment ? (
            <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              Estás viendo recomendaciones priorizadas según tu último análisis:
              objetivo <strong>{translateGoal(latestAssessment.goal)}</strong>,
              estrés <strong>{translateStress(latestAssessment.stress)}</strong>,
              sueño <strong>{translateSleep(latestAssessment.sleep)}</strong>.
            </div>
          ) : smartMarketplaceEnabled && !latestAssessment ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Tu plan ya permite una experiencia más inteligente, pero todavía no
              hay un análisis reciente para personalizar el ranking.
              <div className="mt-3">
                <Link
                  href="/quiz"
                  className="inline-flex rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700"
                >
                  Hacer análisis
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-semibold">
                Marketplace inteligente bloqueado para tu plan actual
              </div>
              <div className="mt-1">
                En el plan Free puedes explorar el catálogo general. Para
                desbloquear recomendaciones personalizadas según tu análisis,
                actualiza a Pro o Premium.
              </div>

              {nextRecommendedPlan && (
                <div className="mt-2">
                  Próximo salto recomendado:{" "}
                  <strong>{nextRecommendedPlan}</strong>.
                </div>
              )}

              <div className="mt-3">
                <Link
                  href="/pricing"
                  className="inline-flex rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700"
                >
                  Ver planes
                </Link>
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <StatCard
              title="Productos"
              value={`${PRODUCTS.length}`}
              subtitle="Catálogo disponible"
            />
            <StatCard
              title="Categorías"
              value="5"
              subtitle="Energía, estrés, sueño, enfoque y general"
            />
            <StatCard
              title="Modo actual"
              value={
                smartMarketplaceEnabled
                  ? hasAssessmentForRanking
                    ? "Personalizado"
                    : "Inteligente"
                  : "General"
              }
              subtitle={
                smartMarketplaceEnabled
                  ? "Orden con más contexto"
                  : "Sin personalización por perfil"
              }
            />
            <StatCard
              title="Experiencia"
              value={premiumMarketplaceEnabled ? "Premium" : "Base"}
              subtitle="Nivel actual del catálogo"
            />
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Buscar producto
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ej: Omega, magnesio, energía..."
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryFilter)}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-slate-900"
              >
                <option value="all">Todas</option>
                <option value="energy">Energía</option>
                <option value="stress">Estrés</option>
                <option value="sleep">Sueño</option>
                <option value="focus">Enfoque</option>
                <option value="general">Salud general</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityFilter)}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-slate-900"
              >
                <option value="all">Todas</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-600">
              Cargando marketplace inteligente...
            </p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm">
            <h3 className="text-xl font-semibold text-red-900">
              No se pudo cargar el marketplace
            </h3>
            <p className="mt-3 text-red-700">{error}</p>
          </div>
        ) : (
          <>
            {smartMarketplaceEnabled && (
              <section className="mt-8">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Top recomendados para ti
                    </h2>
                    <p className="mt-2 text-slate-600">
                      Esta selección busca poner primero lo que podría resultar
                      más relevante para tu perfil actual.
                    </p>
                  </div>

                  <div className="text-sm text-slate-500">
                    {topRecommended.length} producto(s)
                  </div>
                </div>

                {topRecommended.length === 0 ? (
                  <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                    <h3 className="text-xl font-semibold text-slate-900">
                      No encontramos recomendaciones personalizadas
                    </h3>
                    <p className="mt-3 text-slate-600">
                      {hasAssessmentForRanking
                        ? "Ajusta los filtros para encontrar coincidencias más útiles."
                        : "Haz un análisis para que el ranking tenga más contexto."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {topRecommended.map((product, index) => (
                      <ProductCard
                        key={product.slug}
                        product={product}
                        rankPosition={index + 1}
                        highlight
                        showReasons
                        premiumMarketplaceEnabled={premiumMarketplaceEnabled}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {!smartMarketplaceEnabled && (
              <section className="mt-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Catálogo general disponible
                  </h2>
                  <p className="mt-3 text-slate-600">
                    Estás viendo el catálogo base del marketplace. Las
                    recomendaciones inteligentes según tu análisis están
                    disponibles en los planes Pro y Premium.
                  </p>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-sm font-semibold text-slate-900">
                      Lo que desbloqueas al mejorar tu plan
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Un catálogo que deja de ser genérico y empieza a sentirse
                      alineado con tu objetivo, tu estrés y tu descanso.
                    </p>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/pricing"
                      className="inline-flex rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Desbloquear marketplace inteligente
                    </Link>

                    <Link
                      href="/quiz"
                      className="inline-flex rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
                    >
                      Hacer análisis
                    </Link>
                  </div>
                </div>
              </section>
            )}

            <section className="mt-12">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {smartMarketplaceEnabled
                      ? "Más suplementos del catálogo"
                      : "Catálogo completo"}
                  </h2>
                  <p className="mt-2 text-slate-600">
                    Sigue explorando opciones y compara cuál encaja mejor con lo
                    que estás buscando.
                  </p>
                </div>

                <div className="text-sm text-slate-500">
                  {remainingProducts.length} producto(s)
                </div>
              </div>

              {remainingProducts.length === 0 ? (
                <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                  <h3 className="text-xl font-semibold text-slate-900">
                    No hay más productos
                  </h3>
                  <p className="mt-3 text-slate-600">
                    Cambia los filtros para ver más opciones.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {remainingProducts.map((product, index) => (
                    <ProductCard
                      key={product.slug}
                      product={product}
                      rankPosition={
                        smartMarketplaceEnabled ? index + 4 : index + 1
                      }
                      showReasons={smartMarketplaceEnabled}
                      premiumMarketplaceEnabled={premiumMarketplaceEnabled}
                    />
                  ))}
                </div>
              )}
            </section>

            {canShowUpgradePrompt && (
              <section className="mt-8">
                <UpgradePrompt currentPlan={plan} context="marketplace" />
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ProductCard({
  product,
  rankPosition,
  highlight,
  showReasons = true,
  premiumMarketplaceEnabled = false,
}: {
  product: RankedProduct;
  rankPosition: number;
  highlight?: boolean;
  showReasons?: boolean;
  premiumMarketplaceEnabled?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl p-6 shadow-sm ring-1 transition ${
        highlight
          ? "border border-blue-200 bg-white ring-blue-200"
          : "bg-white ring-slate-200 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <CategoryBadge value={product.category} />
          <PriorityBadge value={product.priority} />
          {premiumMarketplaceEnabled && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Premium
            </span>
          )}
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
          {rankPosition}
        </div>
      </div>

      {highlight && (
        <div className="mt-3 text-xs font-semibold text-blue-600">
          Recomendado según tu perfil
        </div>
      )}

      <h3 className="mt-5 text-xl font-semibold text-slate-900">
        {product.productName}
      </h3>

      <p className="mt-1 text-sm text-slate-500">{product.brand}</p>

      <p className="mt-4 text-slate-600">{product.supplementName}</p>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-900">
          ¿Por qué aparece aquí?
        </div>

        {showReasons && product.reasons.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {product.reasons.map((reason, index) => (
              <li key={index} className="text-sm text-slate-600">
                • {reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Producto disponible dentro del catálogo general.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-4">
        <div className="text-sm text-slate-500">Precio estimado</div>
        <div className="mt-1 text-lg font-semibold text-slate-900">
          {product.price}
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        <Link
          href={`/marketplace/${product.slug}`}
          className="inline-flex w-full justify-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Ver detalle
        </Link>

        <a
          href={product.buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full justify-center rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
        >
          Ver producto
        </a>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-600">{subtitle}</div>
    </div>
  );
}

function CategoryBadge({ value }: { value: Product["category"] }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      {translateCategory(value)}
    </span>
  );
}

function PriorityBadge({ value }: { value: Product["priority"] }) {
  const styles =
    value === "high"
      ? "bg-red-100 text-red-700"
      : value === "medium"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-700";

  const label =
    value === "high"
      ? "Prioridad alta"
      : value === "medium"
      ? "Prioridad media"
      : "Prioridad baja";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {label}
    </span>
  );
}

function translateCategory(value: Product["category"]) {
  const labels: Record<Product["category"], string> = {
    energy: "Energía",
    stress: "Estrés",
    sleep: "Sueño",
    focus: "Enfoque",
    general: "Salud general",
  };

  return labels[value];
}

function translateGoal(value: string) {
  if (value === "energy") return "Más energía";
  if (value === "focus") return "Mejor concentración";
  if (value === "sleep") return "Dormir mejor";
  if (value === "health") return "Salud general";
  return value || "-";
}

function translateStress(value: string) {
  if (value === "low") return "Bajo";
  if (value === "medium") return "Medio";
  if (value === "high") return "Alto";
  return value || "-";
}

function translateSleep(value: string) {
  if (value === "5") return "Menos de 5 horas";
  if (value === "6") return "6 horas";
  if (value === "7") return "7 horas";
  if (value === "8") return "8 o más horas";
  return value || "-";
}
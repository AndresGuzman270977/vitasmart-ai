"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ensureUserProfile, getCurrentUserProfile } from "../lib/profile";
import {
  getPlanLabel,
  getPlanLimits,
  getUpgradeTargetLabel,
  normalizePlan,
  type PlanType,
} from "../lib/planLimits";
import UpgradePrompt from "../../components/UpgradePrompt";
import MarketplaceHero from "../../components/marketplace/MarketplaceHero";
import IngredientHighlightCard from "../../components/marketplace/IngredientHighlightCard";
import BudgetComparisonGrid from "../../components/marketplace/BudgetComparisonGrid";
import RelatedRecommendationsSection from "../../components/marketplace/RelatedRecommendationsSection";

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
  plan: PlanType;
  requestedAiMode: "basic" | "advanced";
  appliedAiMode: "basic" | "advanced";
  advancedAI: boolean;
  wasDowngraded: boolean;
  upgradeRequired: boolean;
  upgradeMessage: string | null;
  assessmentVersion: string;
  scores: {
    healthScore: number;
    sleepScore: number | null;
    stressScore: number | null;
    energyScore: number | null;
    focusScore: number | null;
    metabolicScore: number | null;
  };
  confidence: {
    confidenceLevel: "high" | "moderate" | "limited";
    confidenceExplanation: string;
    completenessScore: number;
  };
  summaries: {
    executiveSummary: string;
    clinicalStyleSummary: string;
    scoreNarrative: string;
    professionalFollowUpAdvice: string;
  };
  insights: {
    strengths: string[];
    mainDrivers: string[];
    priorityActions: string[];
    riskSignals: string[];
  };
  userNeeds: {
    dominantNeeds: string[];
    secondaryNeeds: string[];
  };
  advancedRecommendations: string[];
  productRecommendations: TopIngredientRecommendationView[];
};

type AssessmentInput = {
  age?: number;
  sex?: "male" | "female";
  stressLevel?: number;
  sleepHours?: number;
  mainGoal?: string;
};

type QuizDraft = {
  plan?: PlanType;
  requestedAiMode?: "basic" | "advanced";
  assessment: AssessmentInput;
  biomarkers?: Record<string, unknown>;
};

type CategoryFilter =
  | "all"
  | "energy"
  | "stress"
  | "sleep"
  | "focus"
  | "general"
  | "metabolic"
  | "recovery";

type EvidenceFilter = "all" | "high" | "moderate" | "limited";
type TierFilter = "all" | "excellent" | "very_good" | "good";

const QUIZ_STORAGE_KEY = "vitaSmartQuizDraft";
const LAST_ANALYSIS_CACHE_KEY = "vitaSmartLastHealthAnalysis";

export default function MarketplacePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [plan, setPlan] = useState<PlanType>("free");
  const [analysis, setAnalysis] = useState<HealthAnalysisResponse | null>(null);
  const [draft, setDraft] = useState<QuizDraft | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [evidence, setEvidence] = useState<EvidenceFilter>("all");
  const [tier, setTier] = useState<TierFilter>("all");
  const [selectedIngredientSlug, setSelectedIngredientSlug] = useState<
    string | null
  >(null);

  useEffect(() => {
    let ignore = false;

    async function loadMarketplace() {
      try {
        if (!ignore) {
          setLoading(true);
          setError("");
        }

        let resolvedPlan: PlanType = "free";

        try {
          await ensureUserProfile();
          const profile = await getCurrentUserProfile();
          resolvedPlan = normalizePlan(profile?.plan);
        } catch (err) {
          console.error("Error resolving marketplace plan:", err);
        }

        if (!ignore) {
          setPlan(resolvedPlan);
        }

        let parsedDraft: QuizDraft | null = null;

        if (typeof window !== "undefined") {
          const rawDraft = sessionStorage.getItem(QUIZ_STORAGE_KEY);
          if (rawDraft) {
            try {
              parsedDraft = JSON.parse(rawDraft) as QuizDraft;
            } catch {
              parsedDraft = null;
            }
          }
        }

        if (!ignore) {
          setDraft(parsedDraft);
        }

        let cachedAnalysis: HealthAnalysisResponse | null = null;

        if (typeof window !== "undefined") {
          const rawAnalysis = sessionStorage.getItem(LAST_ANALYSIS_CACHE_KEY);
          if (rawAnalysis) {
            try {
              cachedAnalysis = JSON.parse(rawAnalysis) as HealthAnalysisResponse;
            } catch {
              cachedAnalysis = null;
            }
          }
        }

        if (!cachedAnalysis && parsedDraft?.assessment) {
          const response = await fetch("/api/health-analysis", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              plan: parsedDraft.plan ?? resolvedPlan,
              requestedAiMode: parsedDraft.requestedAiMode ?? "advanced",
              assessment: parsedDraft.assessment,
              biomarkers: parsedDraft.biomarkers,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data?.error || "No se pudo generar el marketplace.");
          }

          cachedAnalysis = data as HealthAnalysisResponse;

          if (typeof window !== "undefined") {
            sessionStorage.setItem(
              LAST_ANALYSIS_CACHE_KEY,
              JSON.stringify(cachedAnalysis)
            );
          }
        }

        if (!ignore) {
          setAnalysis(cachedAnalysis);
        }
      } catch (err: any) {
        console.error("Marketplace error:", err);

        if (!ignore) {
          setError(err?.message || "No se pudo cargar el marketplace.");
          setAnalysis(null);
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

  const marketplaceNarrative = useMemo(() => {
    if (premiumMarketplaceEnabled) {
      return "Tu experiencia actual te permite explorar recomendaciones mejor priorizadas, comparadas por presupuesto y presentadas con una narrativa mucho más útil, convincente y premium.";
    }

    if (smartMarketplaceEnabled) {
      return "Tu marketplace ya usa señales de tu perfil para ayudarte a descubrir opciones con más intención y más contexto, aunque todavía no en el nivel más premium.";
    }

    return "Ahora mismo estás viendo la puerta de entrada. El verdadero salto ocurre cuando el marketplace deja de ser genérico y comienza a responder a tu perfil, a tus prioridades y a tu objetivo principal.";
  }, [premiumMarketplaceEnabled, smartMarketplaceEnabled]);

  const personalizationNarrative = useMemo(() => {
    if (premiumMarketplaceEnabled && analysis?.productRecommendations?.length) {
      return "Tu catálogo no solo muestra productos: intenta ordenar mejor qué ingrediente y qué nivel de producto podría tener más sentido para tu momento actual.";
    }

    if (smartMarketplaceEnabled && analysis?.productRecommendations?.length) {
      return "Ya estás viendo una versión más inteligente del catálogo, usando señales de tu último análisis para ordenar mejor las recomendaciones.";
    }

    if (smartMarketplaceEnabled) {
      return "Tu plan ya permite una experiencia más inteligente, pero hará mucho más sentido cuando exista un análisis reciente y una selección más profunda de recomendaciones.";
    }

    return "El catálogo base te permite explorar, pero todavía no se adapta a lo que más te conviene según tu objetivo, tu descanso, tu energía o tu perfil actual.";
  }, [premiumMarketplaceEnabled, smartMarketplaceEnabled, analysis]);

  const experienceNarrative = useMemo(() => {
    if (plan === "premium") {
      return "Ya estás en la versión más completa del marketplace, con la capa más profunda de personalización disponible.";
    }

    if (plan === "pro") {
      return analysis?.productRecommendations?.length
        ? "Tu marketplace ya se siente bastante más útil porque el orden empieza a responder a tu perfil y a una lógica de comparación más seria."
        : "Tu plan ya permite una experiencia más inteligente. En cuanto tengas un análisis reciente, el catálogo podrá sentirse mucho más personalizado.";
    }

    return "Tu experiencia actual te deja explorar el catálogo, pero todavía no convierte la tienda en una herramienta realmente personalizada.";
  }, [plan, analysis]);

  const rawRecommendations = analysis?.productRecommendations || [];

  const filteredIngredients = useMemo(() => {
    return rawRecommendations.filter((item) => {
      const text = search.trim().toLowerCase();

      const optionList = [
        item.options.excellent,
        item.options.veryGood,
        item.options.good,
      ].filter(Boolean) as ProductRecommendationView[];

      const matchesSearch =
        text.length === 0
          ? true
          : [
              item.ingredientName,
              item.evidenceSummary || "",
              item.scientificContext || "",
              ...item.whyMatched,
              ...optionList.map((opt) => opt.product.productName),
              ...optionList.map((opt) => opt.product.brand),
            ]
              .join(" ")
              .toLowerCase()
              .includes(text);

      const inferredCategory = inferCategoryFromIngredient(item.ingredientName);

      const matchesCategory =
        category === "all" ? true : inferredCategory === category;

      const matchesEvidence =
        evidence === "all" ? true : item.evidenceLevel === evidence;

      const optionTiers = optionList.map((opt) => opt.product.budgetTier);
      const matchesTier =
        tier === "all" ? true : optionTiers.includes(tier);

      return matchesSearch && matchesCategory && matchesEvidence && matchesTier;
    });
  }, [rawRecommendations, search, category, evidence, tier]);

  useEffect(() => {
    if (!filteredIngredients.length) {
      setSelectedIngredientSlug(null);
      return;
    }

    if (
      selectedIngredientSlug &&
      filteredIngredients.some(
        (item) => item.ingredientSlug === selectedIngredientSlug
      )
    ) {
      return;
    }

    setSelectedIngredientSlug(filteredIngredients[0].ingredientSlug);
  }, [filteredIngredients, selectedIngredientSlug]);

  const selectedIngredient = useMemo(() => {
    if (filteredIngredients.length === 0) return null;

    if (selectedIngredientSlug) {
      const found = filteredIngredients.find(
        (item) => item.ingredientSlug === selectedIngredientSlug
      );
      if (found) return found;
    }

    return filteredIngredients[0];
  }, [filteredIngredients, selectedIngredientSlug]);

  const topRecommended = useMemo(() => {
    if (!smartMarketplaceEnabled) return [];
    return filteredIngredients.slice(0, 3);
  }, [filteredIngredients, smartMarketplaceEnabled]);

  const remainingIngredients = useMemo(() => {
    if (!smartMarketplaceEnabled) return filteredIngredients;
    return filteredIngredients.slice(3);
  }, [filteredIngredients, smartMarketplaceEnabled]);

  const relatedIngredients = useMemo(() => {
    if (!selectedIngredient) return [];
    return filteredIngredients.filter(
      (item) => item.ingredientSlug !== selectedIngredient.ingredientSlug
    );
  }, [filteredIngredients, selectedIngredient]);

  const hasAssessmentForRanking = Boolean(draft?.assessment || analysis);
  const canShowUpgradePrompt = plan !== "premium";

  const latestContextNarrative = useMemo(() => {
    if (!draft?.assessment) {
      return "Todavía no hay suficiente contexto del cuestionario para describir mejor el perfil actual.";
    }

    return `Objetivo ${translateGoal(
      draft.assessment.mainGoal || ""
    )}, estrés ${translateStressLevel(
      draft.assessment.stressLevel
    )} y sueño ${translateSleepHours(
      draft.assessment.sleepHours
    )}.`;
  }, [draft]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-7xl">
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
              Personalización:{" "}
              {analysis?.productRecommendations?.length
                ? "Activa"
                : "Sin contexto suficiente"}
            </div>
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">
            Marketplace inteligente de suplementos
          </h1>

          <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-600">
            Descubre ingredientes y productos organizados por prioridad,
            presupuesto, contexto de calidad, narrativa científica resumida y
            afinidad estimada con tu perfil actual.
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

          {smartMarketplaceEnabled && analysis?.productRecommendations?.length ? (
            <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              Estás viendo recomendaciones priorizadas según tu análisis más reciente:{" "}
              <strong>{latestContextNarrative}</strong>
            </div>
          ) : smartMarketplaceEnabled && !analysis?.productRecommendations?.length ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Tu plan ya permite una experiencia más inteligente, pero todavía no
              hay un análisis reciente con suficiente contexto para personalizar el ranking.
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

          <div className="mt-8 grid gap-4 md:grid-cols-5">
            <StatCard
              title="Ingredientes"
              value={`${rawRecommendations.length}`}
              subtitle="Recomendaciones actualmente disponibles"
            />
            <StatCard
              title="Comparación"
              value="3 tiers"
              subtitle="Excelente, Muy buena y Buena"
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
              subtitle="Nivel actual del marketplace"
            />
            <StatCard
              title="Filtrados"
              value={`${filteredIngredients.length}`}
              subtitle="Ingredientes visibles con filtros actuales"
            />
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-4 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Buscar ingrediente o producto
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
                <option value="metabolic">Metabólico</option>
                <option value="recovery">Recuperación</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Evidencia
              </label>
              <select
                value={evidence}
                onChange={(e) => setEvidence(e.target.value as EvidenceFilter)}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-slate-900"
              >
                <option value="all">Todas</option>
                <option value="high">Alta</option>
                <option value="moderate">Moderada</option>
                <option value="limited">Limitada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Tier disponible
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as TierFilter)}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-slate-900"
              >
                <option value="all">Todos</option>
                <option value="excellent">Excelente</option>
                <option value="very_good">Muy buena</option>
                <option value="good">Buena</option>
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
            {smartMarketplaceEnabled && topRecommended.length > 0 && (
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
                    {topRecommended.length} ingrediente(s)
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {topRecommended.map((item, index) => {
                    const selected =
                      item.options.excellent ??
                      item.options.veryGood ??
                      item.options.good;

                    return (
                      <button
                        key={item.ingredientSlug}
                        type="button"
                        onClick={() =>
                          setSelectedIngredientSlug(item.ingredientSlug)
                        }
                        className={`rounded-3xl p-6 text-left shadow-sm ring-1 transition ${
                          selectedIngredient?.ingredientSlug === item.ingredientSlug
                            ? "border border-blue-200 bg-white ring-blue-200"
                            : "bg-white ring-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {item.evidenceLevel
                                ? translateEvidence(item.evidenceLevel)
                                : "Sin clasificar"}
                            </span>

                            {selected && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {translateTier(selected.product.budgetTier)}
                              </span>
                            )}
                          </div>

                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                            {index + 1}
                          </div>
                        </div>

                        <div className="mt-3 text-xs font-semibold text-blue-600">
                          Recomendado según tu perfil
                        </div>

                        <h3 className="mt-5 text-xl font-semibold text-slate-900">
                          {item.ingredientName}
                        </h3>

                        <p className="mt-2 text-sm text-slate-600">
                          Match score: <strong>{item.matchScore}/100</strong>
                        </p>

                        <div className="mt-5 rounded-xl bg-slate-50 p-4">
                          <div className="text-sm font-semibold text-slate-900">
                            ¿Por qué aparece aquí?
                          </div>

                          <ul className="mt-2 space-y-2">
                            {item.whyMatched.slice(0, 3).map((reason, idx) => (
                              <li key={idx} className="text-sm text-slate-600">
                                • {reason}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {selected ? (
                          <div className="mt-5 rounded-xl bg-slate-50 p-4">
                            <div className="text-sm text-slate-500">
                              Producto destacado
                            </div>
                            <div className="mt-1 text-lg font-semibold text-slate-900">
                              {selected.product.productName}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">
                              {selected.product.brand}
                            </div>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {selectedIngredient ? (
              <>
                <div className="mt-8">
                  <MarketplaceHero
                    plan={plan}
                    personalized={smartMarketplaceEnabled}
                    ingredientName={selectedIngredient.ingredientName}
                  />
                </div>

                <div className="mt-8">
                  <IngredientHighlightCard item={selectedIngredient} />
                </div>

                <section className="mt-8">
                  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        Comparador principal
                      </h2>
                      <p className="mt-2 text-slate-600">
                        Compara tres niveles de producto para el ingrediente
                        actualmente priorizado.
                      </p>
                    </div>

                    <div className="text-sm text-slate-500">
                      {selectedIngredient.ingredientName}
                    </div>
                  </div>

                  <BudgetComparisonGrid ingredient={selectedIngredient} />
                </section>

                <section className="mt-12">
                  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        Selector de ingrediente
                      </h2>
                      <p className="mt-2 text-slate-600">
                        Cambia entre ingredientes priorizados y revisa su
                        comparador de producto correspondiente.
                      </p>
                    </div>

                    <div className="text-sm text-slate-500">
                      {filteredIngredients.length} ingrediente(s)
                    </div>
                  </div>

                  {filteredIngredients.length === 0 ? (
                    <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                      <h3 className="text-xl font-semibold text-slate-900">
                        No encontramos ingredientes con esos filtros
                      </h3>
                      <p className="mt-3 text-slate-600">
                        Ajusta la búsqueda o los filtros para encontrar más opciones.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {filteredIngredients.map((item, index) => {
                        const selected =
                          item.options.excellent ??
                          item.options.veryGood ??
                          item.options.good;

                        return (
                          <button
                            key={item.ingredientSlug}
                            type="button"
                            onClick={() =>
                              setSelectedIngredientSlug(item.ingredientSlug)
                            }
                            className={`rounded-3xl p-6 text-left shadow-sm ring-1 transition ${
                              selectedIngredient.ingredientSlug ===
                              item.ingredientSlug
                                ? "border border-blue-200 bg-white ring-blue-200"
                                : "bg-white ring-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                  {translateEvidence(
                                    item.evidenceLevel || "limited"
                                  )}
                                </span>

                                {selected && (
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    {translateTier(selected.product.budgetTier)}
                                  </span>
                                )}
                              </div>

                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                                {index + 1}
                              </div>
                            </div>

                            <h3 className="mt-5 text-xl font-semibold text-slate-900">
                              {item.ingredientName}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              Score {item.matchScore}/100
                            </p>

                            <div className="mt-4 rounded-xl bg-slate-50 p-4">
                              <div className="text-sm font-semibold text-slate-900">
                                Resumen rápido
                              </div>
                              <p className="mt-2 text-sm text-slate-600">
                                {item.whyMatched?.[0] ||
                                  "Ingrediente disponible dentro del catálogo actual."}
                              </p>
                            </div>

                            {selected ? (
                              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                                <div className="text-sm text-slate-500">
                                  Producto visible
                                </div>
                                <div className="mt-1 text-lg font-semibold text-slate-900">
                                  {selected.product.productName}
                                </div>
                                <div className="mt-1 text-sm text-slate-600">
                                  {selected.product.brand}
                                </div>
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                {relatedIngredients.length > 0 && (
                  <section className="mt-12">
                    <RelatedRecommendationsSection items={relatedIngredients} />
                  </section>
                )}

                {remainingIngredients.length > 0 && (
                  <section className="mt-12 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                          Más ingredientes del catálogo actual
                        </h2>
                        <p className="mt-2 text-slate-600">
                          Ingredientes que siguen dentro del perfil actual pero no están arriba del todo en tu selección visible.
                        </p>
                      </div>

                      <div className="text-sm text-slate-500">
                        {remainingIngredients.length} ingrediente(s)
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {remainingIngredients.map((item) => (
                        <button
                          key={item.ingredientSlug}
                          type="button"
                          onClick={() =>
                            setSelectedIngredientSlug(item.ingredientSlug)
                          }
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-white"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-lg font-semibold text-slate-900">
                              {item.ingredientName}
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                              {item.matchScore}/100
                            </span>
                          </div>

                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {item.whyMatched?.[0] ||
                              "Ingrediente visible dentro del catálogo actual."}
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <section className="mt-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Catálogo base disponible
                  </h2>
                  <p className="mt-3 text-slate-600">
                    Todavía no hay suficiente contexto para construir un comparador
                    premium completo. Haz un análisis reciente para activar la
                    experiencia personalizada.
                  </p>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/quiz"
                      className="inline-flex rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
                    >
                      Hacer análisis
                    </Link>

                    <Link
                      href="/results"
                      className="inline-flex rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Volver a resultados
                    </Link>
                  </div>
                </div>
              </section>
            )}

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

function inferCategoryFromIngredient(name: string): CategoryFilter {
  const normalized = name.toLowerCase();

  if (normalized.includes("magnesium")) return "sleep";
  if (normalized.includes("melatonin")) return "sleep";
  if (normalized.includes("theanine")) return "focus";
  if (normalized.includes("rhodiola")) return "energy";
  if (normalized.includes("coq10")) return "energy";
  if (normalized.includes("omega")) return "general";
  if (normalized.includes("vitamin d")) return "general";
  if (normalized.includes("ashwagandha")) return "stress";
  if (normalized.includes("glycine")) return "recovery";
  if (normalized.includes("electrolyte")) return "recovery";
  if (normalized.includes("probiotic")) return "general";

  return "general";
}

function translateGoal(value: string) {
  if (value === "energy") return "Más energía";
  if (value === "focus") return "Mejor concentración";
  if (value === "sleep") return "Dormir mejor";
  if (value === "general_health") return "Salud general";
  if (value === "weight") return "Peso / soporte metabólico";
  if (value === "recovery") return "Recuperación";
  return value || "-";
}

function translateStressLevel(value?: number) {
  if (!value) return "-";
  if (value <= 2) return "Bajo";
  if (value === 3) return "Medio";
  return "Alto";
}

function translateSleepHours(value?: number) {
  if (value == null) return "-";
  if (value < 5) return "Menos de 5 horas";
  if (value < 6.5) return "6 horas aprox.";
  if (value < 7.5) return "7 horas aprox.";
  return "8 o más horas";
}

function translateTier(value: "excellent" | "very_good" | "good") {
  if (value === "excellent") return "Excelente";
  if (value === "very_good") return "Muy buena";
  return "Buena";
}

function translateEvidence(value: "high" | "moderate" | "limited") {
  if (value === "high") return "Evidencia alta";
  if (value === "moderate") return "Evidencia moderada";
  return "Evidencia limitada";
}
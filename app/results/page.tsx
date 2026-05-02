"use client";

import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { saveAssessment, type AssessmentAiMode } from "../lib/saveAssessment";
import { resolveViewerState } from "../lib/viewer";
import {
  getPlanLimits,
  normalizePlan,
  type PlanType,
} from "../lib/planLimits";
import PremiumGate from "../../components/PremiumGate";
import UpgradePrompt from "../../components/UpgradePrompt";
import ResultSubscoresGrid from "../../components/health/ResultSubscoresGrid";
import ResultInsightsPanel from "../../components/health/ResultInsightsPanel";
import FollowUpPanel from "../../components/health/FollowUpPanel";

type ConfidenceLevel = "high" | "moderate" | "limited";
type RequestedAiMode = "basic" | "advanced";
type AppliedAiMode = "basic" | "advanced";

type AssessmentInput = {
  age?: number;
  sex?: "male" | "female";
  weightKg?: number;
  heightCm?: number;
  waistCm?: number;
  stressLevel?: number;
  sleepHours?: number;
  sleepQuality?: number;
  fatigueLevel?: number;
  focusDifficulty?: number;
  physicalActivity?: number;
  alcoholUse?: number;
  smokingStatus?: string;
  sunExposure?: number;
  hydrationLevel?: number;
  ultraProcessedFoodLevel?: number;
  bloodPressureKnown?: boolean;
  systolicBp?: number;
  diastolicBp?: number;
  mainGoal?: string;
  baseConditions?: string[];
  currentMedications?: string[];
  currentSupplements?: string[];
};

type BiomarkerInput = {
  fasting_glucose?: number;
  hba1c?: number;
  total_cholesterol?: number;
  hdl?: number;
  ldl?: number;
  triglycerides?: number;
  vitamin_d?: number;
  b12?: number;
  ferritin?: number;
  tsh?: number;
  creatinine?: number;
  ast?: number;
  alt?: number;
  lab_date?: string;
};

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

type PersistenceInfo = {
  saved?: boolean;
  assessmentId?: number | null;
  reason?: string | null;
  details?: string | null;
};

type HealthAnalysisResponse = {
  plan: PlanType;
  requestedAiMode: RequestedAiMode;
  appliedAiMode: AppliedAiMode;
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
    confidenceLevel: ConfidenceLevel;
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
  persistence?: PersistenceInfo;
};

type QuizDraft = {
  plan?: PlanType;
  requestedAiMode?: RequestedAiMode;
  assessment: AssessmentInput;
  biomarkers?: BiomarkerInput;
};

type LockedPreviewItem = {
  title: string;
  description: string;
};

type BootstrapData = {
  resolvedPlan: PlanType;
  parsedDraft: QuizDraft;
  draftSignature: string;
  hasLoggedUser: boolean;
};

const QUIZ_STORAGE_KEY = "vitaSmartQuizDraft";
const LAST_ANALYSIS_CACHE_KEY = "vitaSmartLastHealthAnalysis";

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-3xl bg-white p-8 shadow-sm">
              <div className="mb-4 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
                VitaSmart AI · Resultados
              </div>
              <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-900">
                Tu lectura personalizada
              </h1>
              <p className="text-slate-600">Cargando resultados...</p>
            </div>
          </div>
        </main>
      }
    >
      <ResultsPageContent />
    </Suspense>
  );
}

function ResultsPageContent() {
  const [plan, setPlan] = useState<PlanType>("free");
  const [planLoading, setPlanLoading] = useState(true);

  const [analysis, setAnalysis] = useState<HealthAnalysisResponse | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [analysisError, setAnalysisError] = useState("");

  const [saveNotice, setSaveNotice] = useState("");

  const [requestedAiMode, setRequestedAiMode] =
    useState<RequestedAiMode>("advanced");
  const [appliedAiMode, setAppliedAiMode] = useState<AppliedAiMode>("basic");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [wasDowngraded, setWasDowngraded] = useState(false);

  const [draft, setDraft] = useState<QuizDraft | null>(null);

  const mountedRef = useRef(true);
  const lastSavedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((fn: () => void) => {
    if (!mountedRef.current) return;
    fn();
  }, []);

  const buildDraftSignature = useCallback((draftValue: QuizDraft) => {
    return JSON.stringify({
      requestedAiMode: draftValue?.requestedAiMode ?? "advanced",
      plan: draftValue?.plan ?? "free",
      assessment: draftValue?.assessment ?? {},
      biomarkers: draftValue?.biomarkers ?? {},
    });
  }, []);

  const resetUiForReload = useCallback(() => {
    safeSetState(() => {
      setPlanLoading(true);
      setLoadingAnalysis(true);
      setAnalysisError("");
      setSaveNotice("");
      setAnalysis(null);
      setUpgradeRequired(false);
      setUpgradeMessage("");
      setWasDowngraded(false);
      setRequestedAiMode("advanced");
      setAppliedAiMode("basic");
    });
  }, [safeSetState]);

  const loadDraftFromSession = useCallback((): QuizDraft => {
    if (typeof window === "undefined") {
      throw new Error(
        "No encontramos un análisis reciente en sesión. Por favor completa nuevamente el cuestionario."
      );
    }

    const rawDraft = sessionStorage.getItem(QUIZ_STORAGE_KEY);

    if (!rawDraft) {
      throw new Error(
        "No encontramos un análisis reciente en sesión. Por favor completa nuevamente el cuestionario."
      );
    }

    let parsedDraft: QuizDraft;

    try {
      parsedDraft = JSON.parse(rawDraft) as QuizDraft;
    } catch {
      throw new Error(
        "El borrador del cuestionario no es válido. Por favor vuelve a realizar el análisis."
      );
    }

    if (!parsedDraft?.assessment) {
      throw new Error(
        "El borrador del cuestionario está incompleto. Por favor vuelve a realizar el análisis."
      );
    }

    return parsedDraft;
  }, []);

  const isValidAnalysisResponse = useCallback(
    (value: unknown): value is HealthAnalysisResponse => {
      const candidate = value as Partial<HealthAnalysisResponse> | null;

      return Boolean(
        candidate &&
          typeof candidate === "object" &&
          candidate.assessmentVersion &&
          candidate.scores &&
          typeof candidate.scores.healthScore === "number" &&
          candidate.summaries &&
          typeof candidate.summaries.executiveSummary === "string" &&
          Array.isArray(candidate.insights?.mainDrivers) &&
          Array.isArray(candidate.userNeeds?.dominantNeeds)
      );
    },
    []
  );

  const getCachedAnalysis = useCallback(
    (draftSignature: string): HealthAnalysisResponse | null => {
      if (typeof window === "undefined") return null;

      const raw = sessionStorage.getItem(LAST_ANALYSIS_CACHE_KEY);
      if (!raw) return null;

      try {
        const parsed = JSON.parse(raw) as {
          draftSignature?: string;
          result?: HealthAnalysisResponse;
        };

        if (
          parsed?.draftSignature === draftSignature &&
          isValidAnalysisResponse(parsed?.result)
        ) {
          return parsed.result;
        }

        if (isValidAnalysisResponse(parsed as unknown)) {
          return parsed as unknown as HealthAnalysisResponse;
        }

        return null;
      } catch {
        return null;
      }
    },
    [isValidAnalysisResponse]
  );

  const setCachedAnalysis = useCallback(
    (draftSignature: string, result: HealthAnalysisResponse) => {
      if (typeof window === "undefined") return;

      sessionStorage.setItem(
        LAST_ANALYSIS_CACHE_KEY,
        JSON.stringify({
          draftSignature,
          result,
        })
      );
    },
    []
  );

  const requestAnalysis = useCallback(
    async (
      resolvedPlan: PlanType,
      parsedDraft: QuizDraft
    ): Promise<HealthAnalysisResponse> => {
      const payload = {
        plan: parsedDraft.plan ?? resolvedPlan,
        requestedAiMode: parsedDraft.requestedAiMode ?? "advanced",
        assessment: parsedDraft.assessment,
        biomarkers: parsedDraft.biomarkers,
      };

      const response = await fetch("/api/health-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as
        | HealthAnalysisResponse
        | { error?: string; fieldErrors?: string[] };

      if (!response.ok) {
        throw new Error(
          (data as { error?: string }).error || "No se pudo generar el análisis."
        );
      }

      return data as HealthAnalysisResponse;
    },
    []
  );

  const bootstrap = useCallback(async (): Promise<BootstrapData> => {
    const [viewer, parsedDraft] = await Promise.all([
      resolveViewerState(),
      Promise.resolve(loadDraftFromSession()),
    ]);

    const resolvedPlan = normalizePlan(
      parsedDraft.plan ?? viewer.plan ?? "free"
    );
    const draftSignature = buildDraftSignature(parsedDraft);

    safeSetState(() => {
      setPlan(resolvedPlan);
      setDraft(parsedDraft);
    });

    return {
      resolvedPlan,
      parsedDraft,
      draftSignature,
      hasLoggedUser: !viewer.needsLogin && Boolean(viewer.user),
    };
  }, [buildDraftSignature, loadDraftFromSession, safeSetState]);

  const persistAnalysis = useCallback(
    async (
      result: HealthAnalysisResponse,
      parsedDraft: QuizDraft,
      backendPlan: PlanType,
      draftSignature: string,
      hasLoggedUser: boolean
    ) => {
      const saveSignature = `${draftSignature}::${result.assessmentVersion}::${result.appliedAiMode}::${backendPlan}`;

      if (lastSavedSignatureRef.current === saveSignature) {
        return;
      }

      const assessment = parsedDraft.assessment;
      const biomarkers = parsedDraft.biomarkers;

      const bmi =
        typeof assessment.weightKg === "number" &&
        typeof assessment.heightCm === "number" &&
        assessment.heightCm > 0
          ? Number(
              (
                assessment.weightKg /
                Math.pow(assessment.heightCm / 100, 2)
              ).toFixed(1)
            )
          : null;

      try {
        const aiMode: AssessmentAiMode =
          result.appliedAiMode === "advanced" ? "advanced" : "basic";

        const saveResult = await saveAssessment(
          {
            assessmentVersion: result.assessmentVersion,
            plan: backendPlan,
            aiMode,
            generatedBy: "results-page-v5",

            age: assessment.age,
            sex: assessment.sex,

            weightKg: assessment.weightKg ?? null,
            heightCm: assessment.heightCm ?? null,
            waistCm: assessment.waistCm ?? null,
            bmi,

            stressLevel: assessment.stressLevel ?? null,
            sleepHours: assessment.sleepHours ?? null,
            sleepQuality: assessment.sleepQuality ?? null,
            fatigueLevel: assessment.fatigueLevel ?? null,
            focusDifficulty: assessment.focusDifficulty ?? null,

            physicalActivity: assessment.physicalActivity ?? null,
            alcoholUse: assessment.alcoholUse ?? null,
            smokingStatus: assessment.smokingStatus ?? null,
            sunExposure: assessment.sunExposure ?? null,
            hydrationLevel: assessment.hydrationLevel ?? null,
            ultraProcessedFoodLevel:
              assessment.ultraProcessedFoodLevel ?? null,

            bloodPressureKnown: Boolean(assessment.bloodPressureKnown),
            systolicBp: assessment.systolicBp ?? null,
            diastolicBp: assessment.diastolicBp ?? null,

            mainGoal: assessment.mainGoal,

            baseConditions: assessment.baseConditions ?? [],
            currentMedications: assessment.currentMedications ?? [],
            currentSupplements: assessment.currentSupplements ?? [],

            healthScore: result.scores.healthScore,
            sleepScore: result.scores.sleepScore,
            stressScore: result.scores.stressScore,
            energyScore: result.scores.energyScore,
            focusScore: result.scores.focusScore,
            metabolicScore: result.scores.metabolicScore,

            confidenceLevel: result.confidence.confidenceLevel,
            confidenceExplanation: result.confidence.confidenceExplanation,

            executiveSummary: result.summaries.executiveSummary,
            clinicalStyleSummary: result.summaries.clinicalStyleSummary,
            scoreNarrative: result.summaries.scoreNarrative,
            professionalFollowUpAdvice:
              result.summaries.professionalFollowUpAdvice,

            strengths: result.insights.strengths,
            mainDrivers: result.insights.mainDrivers,
            priorityActions: result.insights.priorityActions,
            riskSignals: result.insights.riskSignals,
            factors: [
              ...result.insights.mainDrivers,
              ...result.userNeeds.dominantNeeds.map(humanizeNeed),
            ].slice(0, 8),

            biomarkers: biomarkers
              ? {
                  fasting_glucose: biomarkers.fasting_glucose ?? null,
                  hba1c: biomarkers.hba1c ?? null,
                  total_cholesterol: biomarkers.total_cholesterol ?? null,
                  hdl: biomarkers.hdl ?? null,
                  ldl: biomarkers.ldl ?? null,
                  triglycerides: biomarkers.triglycerides ?? null,
                  vitamin_d: biomarkers.vitamin_d ?? null,
                  b12: biomarkers.b12 ?? null,
                  ferritin: biomarkers.ferritin ?? null,
                  tsh: biomarkers.tsh ?? null,
                  creatinine: biomarkers.creatinine ?? null,
                  ast: biomarkers.ast ?? null,
                  alt: biomarkers.alt ?? null,
                  lab_date: biomarkers.lab_date ?? null,
                }
              : undefined,
          },
          {
            aiMode,
            generatedBy: "results-page-v5",
          }
        );

        lastSavedSignatureRef.current = saveSignature;

        safeSetState(() => {
          if (saveResult.saved) {
            setSaveNotice(
              result.appliedAiMode === "advanced"
                ? "Análisis avanzado guardado correctamente en tu historial."
                : "Análisis guardado correctamente en tu historial."
            );
          } else if (!saveResult.saved && saveResult.reason === "no-user") {
            setSaveNotice(
              "Análisis generado. Inicia sesión para guardar este resultado en tu historial."
            );
          } else if (!saveResult.saved && saveResult.reason === "plan-limit") {
            setSaveNotice(
              `Has alcanzado el límite de análisis guardados de tu plan ${String(
                saveResult.plan || "actual"
              ).toUpperCase()}. Actualiza tu plan para seguir guardando resultados.`
            );
          } else if (!hasLoggedUser) {
            setSaveNotice(
              "Análisis generado. Inicia sesión para guardar este resultado en tu historial."
            );
          } else {
            setSaveNotice(
              "El análisis se generó, pero no se pudo guardar en tu historial."
            );
          }
        });
      } catch (saveError: any) {
        console.error("Error guardando análisis expandido:", saveError);

        safeSetState(() => {
          setSaveNotice(
            saveError?.message ||
              "El análisis se generó, pero no se pudo guardar en tu historial."
          );
        });
      }
    },
    [safeSetState]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPlanAndAnalysis() {
      resetUiForReload();

      try {
        const { resolvedPlan, parsedDraft, draftSignature, hasLoggedUser } =
          await bootstrap();

        if (cancelled || !mountedRef.current) return;

        let result = getCachedAnalysis(draftSignature);

        if (!result) {
          result = await requestAnalysis(resolvedPlan, parsedDraft);
          if (cancelled || !mountedRef.current) return;
          setCachedAnalysis(draftSignature, result);
        }

        const backendPlan = normalizePlan(result.plan || resolvedPlan);

        safeSetState(() => {
          setPlan(backendPlan);
          setAnalysis(result);
          setRequestedAiMode(result.requestedAiMode || "advanced");
          setAppliedAiMode(result.appliedAiMode || "basic");
          setUpgradeRequired(Boolean(result.upgradeRequired));
          setUpgradeMessage(result.upgradeMessage || "");
          setWasDowngraded(Boolean(result.wasDowngraded));
        });

        await persistAnalysis(
          result,
          parsedDraft,
          backendPlan,
          draftSignature,
          hasLoggedUser
        );
      } catch (error: any) {
        console.error("ResultsPage v5 error:", error);

        safeSetState(() => {
          setAnalysisError(
            error?.message ||
              "No pudimos generar el análisis inteligente en este momento."
          );
        });
      } finally {
        safeSetState(() => {
          setLoadingAnalysis(false);
          setPlanLoading(false);
        });
      }
    }

    loadPlanAndAnalysis();

    return () => {
      cancelled = true;
    };
  }, [
    bootstrap,
    getCachedAnalysis,
    persistAnalysis,
    requestAnalysis,
    resetUiForReload,
    safeSetState,
    setCachedAnalysis,
  ]);

  const limits = useMemo(() => getPlanLimits(plan), [plan]);

  const advancedAIEnabled = useMemo(() => {
    return analysis?.appliedAiMode === "advanced" && Boolean(limits.advancedAI);
  }, [analysis?.appliedAiMode, limits.advancedAI]);

  const resultTone = useMemo(() => {
    const score = analysis?.scores.healthScore ?? 0;
    if (score >= 85) return "Muy buen punto de partida";
    if (score >= 70) return "Base sólida con espacio para mejorar";
    if (score >= 55) return "Hay oportunidades claras de mejora";
    return "Conviene actuar con más intención";
  }, [analysis?.scores.healthScore]);

  const resultNarrative = useMemo(() => {
    const score = analysis?.scores.healthScore ?? 0;
    if (score >= 85) {
      return "Tu perfil actual muestra señales positivas. La clave ahora es sostener hábitos y ganar continuidad.";
    }
    if (score >= 70) {
      return "Tu situación actual tiene una base razonable, pero aún hay ajustes que podrían elevar tu energía, enfoque o bienestar general.";
    }
    if (score >= 55) {
      return "Tu resultado sugiere que hay varias áreas donde pequeños cambios consistentes podrían generar una mejora visible.";
    }
    return "Este resultado no es una sentencia: es una oportunidad para ordenar prioridades y empezar a construir una versión más fuerte de tu bienestar.";
  }, [analysis?.scores.healthScore]);

  const potentialScore = useMemo(() => {
    const baseScore = analysis?.scores.healthScore ?? 0;
    if (!baseScore) return 0;

    const uplift =
      baseScore >= 85 ? 6 : baseScore >= 70 ? 10 : baseScore >= 55 ? 14 : 18;

    return Math.min(baseScore + uplift, 96);
  }, [analysis?.scores.healthScore]);

  const visibleAdvancedRecommendations = useMemo(() => {
    if (!analysis?.advancedRecommendations?.length) return [];

    if (plan === "premium") return analysis.advancedRecommendations;
    if (plan === "pro") return analysis.advancedRecommendations.slice(0, 4);
    return analysis.advancedRecommendations.slice(0, 2);
  }, [analysis?.advancedRecommendations, plan]);

  const lockedAdvancedRecommendations = useMemo<LockedPreviewItem[]>(() => {
    if (plan === "premium") return [];

    const fromBackend =
      analysis?.advancedRecommendations?.slice(
        visibleAdvancedRecommendations.length
      ) || [];

    const normalizedFromBackend = fromBackend.map((item, index) => ({
      title: `Recomendación avanzada ${index + 1}`,
      description: item,
    }));

    if (normalizedFromBackend.length > 0) {
      return plan === "pro"
        ? normalizedFromBackend.slice(0, 2)
        : normalizedFromBackend.slice(0, 3);
    }

    const fallbackByGoal: Record<string, LockedPreviewItem[]> = {
      energy: [
        {
          title: "Optimización avanzada de energía",
          description:
            "Una estrategia más profunda para estabilizar rendimiento y fatiga durante el día.",
        },
        {
          title: "Ajuste de recuperación",
          description:
            "Recomendaciones para evitar bajones y mejorar consistencia física y mental.",
        },
        {
          title: "Secuencia de soporte metabólico",
          description:
            "Combinación priorizada según tu perfil actual y objetivo principal.",
        },
      ],
      focus: [
        {
          title: "Protocolo avanzado de enfoque",
          description:
            "Ajustes para sostener claridad mental y reducir dispersión.",
        },
        {
          title: "Mejora de energía cognitiva",
          description:
            "Recomendaciones para evitar fatiga mental y elevar rendimiento diario.",
        },
        {
          title: "Sincronización de hábitos clave",
          description:
            "Rutinas y apoyos priorizados para mantener continuidad mental.",
        },
      ],
      sleep: [
        {
          title: "Ajuste profundo de sueño",
          description:
            "Intervenciones más específicas para mejorar descanso y recuperación.",
        },
        {
          title: "Corrección de señales de fatiga",
          description:
            "Lectura avanzada para ordenar hábitos que afectan tu descanso.",
        },
        {
          title: "Protocolo nocturno optimizado",
          description:
            "Recomendaciones secuenciales para dormir mejor de forma sostenida.",
        },
      ],
      general_health: [
        {
          title: "Estrategia integral de bienestar",
          description:
            "Una lectura más profunda de prioridades para fortalecer tu base general.",
        },
        {
          title: "Optimización de consistencia",
          description:
            "Acciones concretas para sostener mejoras en energía, sueño y enfoque.",
        },
        {
          title: "Priorización avanzada de soporte",
          description:
            "Qué conviene atacar primero según tus señales actuales.",
        },
      ],
      weight: [
        {
          title: "Lectura metabólica ampliada",
          description:
            "Interpretación más profunda de soporte metabólico y prioridades de seguimiento.",
        },
        {
          title: "Secuencia estratégica de mejora",
          description:
            "Qué conviene ajustar primero para aumentar consistencia en el objetivo corporal.",
        },
        {
          title: "Ruta preventiva de seguimiento",
          description:
            "Señales que conviene vigilar con más intención en el tiempo.",
        },
      ],
      recovery: [
        {
          title: "Estrategia avanzada de recuperación",
          description:
            "Capas extra para mejorar recuperación física y estabilidad de energía.",
        },
        {
          title: "Orden de prioridades de soporte",
          description:
            "Qué señales conviene mejorar primero para sostener rendimiento.",
        },
        {
          title: "Ajuste integral de carga y descanso",
          description:
            "Lectura más fina del equilibrio entre demanda y recuperación.",
        },
      ],
    };

    const genericFallback: LockedPreviewItem[] = [
      {
        title: "Lectura avanzada de patrones",
        description:
          "Una capa más profunda del análisis para detectar prioridades con mayor precisión.",
      },
      {
        title: "Recomendaciones personalizadas adicionales",
        description:
          "Más acciones priorizadas según tu perfil actual y tu objetivo principal.",
      },
      {
        title: "Ruta de mejora sugerida",
        description:
          "Secuencia recomendada para mejorar tu score con más intención.",
      },
    ];

    const key = draft?.assessment?.mainGoal || "general_health";
    const selected = fallbackByGoal[key] || genericFallback;

    return plan === "pro" ? selected.slice(0, 1) : selected.slice(0, 3);
  }, [
    analysis?.advancedRecommendations,
    visibleAdvancedRecommendations.length,
    plan,
    draft?.assessment?.mainGoal,
  ]);

  const visibleSmartRecommendations = useMemo(() => {
    const items = analysis?.productRecommendations || [];
    if (advancedAIEnabled) return items;
    return items.slice(0, 2);
  }, [advancedAIEnabled, analysis?.productRecommendations]);

  const hiddenSmartRecommendationsCount = Math.max(
    (analysis?.productRecommendations?.length || 0) -
      visibleSmartRecommendations.length,
    0
  );

  const showUpgradeMessaging = !planLoading && plan !== "premium";
  const showLockedAdvancedPreview =
    !loadingAnalysis &&
    !analysisError &&
    !planLoading &&
    lockedAdvancedRecommendations.length > 0 &&
    plan !== "premium";

  const showHealthBlocks = !loadingAnalysis && !analysisError && analysis;

  const topProductIngredient = useMemo(() => {
    return analysis?.productRecommendations?.[0] || null;
  }, [analysis?.productRecommendations]);

  const upgradePitch = useMemo(() => {
    if (plan === "premium") return null;

    if (plan === "pro") {
      return {
        title: "Lleva tu lectura al nivel más completo",
        subtitle:
          "Ya tienes una experiencia sólida. Premium añade más continuidad, más profundidad y una capa todavía más refinada.",
        cta: "Quiero Premium",
      };
    }

    return {
      title: "Esto es solo una parte del análisis real",
      subtitle:
        "Con Pro desbloqueas IA avanzada, mejor priorización y una lectura mucho más útil para actuar con intención.",
      cta: "Desbloquear Pro",
    };
  }, [plan]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="mb-4 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
            VitaSmart AI · Resultados
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
              Plan actual: {planLoading ? "Cargando..." : plan.toUpperCase()}
            </div>

            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
              IA solicitada:{" "}
              {requestedAiMode === "advanced" ? "Avanzada" : "Básica"}
            </div>

            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
              IA aplicada:{" "}
              {appliedAiMode === "advanced" ? "Avanzada" : "Básica"}
            </div>

            {analysis?.confidence?.confidenceLevel ? (
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
                Confianza:{" "}
                {translateConfidenceLabel(analysis.confidence.confidenceLevel)}
              </div>
            ) : null}
          </div>

          <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-900">
            Tu lectura personalizada
          </h1>

          <p className="text-slate-600">
            Este resultado no es solo información. Es una señal clara de dónde
            estás y qué tanto puedes mejorar si tomas acción con intención.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Info
              label="Edad"
              value={draft?.assessment?.age ? String(draft.assessment.age) : "-"}
            />
            <Info
              label="Sexo"
              value={translateSex(draft?.assessment?.sex || "")}
            />
            <Info
              label="Peso"
              value={
                draft?.assessment?.weightKg
                  ? `${draft.assessment.weightKg} kg`
                  : "-"
              }
            />
            <Info
              label="Estatura"
              value={
                draft?.assessment?.heightCm
                  ? `${draft.assessment.heightCm} cm`
                  : "-"
              }
            />
            <Info
              label="Estrés"
              value={translateStressLevel(draft?.assessment?.stressLevel)}
            />
            <Info
              label="Sueño"
              value={translateSleepHours(draft?.assessment?.sleepHours)}
            />
            <Info
              label="Calidad de sueño"
              value={translateFiveLevel(draft?.assessment?.sleepQuality)}
            />
            <Info
              label="Actividad física"
              value={translateFiveLevel(draft?.assessment?.physicalActivity)}
            />
            <Info
              label="Objetivo"
              value={translateGoal(draft?.assessment?.mainGoal || "")}
            />
          </div>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Si tomas medicamentos, tienes hipertensión, enfermedad renal,
            hepática, problemas cardíacos, trastornos hormonales o cualquier
            condición médica, consulta con un profesional de salud antes de
            tomar suplementos.
          </div>

          {upgradeRequired && !planLoading && (
            <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              {upgradeMessage ||
                "Tu plan actual incluye análisis base. Actualiza a Pro o Premium para desbloquear recomendaciones avanzadas."}
            </div>
          )}

          {wasDowngraded && !upgradeRequired && !planLoading && (
            <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              Tu plan actual aplicó una versión base del análisis. Actualiza a
              Pro o Premium para desbloquear recomendaciones avanzadas.
            </div>
          )}

          {saveNotice && (
            <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              {saveNotice}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/quiz"
              className="rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white transition hover:bg-slate-700"
            >
              Hacer otro análisis
            </Link>

            <Link
              href="/history"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver historial
            </Link>

            <Link
              href="/pricing"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver planes
            </Link>
          </div>
        </div>

        {loadingAnalysis ? (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm md:col-span-1">
              <h2 className="text-lg font-semibold text-slate-900">
                Health Score
              </h2>
              <p className="mt-4 text-slate-600">Calculando...</p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm md:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900">
                Análisis inteligente
              </h2>
              <p className="mt-3 text-slate-600">
                Generando análisis personalizado...
              </p>
            </div>
          </div>
        ) : analysisError ? (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              No pudimos generar tu análisis
            </h2>
            <p className="mt-3 text-red-600">{analysisError}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/quiz"
                className="inline-flex rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                Volver al cuestionario
              </Link>

              <Link
                href="/pricing"
                className="inline-flex rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ver planes
              </Link>
            </div>
          </div>
        ) : null}

        {showHealthBlocks && analysis ? (
          <>
            <div className="mt-8">
              <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                      Resultado personalizado
                    </div>
                    <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                      {resultTone}
                    </h2>
                  </div>

                  <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100">
                    {advancedAIEnabled
                      ? "Análisis completo activo"
                      : "Vista inicial"}
                  </div>
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-[auto_1fr] lg:items-end">
                  <div>
                    <div className="flex items-end gap-2">
                      <div className="text-7xl font-bold leading-none">
                        {analysis.scores.healthScore}
                      </div>
                      <div className="pb-2 text-xl text-slate-400">/100</div>
                    </div>
                    <p className="mt-3 text-sm text-slate-400">
                      Health Score orientativo basado en tu perfil actual.
                    </p>
                  </div>

                  <div>
                    <p className="max-w-3xl text-base leading-8 text-slate-200">
                      {analysis.summaries.executiveSummary}
                    </p>

                    {!advancedAIEnabled && potentialScore > 0 && (
                      <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-5">
                        <div className="text-sm font-semibold text-slate-300">
                          Estás viendo solo una parte del análisis real
                        </div>
                        <p className="mt-2 text-lg font-semibold text-white">
                          Tu potencial de mejora podría acercarse a {" "}
                          <span className="text-violet-200">{potentialScore}+</span>{" "}
                          con una lectura más profunda y accionable.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          La versión completa te muestra qué está afectando más tu
                          resultado y qué conviene priorizar primero.
                        </p>
                      </div>
                    )}

                    {!advancedAIEnabled && (
                      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <Link
                          href="/pricing"
                          className="inline-flex rounded-xl bg-white px-6 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                        >
                          Desbloquear análisis completo
                        </Link>
                        <Link
                          href="/pricing"
                          className="inline-flex rounded-xl border border-white/20 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                          Comparar planes
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 shadow-sm md:col-span-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  Health Score
                </h2>

                <div className="mt-4 text-5xl font-bold text-slate-900">
                  {analysis.scores.healthScore}
                  <span className="text-xl text-slate-500">/100</span>
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-900">
                  {resultTone}
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  Estimación orientativa basada en tu perfil actual.
                </p>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Nivel de confianza
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {translateConfidenceLabel(
                      analysis.confidence.confidenceLevel
                    )}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {analysis.confidence.confidenceExplanation}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm md:col-span-2">
                <h2 className="text-xl font-semibold text-slate-900">
                  Análisis inteligente
                </h2>

                <p className="mt-3 leading-7 text-slate-700">
                  {analysis.summaries.executiveSummary}
                </p>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Lectura general
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {resultNarrative}
                  </p>
                </div>

                {showUpgradeMessaging && potentialScore > 0 && upgradePitch && (
                  <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-5">
                    <div className="text-sm font-semibold uppercase tracking-wide text-violet-700">
                      Potencial de mejora
                    </div>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      Podrías llevar tu Health Score hacia{" "}
                      <span className="text-violet-700">{potentialScore}+</span>{" "}
                      con una lectura más profunda.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {upgradePitch.subtitle}
                    </p>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Link
                        href="/pricing"
                        className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        {upgradePitch.cta}
                      </Link>

                      <Link
                        href="/pricing"
                        className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Comparar planes
                      </Link>
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Factores principales
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.insights.mainDrivers.map((factor, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                      >
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>

                {visibleAdvancedRecommendations.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        {advancedAIEnabled
                          ? "Recomendaciones avanzadas IA"
                          : "Vista previa de recomendaciones"}
                      </h3>

                      {!advancedAIEnabled && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          Vista parcial
                        </span>
                      )}
                    </div>

                    <div className="relative mt-3">
                      <div
                        className={`grid gap-3 ${
                          !advancedAIEnabled ? "select-none blur-[2px]" : ""
                        }`}
                      >
                        {visibleAdvancedRecommendations.map((item, index) => (
                          <div
                            key={`${index}-${item}`}
                            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                          >
                            <div className="text-sm font-semibold text-emerald-900">
                              Recomendación {index + 1}
                            </div>
                            <p className="mt-1 text-sm text-emerald-800">
                              {item}
                            </p>
                          </div>
                        ))}
                      </div>

                      {!advancedAIEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 p-4 backdrop-blur-sm">
                          <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-slate-200">
                            <div className="text-sm font-semibold text-slate-500">
                              Recomendaciones avanzadas ocultas
                            </div>
                            <h3 className="mt-2 text-lg font-semibold text-slate-900">
                              Aquí es donde el análisis se vuelve realmente útil
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              Estás viendo solo una vista inicial. La versión Pro
                              desbloquea priorización real, acciones específicas y
                              una lectura mucho más accionable.
                            </p>
                            <Link
                              href="/pricing"
                              className="mt-4 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                            >
                              Desbloquear Pro
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!advancedAIEnabled && upgradePitch && (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Desbloquea la versión completa
                        </div>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900">
                          {upgradePitch.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {plan === "free"
                            ? "Con Pro accedes a IA avanzada, más profundidad y una priorización mucho más útil. Con Premium llevas la experiencia al máximo nivel."
                            : "Premium amplía la continuidad, la profundidad y la capa más completa de interpretación dentro de VitaSmart AI."}
                        </p>
                      </div>

                      <Link
                        href="/pricing"
                        className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        {upgradePitch.cta}
                      </Link>
                    </div>
                  </div>
                )}

                {showLockedAdvancedPreview && (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Recomendaciones bloqueadas
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          Estás viendo solo una parte del análisis completo.
                        </p>
                      </div>

                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {plan === "free"
                          ? "Solo ves una vista inicial"
                          : "Desbloquea más profundidad"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {lockedAdvancedRecommendations.map((item, index) => (
                        <div
                          key={`${item.title}-${index}`}
                          className="rounded-xl border border-slate-200 bg-white p-4"
                        >
                          <div className="text-sm font-semibold text-slate-900">
                            🔒 {item.title}
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-600">
                        Desbloquea una evaluación más profunda para acceder a
                        recomendaciones avanzadas y priorización más útil.
                      </p>

                      <Link
                        href="/pricing"
                        className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Desbloquear mi análisis completo
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8">
              <ResultSubscoresGrid
                sleepScore={analysis.scores.sleepScore}
                stressScore={analysis.scores.stressScore}
                energyScore={analysis.scores.energyScore}
                focusScore={analysis.scores.focusScore}
                metabolicScore={analysis.scores.metabolicScore}
              />
            </div>

            {!advancedAIEnabled && (
              <div className="mt-8 rounded-2xl border border-violet-200 bg-violet-50 p-6">
                <div className="text-sm font-semibold uppercase tracking-wide text-violet-700">
                  Antes de seguir
                </div>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  Este resultado puede volverse mucho más útil
                </h2>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">
                  Lo que estás viendo ya tiene valor, pero aún es una lectura
                  parcial. Los planes Pro y Premium desbloquean una capa mucho
                  más accionable: más profundidad, mejor priorización y una
                  experiencia claramente más útil para decidir qué hacer después.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/pricing"
                    className="inline-flex rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white transition hover:bg-slate-700"
                  >
                    Ver planes
                  </Link>

                  <Link
                    href="/pricing"
                    className="inline-flex rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Comparar Pro vs Premium
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-8">
              <ResultInsightsPanel
                scoreNarrative={analysis.summaries.scoreNarrative}
                strengths={analysis.insights.strengths}
                mainDrivers={analysis.insights.mainDrivers}
                priorityActions={analysis.insights.priorityActions}
                riskSignals={analysis.insights.riskSignals}
                dominantNeeds={analysis.userNeeds.dominantNeeds}
                secondaryNeeds={analysis.userNeeds.secondaryNeeds}
                advancedRecommendations={analysis.advancedRecommendations}
              />
            </div>

            <div className="mt-8">
              <FollowUpPanel
                professionalFollowUpAdvice={
                  analysis.summaries.professionalFollowUpAdvice
                }
              />
            </div>

            {topProductIngredient ? (
              <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900">
                  Ingrediente principal detectado
                </h2>
                <p className="mt-3 text-slate-600">
                  El sistema priorizó{" "}
                  <strong>{topProductIngredient.ingredientName}</strong> como
                  uno de los ingredientes con mayor afinidad para tu perfil
                  actual.
                </p>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Nivel de afinidad {topProductIngredient.matchScore}/100
                      </span>

                      {topProductIngredient.evidenceLevel ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {topProductIngredient.evidenceLevel === "high"
                            ? "Evidencia alta"
                            : topProductIngredient.evidenceLevel === "moderate"
                            ? "Evidencia moderada"
                            : "Evidencia limitada"}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-2">
                      {topProductIngredient.whyMatched
                        .slice(0, 3)
                        .map((reason, index) => (
                          <div
                            key={index}
                            className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                          >
                            {reason}
                          </div>
                        ))}
                    </div>
                  </div>

                  <Link
                    href="/marketplace"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver comparador premium
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">
                Qué significa este resultado para ti
              </h2>
              <p className="mt-3 text-slate-600">
                El verdadero valor no está solo en ver un score, sino en usar
                este resultado como referencia para construir hábitos más
                consistentes y mejorar con continuidad.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <InsightCard
                  title="Claridad"
                  description="Te ayuda a entender mejor tu situación actual."
                />
                <InsightCard
                  title="Dirección"
                  description="Te muestra hacia dónde conviene poner atención."
                />
                <InsightCard
                  title="Continuidad"
                  description="Gana más valor cuando repites el análisis en el tiempo."
                />
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Recomendaciones priorizadas
              </h2>
              <p className="mt-2 text-slate-600">
                {advancedAIEnabled
                  ? "Ordenadas según la prioridad estimada para tu perfil actual."
                  : "Te mostramos una vista inicial. La priorización inteligente completa está disponible en los planes Pro y Premium."}
              </p>
            </div>

            <div className="mt-6">
              {planLoading ? (
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <p className="text-slate-600">
                    Cargando beneficios de tu plan...
                  </p>
                </div>
              ) : visibleSmartRecommendations.length > 0 ? (
                <div className="space-y-4">
                  {visibleSmartRecommendations.map((item, index) => (
                    <ProductRecommendationPreviewCard
                      key={`${item.ingredientSlug}-${index}`}
                      item={item}
                      index={index}
                      isPreview={!advancedAIEnabled}
                    />
                  ))}

                  {!advancedAIEnabled && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {hiddenSmartRecommendationsCount > 0
                              ? `Hay ${hiddenSmartRecommendationsCount} recomendaciones más esperando por ti`
                              : "Tu análisis completo puede ir mucho más allá"}
                          </h3>
                          <p className="mt-2 text-slate-600">
                            Actualiza tu plan para ver priorización completa,
                            recomendaciones más profundas y una lectura mucho
                            más accionable.
                          </p>
                        </div>

                        <Link
                          href="/pricing"
                          className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
                        >
                          Acceder al análisis completo
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Explorar comparador premium
                        </h3>
                        <p className="mt-2 text-slate-600">
                          Ve al marketplace para comparar opciones Excelente,
                          Muy buena y Buena por ingrediente, con narrativa,
                          calidad, restricciones y costo diario estimado.
                        </p>
                      </div>

                      <Link
                        href="/marketplace"
                        className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Ir al marketplace
                      </Link>
                    </div>
                  </div>
                </div>
              ) : advancedAIEnabled ? (
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">
                    No encontramos recomendaciones
                  </h2>
                  <p className="mt-2 text-slate-600">
                    Completa correctamente el cuestionario para generar
                    sugerencias.
                  </p>
                </div>
              ) : (
                <>
                  <PremiumGate
                    title="Recomendaciones avanzadas bloqueadas"
                    description="Tu plan actual incluye el análisis base. Actualiza a VitaSmart Pro o Premium para desbloquear recomendaciones priorizadas, sugerencias más profundas y acceso avanzado al marketplace inteligente."
                    requiredPlan="pro"
                  />

                  {plan !== "premium" && (
                    <div className="mt-8">
                      <UpgradePrompt currentPlan={plan} context="results" />
                    </div>
                  )}
                </>
              )}
            </div>


            {!advancedAIEnabled && (
              <div className="mt-10 rounded-3xl bg-slate-900 p-8 text-center text-white shadow-sm">
                <h3 className="text-2xl font-bold">
                  Estás a un paso de ver tu análisis real
                </h3>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                  Lo que viste es solo la superficie. La diferencia real está en
                  entender qué está afectando tu resultado, qué priorizar y cómo
                  convertir este score en una ruta concreta de mejora.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    href="/pricing"
                    className="inline-flex rounded-xl bg-white px-6 py-3 text-center font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Desbloquear ahora
                  </Link>
                  <Link
                    href="/quiz"
                    className="inline-flex rounded-xl border border-white/20 px-6 py-3 text-center font-semibold text-white transition hover:bg-white/10"
                  >
                    Repetir análisis
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}

function ProductRecommendationPreviewCard({
  item,
  index,
  isPreview,
}: {
  item: TopIngredientRecommendationView;
  index: number;
  isPreview: boolean;
}) {
  const product =
    item.options.excellent ?? item.options.veryGood ?? item.options.good;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{item.ingredientName}</h2>
            <PriorityBadge value={item.matchScore} />
            <EvidenceBadge value={item.evidenceLevel} />
            {!product ? null : <TierBadge value={product.product.budgetTier} />}
            {isPreview && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Vista previa
              </span>
            )}
          </div>

          <p className="mt-3 text-slate-600">
            {item.whyMatched?.[0] ||
              "Este ingrediente aparece priorizado por su posible ajuste al perfil actual."}
          </p>

          {product ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[140px_1fr]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {product.product.imageUrl ? (
                  <img
                    src={product.product.imageUrl}
                    alt={product.product.productName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center text-xs text-slate-400">
                    Sin imagen
                  </div>
                )}
              </div>

              <div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm text-slate-500">
                    Producto sugerido
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {product.product.productName}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Marca: {product.product.brand}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Fabricante: {product.product.manufacturer}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Precio estimado: {product.product.priceLabel}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Costo diario estimado:{" "}
                    {product.product.estimatedCostPerDayUsd != null
                      ? `$${product.product.estimatedCostPerDayUsd.toFixed(2)}`
                      : "No disponible"}
                  </div>

                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <strong>Por qué para ti:</strong>{" "}
                    {product.narratives.whyForUser}
                  </div>

                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <strong>Cómo tomarlo:</strong>{" "}
                    {product.narratives.howToTake}
                  </div>

                  {product.product.buyUrl && product.product.buyUrl !== "#" && (
                    <a
                      href={product.product.buyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Ver producto
                    </a>
                  )}

                  <Link
                    href="/marketplace"
                    className="mt-3 ml-3 inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver comparador completo
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              Aún no hay un producto comercial enlazado a este ingrediente en la
              vista actual.
            </div>
          )}
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white">
          {index + 1}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="font-semibold text-slate-900">{value || "-"}</div>
    </div>
  );
}

function InsightCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="text-lg font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function PriorityBadge({ value }: { value: number }) {
  const styles =
    value >= 80
      ? "bg-red-100 text-red-700"
      : value >= 60
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-700";

  const label =
    value >= 80
      ? "Prioridad alta"
      : value >= 60
      ? "Prioridad media"
      : "Prioridad base";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {label}
    </span>
  );
}

function EvidenceBadge({
  value,
}: {
  value?: "high" | "moderate" | "limited";
}) {
  const map = {
    high: "Evidencia alta",
    moderate: "Evidencia moderada",
    limited: "Evidencia limitada",
  };

  if (!value) return null;

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      {map[value]}
    </span>
  );
}

function TierBadge({
  value,
}: {
  value: "excellent" | "very_good" | "good";
}) {
  const label =
    value === "excellent"
      ? "Excelente"
      : value === "very_good"
      ? "Muy buena"
      : "Buena";

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      {label}
    </span>
  );
}

function translateSex(value: string) {
  if (value === "male") return "Hombre";
  if (value === "female") return "Mujer";
  return "-";
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
  if (value < 6.5) return "Alrededor de 6 horas";
  if (value < 7.5) return "Alrededor de 7 horas";
  return "8 o más horas";
}

function translateFiveLevel(value?: number) {
  if (!value) return "-";
  if (value === 1) return "Muy bajo";
  if (value === 2) return "Bajo";
  if (value === 3) return "Medio";
  if (value === 4) return "Bueno";
  return "Muy bueno";
}

function translateGoal(value: string) {
  if (value === "energy") return "Más energía";
  if (value === "focus") return "Mejor concentración";
  if (value === "sleep") return "Dormir mejor";
  if (value === "general_health") return "Salud general";
  if (value === "weight") return "Peso / soporte metabólico";
  if (value === "recovery") return "Recuperación";
  return "-";
}

function translateConfidenceLabel(value: ConfidenceLevel) {
  if (value === "high") return "Alta confianza";
  if (value === "moderate") return "Confianza media";
  return "Confianza limitada";
}

function humanizeNeed(value: string) {
  return value
    .replace(/Need$/i, "")
    .replace(/([A-Z])/g, " $1")
    .replaceAll("_", " ")
    .trim();
}
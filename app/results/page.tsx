"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getRecommendations } from "../lib/recommendations";
import { saveAssessment, type AssessmentAiMode } from "../lib/saveAssessment";
import {
  getPlanLimits,
  normalizePlan,
  type PlanType,
} from "../lib/planLimits";
import { ensureUserProfile, getCurrentUserProfile } from "../lib/profile";
import PremiumGate from "../../components/PremiumGate";
import { supabase } from "../lib/supabase";

type AdvancedRecommendation = {
  title: string;
  description: string;
};

type AiHealthAnalysis = {
  score: number;
  summary: string;
  factors: string[];
  advancedRecommendations: AdvancedRecommendation[];
};

type BackendAnalysisResponse = {
  plan?: PlanType;
  requestedAiMode?: AssessmentAiMode;
  appliedAiMode?: AssessmentAiMode;
  advancedAI?: boolean;
  wasDowngraded?: boolean;
  upgradeRequired?: boolean;
  upgradeMessage?: string | null;
  score: number;
  summary: string;
  factors: string[];
  advancedRecommendations?: AdvancedRecommendation[];
};

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="mb-4 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
                VitaSmart AI · Resultados
              </div>
              <h1 className="mb-4 text-3xl font-bold">
                Tus recomendaciones personalizadas
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
  const searchParams = useSearchParams();

  const formData = {
    age: searchParams.get("age") || "",
    sex: searchParams.get("sex") || "",
    stress: searchParams.get("stress") || "",
    sleep: searchParams.get("sleep") || "",
    goal: searchParams.get("goal") || "",
  };

  const recommendations = useMemo(() => {
    return getRecommendations(formData);
  }, [
    formData.age,
    formData.sex,
    formData.stress,
    formData.sleep,
    formData.goal,
  ]);

  const [analysis, setAnalysis] = useState<AiHealthAnalysis | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(true);
  const [explanationError, setExplanationError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [plan, setPlan] = useState<PlanType>("free");
  const [planLoading, setPlanLoading] = useState(true);
  const [appliedAiMode, setAppliedAiMode] =
    useState<AssessmentAiMode>("basic");
  const [requestedAiMode, setRequestedAiMode] =
    useState<AssessmentAiMode>("advanced");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [wasDowngraded, setWasDowngraded] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function generateExplanation() {
      try {
        if (!ignore) {
          setLoadingExplanation(true);
          setPlanLoading(true);
          setExplanationError("");
          setAnalysis(null);
          setSaveNotice("");
          setUpgradeRequired(false);
          setUpgradeMessage("");
          setWasDowngraded(false);
          setAppliedAiMode("basic");
          setRequestedAiMode("advanced");
        }

        let resolvedPlan: PlanType = "free";

        try {
          await ensureUserProfile();
          const profile = await getCurrentUserProfile();
          resolvedPlan = normalizePlan(profile?.plan);
        } catch (profileError) {
          console.error("No se pudo cargar el perfil del usuario:", profileError);
          resolvedPlan = "free";
        }

        if (!ignore) {
          setPlan(resolvedPlan);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token || "";

        const response = await fetch("/api/ai-explanation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            ...formData,
            requestedAiMode: "advanced",
          }),
        });

        const data = (await response.json()) as BackendAnalysisResponse;

        if (!response.ok) {
          throw new Error(
            data?.upgradeMessage ||
              (data as any).error ||
              "No se pudo generar el análisis."
          );
        }

        const backendPlan = normalizePlan(data.plan || resolvedPlan);
        const backendAppliedAiMode =
          data.appliedAiMode === "advanced" ? "advanced" : "basic";
        const backendRequestedAiMode =
          data.requestedAiMode === "advanced" ? "advanced" : "basic";
        const backendAdvancedAI = Boolean(data.advancedAI);

        if (!ignore) {
          setPlan(backendPlan);
          setRequestedAiMode(backendRequestedAiMode);
          setAppliedAiMode(backendAppliedAiMode);
          setUpgradeRequired(Boolean(data.upgradeRequired));
          setUpgradeMessage(data.upgradeMessage || "");
          setWasDowngraded(Boolean(data.wasDowngraded));
        }

        const nextAnalysis: AiHealthAnalysis = {
          score: data.score,
          summary: data.summary,
          factors: Array.isArray(data.factors) ? data.factors : [],
          advancedRecommendations: Array.isArray(data.advancedRecommendations)
            ? data.advancedRecommendations
            : [],
        };

        if (!ignore) {
          setAnalysis(nextAnalysis);

          try {
            const saveResult = await saveAssessment(
              {
                age: formData.age,
                sex: formData.sex,
                stress: formData.stress,
                sleep: formData.sleep,
                goal: formData.goal,
                score: nextAnalysis.score,
                summary: nextAnalysis.summary,
                factors: nextAnalysis.factors,
              },
              {
                aiMode: backendAdvancedAI ? "advanced" : "basic",
                generatedBy: "results-page",
              }
            );

            if (saveResult.saved) {
              if (backendAppliedAiMode === "advanced") {
                setSaveNotice(
                  "Análisis avanzado guardado correctamente en tu historial."
                );
              } else {
                setSaveNotice(
                  "Análisis base guardado correctamente en tu historial."
                );
              }
            }

            if (!saveResult.saved && saveResult.reason === "no-user") {
              setSaveNotice(
                "Análisis generado. Inicia sesión para guardar este resultado en tu historial."
              );
            }

            if (!saveResult.saved && saveResult.reason === "plan-limit") {
              setSaveNotice(
                `Has alcanzado el límite de análisis guardados de tu plan ${String(
                  saveResult.plan || "actual"
                ).toUpperCase()}. Actualiza tu plan para seguir guardando resultados.`
              );
            }
          } catch (saveError: any) {
            setSaveNotice(
              saveError?.message ||
                "El análisis se generó, pero no se pudo guardar en tu historial."
            );
          }
        }
      } catch (error: any) {
        console.error("Results error:", error);

        if (!ignore) {
          setExplanationError(
            error?.message ||
              "No pudimos generar el análisis inteligente en este momento."
          );
        }
      } finally {
        if (!ignore) {
          setLoadingExplanation(false);
          setPlanLoading(false);
        }
      }
    }

    generateExplanation();

    return () => {
      ignore = true;
    };
  }, [
    formData.age,
    formData.sex,
    formData.stress,
    formData.sleep,
    formData.goal,
  ]);

  const limits = useMemo(() => getPlanLimits(plan), [plan]);
  const advancedAIEnabled = appliedAiMode === "advanced" && limits.advancedAI;
  const gatedRecommendations = advancedAIEnabled ? recommendations : [];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
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
          </div>

          <h1 className="mb-4 text-3xl font-bold">
            Tus recomendaciones personalizadas
          </h1>

          <p className="text-slate-600">
            Estas recomendaciones son orientativas y educativas. No sustituyen
            una consulta médica, un diagnóstico ni una prescripción profesional.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Info label="Edad" value={formData.age} />
            <Info label="Sexo" value={translateSex(formData.sex)} />
            <Info label="Estrés" value={translateStress(formData.stress)} />
            <Info label="Sueño" value={translateSleep(formData.sleep)} />
            <Info label="Objetivo" value={translateGoal(formData.goal)} />
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
              className="rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white hover:bg-slate-700"
            >
              Hacer otro análisis
            </Link>

            <Link
              href="/history"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver historial
            </Link>

            <Link
              href="/pricing"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver planes
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm md:col-span-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Health Score
            </h2>

            {loadingExplanation ? (
              <p className="mt-4 text-slate-600">Calculando...</p>
            ) : explanationError ? (
              <p className="mt-4 text-sm text-red-600">{explanationError}</p>
            ) : (
              <>
                <div className="mt-4 text-5xl font-bold text-slate-900">
                  {analysis?.score ?? "-"}
                  <span className="text-xl text-slate-500">/100</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Estimación orientativa basada en tu perfil actual.
                </p>
              </>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm md:col-span-2">
            <h2 className="text-xl font-semibold text-slate-900">
              Análisis inteligente
            </h2>

            {loadingExplanation ? (
              <p className="mt-3 text-slate-600">
                Generando análisis personalizado...
              </p>
            ) : explanationError ? (
              <p className="mt-3 text-red-600">{explanationError}</p>
            ) : (
              <>
                <p className="mt-3 leading-7 text-slate-700">
                  {analysis?.summary}
                </p>

                <div className="mt-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Factores principales
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis?.factors?.map((factor, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                      >
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>

                {advancedAIEnabled &&
                analysis?.advancedRecommendations?.length ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Recomendaciones avanzadas IA
                    </h3>

                    <div className="mt-3 grid gap-3">
                      {analysis.advancedRecommendations.map((item, index) => (
                        <div
                          key={`${item.title}-${index}`}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                        >
                          <div className="text-sm font-semibold text-emerald-900">
                            {item.title}
                          </div>
                          <p className="mt-1 text-sm text-emerald-800">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Recomendaciones priorizadas
          </h2>
          <p className="mt-2 text-slate-600">
            {advancedAIEnabled
              ? "Ordenadas según la prioridad estimada para tu perfil actual."
              : "La priorización inteligente de recomendaciones está disponible en los planes Pro y Premium."}
          </p>
        </div>

        <div className="mt-6">
          {planLoading ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-slate-600">
                Cargando beneficios de tu plan...
              </p>
            </div>
          ) : advancedAIEnabled ? (
            <div className="space-y-4">
              {gatedRecommendations.length > 0 ? (
                gatedRecommendations.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold">
                            {item.name}
                          </h2>
                          <PriorityBadge value={item.priority} />
                          <CategoryBadge value={item.category} />
                        </div>

                        <p className="mt-3 text-slate-600">{item.reason}</p>

                        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                          <strong>Cómo tomarlo:</strong> {item.schedule}
                        </div>

                        {item.product && (
                          <div className="mt-4 rounded-xl border border-slate-200 p-4">
                            <div className="text-sm text-slate-500">
                              Producto sugerido
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {item.product.productName}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">
                              Marca: {item.product.brand}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">
                              Precio estimado: {item.product.price}
                            </div>

                            <a
                              href={item.product.buyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                            >
                              Ver producto
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white">
                        {index + 1}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">
                    No encontramos recomendaciones
                  </h2>
                  <p className="mt-2 text-slate-600">
                    Completa correctamente el cuestionario para generar
                    sugerencias.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <PremiumGate
              title="Recomendaciones avanzadas bloqueadas"
              description="Tu plan actual incluye el análisis base. Actualiza a VitaSmart Pro o Premium para desbloquear recomendaciones priorizadas, sugerencias más profundas y acceso avanzado al marketplace inteligente."
              requiredPlan="pro"
            />
          )}
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-semibold">{value || "-"}</div>
    </div>
  );
}

function PriorityBadge({ value }: { value: string }) {
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

function CategoryBadge({ value }: { value: string }) {
  const labels: Record<string, string> = {
    energy: "Energía",
    stress: "Estrés",
    sleep: "Sueño",
    focus: "Enfoque",
    general: "Salud general",
  };

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      {labels[value] || value}
    </span>
  );
}

function translateSex(value: string) {
  if (value === "male") return "Hombre";
  if (value === "female") return "Mujer";
  return "-";
}

function translateStress(value: string) {
  if (value === "low") return "Bajo";
  if (value === "medium") return "Medio";
  if (value === "high") return "Alto";
  return "-";
}

function translateSleep(value: string) {
  if (value === "5") return "Menos de 5 horas";
  if (value === "6") return "6 horas";
  if (value === "7") return "7 horas";
  if (value === "8") return "8 o más horas";
  return "-";
}

function translateGoal(value: string) {
  if (value === "energy") return "Más energía";
  if (value === "focus") return "Mejor concentración";
  if (value === "sleep") return "Dormir mejor";
  if (value === "health") return "Salud general";
  return "-";
}
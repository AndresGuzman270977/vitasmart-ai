"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { resolveViewerState } from "../lib/viewer";
import {
  getPlanLabel,
  getUpgradeTargetLabel,
  normalizePlan,
  type UserPlan,
} from "../lib/planLimits";
import UpgradePrompt from "../../components/UpgradePrompt";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type HealthAssessment = {
  id: number;
  created_at?: string | null;

  assessment_version?: string | null;
  plan?: string | null;
  ai_mode?: string | null;
  generated_by?: string | null;

  age?: number | string | null;
  sex?: string | null;
  stress?: string | null;
  sleep?: string | null;
  goal?: string | null;
  main_goal?: string | null;

  score?: number | null;
  summary?: string | null;
  factors?: string[] | null;

  health_score?: number | null;
  sleep_score?: number | null;
  stress_score?: number | null;
  energy_score?: number | null;
  focus_score?: number | null;
  metabolic_score?: number | null;

  confidence_level?: "high" | "moderate" | "limited" | string | null;
  confidence_explanation?: string | null;

  executive_summary?: string | null;
  clinical_style_summary?: string | null;
  score_narrative?: string | null;
  professional_followup_advice?: string | null;

  strengths?: string[] | null;
  main_drivers?: string[] | null;
  priority_actions?: string[] | null;
  risk_signals?: string[] | null;

  user_id?: string | null;
};

type ChartPoint = {
  name: string;
  score: number;
  fecha: string;
};

const DEFAULT_FREE_LIMIT = 3;

export default function HistoryPage() {
  const mountedRef = useRef(true);

  const [items, setItems] = useState<HealthAssessment[]>([]);
  const [allItemsCount, setAllItemsCount] = useState(0);
  const [plan, setPlan] = useState<UserPlan>("free");
  const [planLimit, setPlanLimit] = useState<number>(DEFAULT_FREE_LIMIT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

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

  const resetUi = useCallback(() => {
    safeSetState(() => {
      setLoading(true);
      setError("");
      setNeedsLogin(false);
    });
  }, [safeSetState]);

  const loadAssessments = useCallback(
    async (userId: string, userPlanLimit: number) => {
      const { data, error } = await supabase
        .from("health_assessments")
        .select(
          `
          id,
          created_at,
          assessment_version,
          plan,
          ai_mode,
          generated_by,
          age,
          sex,
          stress,
          sleep,
          goal,
          main_goal,
          score,
          summary,
          factors,
          health_score,
          sleep_score,
          stress_score,
          energy_score,
          focus_score,
          metabolic_score,
          confidence_level,
          confidence_explanation,
          executive_summary,
          clinical_style_summary,
          score_narrative,
          professional_followup_advice,
          strengths,
          main_drivers,
          priority_actions,
          risk_signals,
          user_id
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const allItems = (data || []) as HealthAssessment[];
      const visibleItems = Number.isFinite(userPlanLimit)
        ? allItems.slice(0, userPlanLimit)
        : allItems;

      return {
        allItems,
        visibleItems,
      };
    },
    []
  );

  const loadHistory = useCallback(async () => {
    resetUi();

    try {
      const viewer = await resolveViewerState();

      if (viewer.needsLogin || !viewer.user) {
        safeSetState(() => {
          setItems([]);
          setAllItemsCount(0);
          setNeedsLogin(true);
          setPlan("free");
          setPlanLimit(DEFAULT_FREE_LIMIT);
        });
        return;
      }

      const userPlan = normalizePlan(viewer.plan);
      const rawLimit = viewer.limits.historyLimit;
      const userPlanLimit = Number.isFinite(rawLimit)
        ? Number(rawLimit)
        : Number.POSITIVE_INFINITY;

      safeSetState(() => {
        setPlan(userPlan);
        setPlanLimit(userPlanLimit);
      });

      const result = await loadAssessments(viewer.user.id, userPlanLimit);

      safeSetState(() => {
        setPlan(userPlan);
        setPlanLimit(userPlanLimit);
        setAllItemsCount(result.allItems.length);
        setItems(result.visibleItems);
      });
    } catch (err: any) {
      console.error("History error:", err);

      safeSetState(() => {
        setError(err?.message || "No se pudo cargar el historial.");
      });
    } finally {
      safeSetState(() => {
        setLoading(false);
      });
    }
  }, [loadAssessments, resetUi, safeSetState]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const chartData = useMemo<ChartPoint[]>(() => {
    return [...items]
      .slice()
      .reverse()
      .map((item, index) => ({
        name: `Análisis ${index + 1}`,
        score: resolveHealthScore(item),
        fecha: formatDate(item.created_at),
      }))
      .filter((item) => item.score > 0);
  }, [items]);

  const latest = items[0] ?? null;
  const previous = items[1] ?? null;

  const latestScore = latest ? resolveHealthScore(latest) : null;
  const previousScore = previous ? resolveHealthScore(previous) : null;

  const scoreDelta =
    latestScore !== null && previousScore !== null
      ? latestScore - previousScore
      : null;

  const averageScore = useMemo(() => {
    const valid = items
      .map((item) => resolveHealthScore(item))
      .filter((value) => value > 0);

    if (valid.length === 0) return null;

    return Math.round(
      valid.reduce((acc, value) => acc + value, 0) / valid.length
    );
  }, [items]);

  const bestScore = useMemo(() => {
    const valid = items
      .map((item) => resolveHealthScore(item))
      .filter((value) => value > 0);

    if (valid.length === 0) return null;

    return Math.max(...valid);
  }, [items]);

  const latestConfidence = normalizeConfidence(latest?.confidence_level);

  const confidenceNarrative = useMemo(() => {
    if (!latest) return "Aún no hay análisis visible.";

    if (latest.confidence_explanation?.trim()) {
      return latest.confidence_explanation.trim();
    }

    if (latestConfidence === "high") {
      return "El sistema tuvo suficiente contexto para construir una lectura más sólida.";
    }

    if (latestConfidence === "moderate") {
      return "El sistema tuvo una base útil, aunque todavía con contexto parcial.";
    }

    return "La lectura fue construida con contexto limitado. Repetir el análisis con más datos puede hacerla más útil.";
  }, [latest, latestConfidence]);

  const progressNarrative = useMemo(() => {
    if (items.length === 0) {
      return "Todavía no has empezado a construir una línea de evolución.";
    }

    if (items.length === 1) {
      return "Ya tienes tu primer punto de referencia. El verdadero valor del historial aparece cuando empiezas a comparar tu evolución en el tiempo.";
    }

    if (scoreDelta === null) {
      return "Tu historial ya empieza a mostrar una base útil de seguimiento.";
    }

    if (scoreDelta > 0) {
      return "Tu resultado más reciente mejoró frente al anterior. Hay señales positivas de progreso y continuidad.";
    }

    if (scoreDelta < 0) {
      return "Tu último resultado bajó frente al anterior. Eso también es valioso, porque te ayuda a detectar cambios y reaccionar a tiempo.";
    }

    return "Tu resultado se mantiene estable. Eso te da una base útil para seguir observando tendencias con más claridad.";
  }, [items.length, scoreDelta]);

  const visibleVsTotalNarrative = useMemo(() => {
    if (allItemsCount === 0) {
      return "Tu historial empezará a tomar valor cuando acumules tus primeros análisis.";
    }

    if (allItemsCount > items.length) {
      return `Ahora mismo estás viendo ${items.length} de ${allItemsCount} análisis. Al ampliar tu plan, puedes conservar y revisar una parte mucho más rica de tu evolución.`;
    }

    return "Tu historial visible ya te permite detectar patrones, comparar resultados y construir más contexto con el tiempo.";
  }, [allItemsCount, items.length]);

  const nextRecommendedPlan = useMemo(() => {
    if (plan === "premium") return null;
    return getUpgradeTargetLabel(plan);
  }, [plan]);

  const scoreToBest = useMemo(() => {
    if (latestScore === null || bestScore === null) return null;
    return Math.max(bestScore - latestScore, 0);
  }, [latestScore, bestScore]);

  const isHistoryTrimmed = allItemsCount > items.length;

  const historyNarrative = useMemo(() => {
    if (plan === "premium") {
      return "Estás viendo la versión más completa del historial, con la mayor continuidad disponible dentro de VitaSmart AI.";
    }

    if (plan === "pro") {
      return "Tu historial ya tiene una buena profundidad. Premium es el siguiente salto si quieres máxima continuidad y una lectura todavía más rica de tu evolución.";
    }

    return "Tu historial actual ya aporta valor, pero está limitado. Pro y Premium convierten esta sección en una herramienta mucho más útil para detectar patrones reales.";
  }, [plan]);

  const planNarrative = useMemo(() => {
    if (plan === "premium") {
      return "Ya tienes la experiencia más completa para revisar continuidad, detectar patrones y conservar contexto histórico.";
    }

    if (plan === "pro") {
      return "Tu plan ya te permite una lectura de historial más seria. Premium amplía todavía más la continuidad y la profundidad.";
    }

    return "Tu experiencia actual permite empezar a construir memoria, pero todavía con límites visibles en continuidad y contexto.";
  }, [plan]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
            VitaSmart AI · Historial
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">
            Tu evolución de salud
          </h1>

          <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-600">
            Aquí puedes revisar tus análisis guardados, detectar cambios,
            comparar resultados y construir una visión más clara de tu progreso
            con el tiempo.
          </p>

          {!needsLogin && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">
                Estado actual de tu experiencia
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {planNarrative}
              </p>
            </div>
          )}

          {!needsLogin && (
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-slate-900 px-4 py-1 text-sm font-semibold text-white">
                Plan actual: {getPlanLabel(plan)}
              </span>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-700">
                Límite visible:{" "}
                {Number.isFinite(planLimit) ? planLimit : "Ilimitado"}
              </span>

              {latest ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-700">
                  Última confianza: {translateConfidence(latestConfidence)}
                </span>
              ) : null}
            </div>
          )}

          {!needsLogin && (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                Lectura rápida de tu historial
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {historyNarrative}
              </p>
            </div>
          )}

          {!needsLogin && items.length > 0 && (
            <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-5">
              <div className="text-sm font-semibold uppercase tracking-wide text-violet-700">
                Progreso acumulado
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {visibleVsTotalNarrative}
              </p>

              <div className="mt-3 text-sm leading-6 text-slate-700">
                {progressNarrative}
              </div>

              {scoreToBest !== null && bestScore !== null && (
                <div className="mt-4 text-sm text-slate-700">
                  {scoreToBest === 0 ? (
                    <span>
                      Tu último resultado coincide con tu mejor score visible:{" "}
                      <strong>{bestScore}/100</strong>.
                    </span>
                  ) : (
                    <span>
                      Estás a <strong>{scoreToBest}</strong> punto
                      {scoreToBest === 1 ? "" : "s"} de tu mejor score visible:{" "}
                      <strong>{bestScore}/100</strong>.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {latest && (
            <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
              <div className="text-sm font-semibold text-sky-900">
                Estado del último análisis
              </div>
              <p className="mt-2 text-sm leading-6 text-sky-800">
                {confidenceNarrative}
              </p>
            </div>
          )}

          {isHistoryTrimmed && nextRecommendedPlan && (
            <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <div className="text-sm font-semibold text-sky-900">
                Tu historial completo puede darte más valor
              </div>
              <p className="mt-2 text-sm text-sky-800">
                Estás viendo solo una parte de tu evolución. Tu siguiente salto
                recomendado es <strong>{nextRecommendedPlan}</strong> para
                conservar más contexto y volver este historial mucho más útil.
              </p>

              <div className="mt-4">
                <Link
                  href="/pricing"
                  className="inline-flex rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700"
                >
                  Ver planes
                </Link>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/quiz"
              className="rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white hover:bg-slate-700"
            >
              Nuevo análisis
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ir al dashboard
            </Link>

            {needsLogin && (
              <Link
                href="/login"
                className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </section>

        {loading ? (
          <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-600">Cargando historial...</p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-red-900">
              No se pudo cargar el historial
            </h2>
            <p className="mt-3 text-red-700">{error}</p>
          </div>
        ) : needsLogin ? (
          <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900">
              Debes iniciar sesión
            </h2>
            <p className="mt-3 text-slate-600">
              Inicia sesión para ver tu historial personal de análisis.
            </p>

            <div className="mt-6">
              <Link
                href="/login"
                className="inline-block rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
              >
                Ir a login
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-5">
              <MetricCard
                title="Último score"
                value={latestScore !== null ? `${latestScore}/100` : "-"}
                subtitle="Tu resultado más reciente"
              />

              <MetricCard
                title="Cambio reciente"
                value={
                  scoreDelta === null
                    ? "-"
                    : scoreDelta > 0
                    ? `+${scoreDelta}`
                    : `${scoreDelta}`
                }
                subtitle="Comparado con el análisis anterior"
              />

              <MetricCard
                title="Promedio visible"
                value={averageScore !== null ? `${averageScore}` : "-"}
                subtitle="Promedio de tus análisis visibles"
              />

              <MetricCard
                title="Análisis visibles"
                value={`${items.length}`}
                subtitle={
                  allItemsCount > items.length
                    ? `de ${allItemsCount} totales`
                    : "Registros en pantalla"
                }
              />

              <MetricCard
                title="Mejor score"
                value={bestScore !== null ? `${bestScore}/100` : "-"}
                subtitle="Tu punto más alto visible"
              />
            </section>

            <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Evolución del Health Score
                  </h2>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                    El valor del historial no está solo en guardar datos, sino
                    en observar tendencias, repetir mediciones con continuidad y
                    entender si tus resultados se están moviendo en la dirección
                    correcta.
                  </p>
                </div>

                <Link
                  href="/quiz"
                  className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Repetir análisis
                </Link>
              </div>

              {chartData.length === 0 ? (
                <p className="mt-6 text-slate-600">
                  Aún no hay datos suficientes para mostrar la gráfica.
                </p>
              ) : (
                <div className="mt-6 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[40, 100]}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value) => [`${value}/100`, "Health Score"]}
                        labelFormatter={(label, payload) => {
                          const point = payload?.[0]?.payload as
                            | ChartPoint
                            | undefined;
                          return point?.fecha || label;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#0f172a"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Por qué este historial importa
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <InsightCard
                  title="Referencia"
                  description="Te da un punto de comparación real sobre tu evolución."
                />
                <InsightCard
                  title="Claridad"
                  description="Te ayuda a detectar si estás mejorando, estable o bajando."
                />
                <InsightCard
                  title="Continuidad"
                  description="Cada nuevo análisis aumenta el valor del sistema para ti."
                />
              </div>
            </section>

            <section className="mt-8">
              {items.length === 0 ? (
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Aún no hay análisis guardados
                  </h2>
                  <p className="mt-3 text-slate-600">
                    Haz tu primer análisis para empezar a construir tu historial.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => {
                    const score = resolveHealthScore(item);
                    const executiveSummary =
                      item.executive_summary?.trim() ||
                      item.summary?.trim() ||
                      "Sin resumen disponible.";

                    const clinicalSummary =
                      item.clinical_style_summary?.trim() || "";

                    const scoreNarrative = item.score_narrative?.trim() || "";
                    const followUp =
                      item.professional_followup_advice?.trim() || "";

                    const strengths = sanitizeStringArray(item.strengths);
                    const drivers = sanitizeStringArray(
                      item.main_drivers || item.factors
                    );
                    const priorities = sanitizeStringArray(item.priority_actions);
                    const riskSignals = sanitizeStringArray(item.risk_signals);

                    const confidence = normalizeConfidence(item.confidence_level);
                    const normalizedPlan = normalizePlan(item.plan);

                    const subscores = [
                      {
                        label: "Sueño",
                        value:
                          typeof item.sleep_score === "number"
                            ? item.sleep_score
                            : null,
                      },
                      {
                        label: "Estrés",
                        value:
                          typeof item.stress_score === "number"
                            ? item.stress_score
                            : null,
                      },
                      {
                        label: "Energía",
                        value:
                          typeof item.energy_score === "number"
                            ? item.energy_score
                            : null,
                      },
                      {
                        label: "Enfoque",
                        value:
                          typeof item.focus_score === "number"
                            ? item.focus_score
                            : null,
                      },
                      {
                        label: "Metabólico",
                        value:
                          typeof item.metabolic_score === "number"
                            ? item.metabolic_score
                            : null,
                      },
                    ];

                    return (
                      <article
                        key={item.id}
                        className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm text-slate-500">
                                {formatDate(item.created_at)}
                              </div>

                              {index === 0 && (
                                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                                  Más reciente
                                </span>
                              )}

                              {index === items.length - 1 && items.length > 1 && (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                  Más antiguo visible
                                </span>
                              )}

                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                {translateConfidence(confidence)}
                              </span>

                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                {normalizeAiMode(item.ai_mode) === "advanced"
                                  ? "IA avanzada"
                                  : "IA base"}
                              </span>

                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                {getPlanLabel(normalizedPlan)}
                              </span>

                              {item.assessment_version ? (
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                  {item.assessment_version}
                                </span>
                              ) : null}
                            </div>

                            <h2 className="mt-4 text-2xl font-semibold text-slate-900">
                              Score {score}/100
                            </h2>

                            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
                              {executiveSummary}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Badge
                                label={`Edad: ${
                                  item.age != null && item.age !== ""
                                    ? String(item.age)
                                    : "-"
                                }`}
                              />
                              <Badge label={`Sexo: ${translateSex(item.sex)}`} />
                              <Badge
                                label={`Estrés: ${translateStress(item.stress)}`}
                              />
                              <Badge
                                label={`Sueño: ${translateSleep(item.sleep)}`}
                              />
                              <Badge
                                label={`Objetivo: ${translateGoal(
                                  item.main_goal || item.goal
                                )}`}
                              />
                            </div>
                          </div>

                          <div className="rounded-3xl bg-slate-900 px-6 py-5 text-center text-white lg:min-w-[170px]">
                            <div className="text-sm text-slate-300">
                              Health Score
                            </div>
                            <div className="mt-1 text-3xl font-bold">
                              {score}
                            </div>
                            <div className="mt-2 text-xs text-slate-300">
                              {confidence === "high"
                                ? "Alta confianza"
                                : confidence === "moderate"
                                ? "Confianza media"
                                : "Confianza limitada"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 grid gap-3 md:grid-cols-5">
                          {subscores.map((sub) => (
                            <SubscoreCard
                              key={sub.label}
                              label={sub.label}
                              value={sub.value}
                            />
                          ))}
                        </div>

                        {clinicalSummary ? (
                          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                            <div className="text-sm font-semibold text-sky-900">
                              Resumen clínico-preventivo
                            </div>
                            <p className="mt-2 text-sm leading-6 text-sky-800">
                              {clinicalSummary}
                            </p>
                          </div>
                        ) : null}

                        <div className="mt-6 grid gap-4 lg:grid-cols-3">
                          <HistoryListPanel
                            title="Fortalezas"
                            items={strengths}
                            emptyText="No se registraron fortalezas específicas."
                          />

                          <HistoryListPanel
                            title="Factores dominantes"
                            items={drivers}
                            emptyText="No se registraron factores dominantes."
                          />

                          <HistoryListPanel
                            title="Prioridades sugeridas"
                            items={priorities}
                            emptyText="No se registraron prioridades específicas."
                          />
                        </div>

                        {(scoreNarrative || followUp) && (
                          <div className="mt-6 grid gap-4 lg:grid-cols-2">
                            <HistoryTextPanel
                              title="Narrativa del score"
                              text={
                                scoreNarrative ||
                                "No se registró narrativa estructurada del score."
                              }
                            />

                            <HistoryTextPanel
                              title="Recomendación de seguimiento"
                              text={
                                followUp ||
                                "No se registró consejo de seguimiento."
                              }
                            />
                          </div>
                        )}

                        {riskSignals.length > 0 && (
                          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <div className="text-sm font-semibold text-amber-900">
                              Señales de riesgo
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {riskSignals.map((signal, signalIndex) => (
                                <span
                                  key={signalIndex}
                                  className="rounded-full bg-white/80 px-3 py-1 text-sm text-amber-900"
                                >
                                  {signal}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {plan !== "premium" && (
              <div className="mt-8">
                <UpgradePrompt currentPlan={plan} context="history" />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-4xl font-bold text-slate-900">{value}</div>
      <div className="mt-3 text-sm text-slate-600">{subtitle}</div>
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

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
      {label}
    </span>
  );
}

function SubscoreCard({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const status =
    value == null
      ? "Sin dato"
      : value >= 80
        ? "Favorable"
        : value >= 60
          ? "Intermedio"
          : "Bajo";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="text-sm font-semibold text-slate-900">
          {value ?? "—"}
        </span>
      </div>

      <div className="mt-2 text-xs text-slate-500">{status}</div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${
            value == null
              ? "bg-slate-200"
              : value >= 80
                ? "bg-emerald-500"
                : value >= 60
                  ? "bg-amber-500"
                  : "bg-rose-500"
          }`}
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );
}

function HistoryListPanel({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>

      {items.length > 0 ? (
        <div className="mt-3 space-y-2">
          {items.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="rounded-xl bg-white px-3 py-2 text-sm leading-6 text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

function HistoryTextPanel({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-700">{text}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function resolveHealthScore(item: HealthAssessment): number {
  if (typeof item.health_score === "number") return item.health_score;
  if (typeof item.score === "number") return item.score;
  return 0;
}

function normalizeAiMode(value?: string | null): "basic" | "advanced" {
  return value === "advanced" ? "advanced" : "basic";
}

function normalizeConfidence(
  value?: string | null
): "high" | "moderate" | "limited" {
  if (value === "high") return "high";
  if (value === "moderate") return "moderate";
  return "limited";
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function translateConfidence(value: "high" | "moderate" | "limited") {
  if (value === "high") return "Alta confianza";
  if (value === "moderate") return "Confianza media";
  return "Confianza limitada";
}

function translateSex(value?: string | null) {
  if (value === "male") return "Hombre";
  if (value === "female") return "Mujer";
  return value || "-";
}

function translateStress(value?: string | null) {
  if (value === "low") return "Bajo";
  if (value === "medium") return "Medio";
  if (value === "high") return "Alto";
  return value || "-";
}

function translateSleep(value?: string | null) {
  if (value === "5") return "Menos de 5 horas";
  if (value === "6") return "6 horas";
  if (value === "7") return "7 horas";
  if (value === "8") return "8 o más horas";
  return value || "-";
}

function translateGoal(value?: string | null) {
  if (value === "energy") return "Más energía";
  if (value === "focus") return "Mejor concentración";
  if (value === "sleep") return "Dormir mejor";
  if (value === "health") return "Salud general";
  if (value === "general_health") return "Salud general";
  if (value === "weight") return "Peso / soporte metabólico";
  if (value === "recovery") return "Recuperación";
  return value || "-";
}
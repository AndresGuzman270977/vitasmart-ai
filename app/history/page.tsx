"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { ensureUserProfile, getCurrentUserProfile } from "../lib/profile";
import {
  getPlanLabel,
  getPlanLimits,
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
  created_at: string;
  age: string;
  sex: string;
  stress: string;
  sleep: string;
  goal: string;
  score: number;
  summary: string;
  factors: string[];
  user_id?: string | null;
};

type ChartPoint = {
  name: string;
  score: number;
  fecha: string;
};

export default function HistoryPage() {
  const [items, setItems] = useState<HealthAssessment[]>([]);
  const [allItemsCount, setAllItemsCount] = useState(0);
  const [plan, setPlan] = useState<UserPlan>("free");
  const [planLimit, setPlanLimit] = useState<number>(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      try {
        if (!ignore) {
          setLoading(true);
          setError("");
          setNeedsLogin(false);
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
            setItems([]);
            setAllItemsCount(0);
            setNeedsLogin(true);
            setPlan("free");
            setPlanLimit(3);
          }
          return;
        }

        await ensureUserProfile();
        const profile = await getCurrentUserProfile();

        const normalizedPlan = normalizePlan(profile?.plan);
        const limits = getPlanLimits(normalizedPlan);
        const userPlanLimit = limits.historyLimit;

        if (!ignore) {
          setPlan(normalizedPlan);
          setPlanLimit(
            Number.isFinite(userPlanLimit)
              ? userPlanLimit
              : Number.POSITIVE_INFINITY
          );
        }

        const { data, error } = await supabase
          .from("health_assessments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const allItems = (data || []) as HealthAssessment[];
        const visibleItems = Number.isFinite(userPlanLimit)
          ? allItems.slice(0, userPlanLimit)
          : allItems;

        if (!ignore) {
          setAllItemsCount(allItems.length);
          setItems(visibleItems);
        }
      } catch (err: any) {
        console.error("History error:", err);

        if (!ignore) {
          setError(err?.message || "No se pudo cargar el historial.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      ignore = true;
    };
  }, []);

  const chartData = useMemo<ChartPoint[]>(() => {
    return [...items]
      .slice()
      .reverse()
      .map((item, index) => ({
        name: `Análisis ${index + 1}`,
        score: Number(item.score || 0),
        fecha: formatDate(item.created_at),
      }));
  }, [items]);

  const latest = items[0] ?? null;
  const previous = items[1] ?? null;

  const latestScore = latest?.score ?? null;
  const previousScore = previous?.score ?? null;

  const scoreDelta =
    latestScore !== null && previousScore !== null
      ? latestScore - previousScore
      : null;

  const averageScore = useMemo(() => {
    if (items.length === 0) return null;
    const total = items.reduce((acc, item) => acc + Number(item.score || 0), 0);
    return Math.round(total / items.length);
  }, [items]);

  const bestScore = useMemo(() => {
    if (items.length === 0) return null;
    return Math.max(...items.map((item) => Number(item.score || 0)));
  }, [items]);

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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-4 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
            VitaSmart AI · Historial
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Tu evolución de salud
          </h1>

          <p className="mt-3 text-slate-600">
            Aquí puedes ver tus análisis guardados, detectar cambios y construir
            una visión más clara de tu progreso con el tiempo.
          </p>

          {!needsLogin && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">
                Lectura rápida de tu experiencia actual
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {historyNarrative}
              </p>
            </div>
          )}

          {!needsLogin && (
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                Plan actual: {getPlanLabel(plan)}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                Límite visible:{" "}
                {Number.isFinite(planLimit) ? planLimit : "Ilimitado"}
              </span>
            </div>
          )}

          {!needsLogin && (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                Lectura rápida de tu historial
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {progressNarrative}
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
              href="/"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver al inicio
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-slate-600">Cargando historial...</p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-red-600">{error}</p>
          </div>
        ) : needsLogin ? (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Debes iniciar sesión
            </h2>
            <p className="mt-2 text-slate-600">
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
            <div className="mt-8 grid gap-6 md:grid-cols-5">
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
            </div>

            <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Evolución del Health Score
                  </h2>
                  <p className="mt-2 text-slate-600">
                    El valor del historial no está solo en guardar datos, sino
                    en observar tendencias y repetir mediciones con continuidad.
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
                <p className="mt-4 text-slate-600">
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
            </div>

            <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
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
            </div>

            <div className="mt-8">
              {items.length === 0 ? (
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Aún no hay análisis guardados
                  </h2>
                  <p className="mt-2 text-slate-600">
                    Haz tu primer análisis para empezar a construir tu historial.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
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
                          </div>

                          <h2 className="mt-2 text-xl font-semibold text-slate-900">
                            Score {item.score}/100
                          </h2>

                          <p className="mt-2 text-slate-600">{item.summary}</p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge label={`Edad: ${item.age}`} />
                            <Badge label={`Sexo: ${translateSex(item.sex)}`} />
                            <Badge
                              label={`Estrés: ${translateStress(item.stress)}`}
                            />
                            <Badge
                              label={`Sueño: ${translateSleep(item.sleep)}`}
                            />
                            <Badge
                              label={`Objetivo: ${translateGoal(item.goal)}`}
                            />
                          </div>

                          <div className="mt-4">
                            <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                              Factores principales
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              {Array.isArray(item.factors) &&
                                item.factors.map((factor, factorIndex) => (
                                  <span
                                    key={factorIndex}
                                    className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                                  >
                                    {factor}
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-900 px-6 py-4 text-center text-white md:min-w-[140px]">
                          <div className="text-sm text-slate-300">
                            Health Score
                          </div>
                          <div className="mt-1 text-3xl font-bold">
                            {item.score}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
    <div className="rounded-2xl bg-white p-6 shadow-sm">
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

function formatDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function translateSex(value: string) {
  if (value === "male") return "Hombre";
  if (value === "female") return "Mujer";
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

function translateGoal(value: string) {
  if (value === "energy") return "Más energía";
  if (value === "focus") return "Mejor concentración";
  if (value === "sleep") return "Dormir mejor";
  if (value === "health") return "Salud general";
  return value || "-";
}
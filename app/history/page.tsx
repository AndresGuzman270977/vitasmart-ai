"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { ensureUserProfile, getCurrentUserProfile } from "../lib/profile";
import { getPlanLabel, getPlanLimits, type UserPlan } from "../lib/planLimits";
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
        setLoading(true);
        setError("");
        setNeedsLogin(false);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const user = session?.user;

        if (!user) {
          if (!ignore) {
            setItems([]);
            setAllItemsCount(0);
            setNeedsLogin(true);
          }
          return;
        }

        await ensureUserProfile();
        const profile = await getCurrentUserProfile();

        const userPlan = profile?.plan ?? "free";
        const limits = getPlanLimits(userPlan);
        const userPlanLimit = limits.historyLimit;

        if (!ignore) {
          setPlan(userPlan);
          setPlanLimit(
            Number.isFinite(userPlanLimit) ? userPlanLimit : Number.POSITIVE_INFINITY
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

  const chartData = useMemo(() => {
    return [...items]
      .slice()
      .reverse()
      .map((item, index) => ({
        name: `Análisis ${index + 1}`,
        score: item.score,
        fecha: formatDate(item.created_at),
      }));
  }, [items]);

  const latestScore = items[0]?.score ?? null;
  const previousScore = items[1]?.score ?? null;
  const scoreDelta =
    latestScore !== null && previousScore !== null
      ? latestScore - previousScore
      : null;

  const isHistoryLimited =
    Number.isFinite(planLimit) && allItemsCount > planLimit;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-4 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
            VitaSmart AI · Historial
          </div>

          <h1 className="text-3xl font-bold text-slate-900">Health History</h1>

          <p className="mt-3 text-slate-600">
            Aquí puedes ver los análisis de salud guardados en tu cuenta.
          </p>

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
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="text-sm text-slate-500">Último score</div>
                <div className="mt-2 text-4xl font-bold text-slate-900">
                  {latestScore ?? "-"}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="text-sm text-slate-500">Cambio reciente</div>
                <div className="mt-2 text-4xl font-bold text-slate-900">
                  {scoreDelta === null
                    ? "-"
                    : scoreDelta > 0
                    ? `+${scoreDelta}`
                    : scoreDelta}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="text-sm text-slate-500">Análisis visibles</div>
                <div className="mt-2 text-4xl font-bold text-slate-900">
                  {items.length}
                </div>
                {allItemsCount > items.length && (
                  <div className="mt-2 text-xs text-slate-500">
                    de {allItemsCount} totales
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                Evolución del Health Score
              </h2>

              {chartData.length === 0 ? (
                <p className="mt-4 text-slate-600">
                  Aún no hay datos suficientes para mostrar la gráfica.
                </p>
              ) : (
                <div className="mt-6 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[40, 100]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="score"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
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
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-sm text-slate-500">
                            {formatDate(item.created_at)}
                          </div>

                          <h2 className="mt-1 text-xl font-semibold text-slate-900">
                            Score {item.score}/100
                          </h2>

                          <p className="mt-2 text-slate-600">{item.summary}</p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge label={`Edad: ${item.age}`} />
                            <Badge label={`Sexo: ${translateSex(item.sex)}`} />
                            <Badge label={`Estrés: ${translateStress(item.stress)}`} />
                            <Badge label={`Sueño: ${translateSleep(item.sleep)}`} />
                            <Badge label={`Objetivo: ${translateGoal(item.goal)}`} />
                          </div>

                          <div className="mt-4">
                            <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                              Factores principales
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              {Array.isArray(item.factors) &&
                                item.factors.map((factor, index) => (
                                  <span
                                    key={index}
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

            {plan === "free" && isHistoryLimited && (
              <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Desbloquea todo tu historial
                </h2>

                <p className="mt-2 text-sm text-slate-700">
                  Estás viendo solo los primeros {planLimit} análisis de un total
                  de {allItemsCount}. Actualiza a Pro o Premium para ver más.
                </p>

                <Link
                  href="/pricing"
                  className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-white"
                >
                  Ver planes
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
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
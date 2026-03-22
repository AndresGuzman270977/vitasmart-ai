"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { getCurrentUserProfile } from "../lib/profile";
import {
  getPlanLabel,
  getPlanLimits,
  normalizePlan,
  type UserPlan,
} from "../lib/planLimits";
import HealthChart from "../../components/HealthChart";

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

type DashboardUser = {
  id: string;
  email?: string;
};

type ChartItem = {
  date: string;
  score: number;
};

export default function DashboardPage() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [items, setItems] = useState<HealthAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      try {
        if (!ignore) {
          setLoading(true);
          setError("");
          setNeedsLogin(false);
        }

        // ✅ Fuente de verdad más confiable que getSession()
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        console.log("DASHBOARD USER DEBUG:", currentUser);

        if (userError) {
          throw userError;
        }

        if (!currentUser) {
          if (!ignore) {
            setNeedsLogin(true);
            setItems([]);
            setUser(null);
            setUserPlan(null);
          }
          return;
        }

        if (!ignore) {
          setUser({
            id: currentUser.id,
            email: currentUser.email,
          });
        }

        // ✅ Perfil no debe bloquear dashboard
        try {
          const profile = await getCurrentUserProfile();

          if (!ignore) {
            setUserPlan(normalizePlan(profile?.plan));
          }
        } catch (profileError) {
          console.error("Dashboard profile error:", profileError);

          if (!ignore) {
            setUserPlan("free");
          }
        }

        const { data: assessments, error: assessmentsError } = await supabase
          .from("health_assessments")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (assessmentsError) {
          throw assessmentsError;
        }

        if (!ignore) {
          setItems((assessments || []) as HealthAssessment[]);
        }
      } catch (err: any) {
        console.error("Dashboard error:", err);

        if (!ignore) {
          setError(err?.message || "No se pudo cargar el dashboard.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    // ✅ Reacciona si cambia el estado de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("DASHBOARD AUTH CHANGE:", _event, session?.user?.id ?? null);

      if (!ignore) {
        if (!session?.user) {
          setNeedsLogin(true);
          setUser(null);
          setUserPlan(null);
          setItems([]);
          setLoading(false);
          return;
        }

        loadDashboard();
      }
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  const latest = items[0] ?? null;
  const previous = items[1] ?? null;

  const scoreDelta =
    latest && previous ? latest.score - previous.score : null;

  const latestFactors = useMemo(() => {
    if (!latest?.factors || !Array.isArray(latest.factors)) return [];
    return latest.factors.slice(0, 4);
  }, [latest]);

  const firstName = useMemo(() => {
    if (!user?.email) return "usuario";
    return user.email.split("@")[0];
  }, [user]);

  const averageScore = useMemo(() => {
    if (items.length === 0) return null;
    const total = items.reduce((acc, item) => acc + Number(item.score || 0), 0);
    return Math.round(total / items.length);
  }, [items]);

  const chartData: ChartItem[] = useMemo(() => {
    return [...items]
      .slice()
      .reverse()
      .map((item) => ({
        score: Number(item.score || 0),
        date: formatChartDate(item.created_at),
      }));
  }, [items]);

  const planLimitText = useMemo(() => {
    if (!userPlan) return "-";
    const limits = getPlanLimits(userPlan);
    return Number.isFinite(limits.historyLimit)
      ? `${limits.historyLimit}`
      : "Ilimitado";
  }, [userPlan]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        {loading ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-bold text-slate-900">
              Cargando dashboard...
            </h1>
            <p className="mt-3 text-slate-600">
              Estamos preparando tu panel de salud.
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-4 text-red-600">{error}</p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white hover:bg-slate-700"
              >
                Ir a login
              </Link>

              <Link
                href="/"
                className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        ) : needsLogin ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="mb-4 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
              VitaSmart AI · Dashboard
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              Debes iniciar sesión
            </h1>

            <p className="mt-3 text-slate-600">
              Inicia sesión para acceder a tu panel personal de salud y ver tu
              evolución.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white hover:bg-slate-700"
              >
                Ir a login
              </Link>

              <Link
                href="/"
                className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="mb-4 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
                VitaSmart AI · Dashboard
              </div>

              <h1 className="text-3xl font-bold text-slate-900">
                Hola, {firstName}
              </h1>

              <p className="mt-3 max-w-3xl text-slate-600">
                Este es tu panel principal de salud preventiva. Aquí puedes ver
                tu score actual, cambios recientes, promedio histórico y los
                factores principales detectados por la plataforma.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {userPlan && (
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                    Plan actual: {getPlanLabel(userPlan)}
                  </span>
                )}

                {userPlan && (
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                    Límite de análisis: {planLimitText}
                  </span>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/quiz"
                  className="rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white hover:bg-slate-700"
                >
                  Nuevo análisis
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
                  Gestionar plan
                </Link>
              </div>
            </section>

            <section className="mt-8 grid gap-6 md:grid-cols-5">
              <MetricCard
                title="Health Score actual"
                value={latest ? `${latest.score}/100` : "-"}
                subtitle={latest ? "Último análisis guardado" : "Sin datos aún"}
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
                title="Promedio histórico"
                value={averageScore !== null ? `${averageScore}` : "-"}
                subtitle="Promedio de todos tus análisis"
              />

              <MetricCard
                title="Total análisis"
                value={`${items.length}`}
                subtitle="Análisis registrados en tu cuenta"
              />

              <MetricCard
                title="Plan actual"
                value={userPlan ? getPlanLabel(userPlan) : "-"}
                subtitle="Nivel activo de tu cuenta"
              />
            </section>

            <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                Evolución del Health Score
              </h2>

              {chartData.length > 0 ? (
                <div className="mt-6">
                  <HealthChart data={chartData} />
                </div>
              ) : (
                <p className="mt-4 text-slate-600">
                  Aún no hay suficientes análisis para mostrar la gráfica.
                </p>
              )}
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
                <h2 className="text-xl font-semibold text-slate-900">
                  Resumen del último análisis
                </h2>

                {latest ? (
                  <>
                    <div className="mt-4 text-sm text-slate-500">
                      {formatDate(latest.created_at)}
                    </div>

                    <p className="mt-4 leading-7 text-slate-700">
                      {latest.summary}
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <InfoRow label="Edad" value={latest.age} />
                      <InfoRow label="Sexo" value={translateSex(latest.sex)} />
                      <InfoRow
                        label="Estrés"
                        value={translateStress(latest.stress)}
                      />
                      <InfoRow
                        label="Sueño"
                        value={translateSleep(latest.sleep)}
                      />
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-slate-600">
                    Aún no tienes análisis suficientes para mostrar un resumen.
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">
                  Factores principales
                </h2>

                {latestFactors.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {latestFactors.map((factor, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700"
                      >
                        {factor}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-slate-600">
                    Todavía no hay factores disponibles.
                  </p>
                )}

                <div className="mt-8 rounded-xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Próximo paso sugerido
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Realiza nuevos análisis periódicamente para detectar
                    tendencias y construir una visión más completa de tu salud.
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                Accesos rápidos
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <QuickLinkCard
                  href="/quiz"
                  title="Nuevo análisis"
                  description="Genera una nueva evaluación con IA."
                />
                <QuickLinkCard
                  href="/history"
                  title="Historial completo"
                  description="Consulta todos tus análisis guardados."
                />
                <QuickLinkCard
                  href="/marketplace"
                  title="Marketplace"
                  description="Explora suplementos recomendados para ti."
                />
              </div>
            </section>
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
      <div className="mt-3 text-4xl font-bold text-slate-900">{value}</div>
      <div className="mt-3 text-sm text-slate-600">{subtitle}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function QuickLinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:bg-slate-100"
    >
      <div className="text-lg font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatChartDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    day: "numeric",
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
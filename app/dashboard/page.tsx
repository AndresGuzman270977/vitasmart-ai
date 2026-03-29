"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { ensureUserProfile, getCurrentUserProfile } from "../lib/profile";
import {
  getPlanLabel,
  normalizePlan,
  type PlanType,
} from "../lib/planLimits";

type DashboardAssessmentRow = {
  id: number;
  created_at?: string | null;

  assessment_version?: string | null;
  plan?: string | null;
  ai_mode?: string | null;
  generated_by?: string | null;

  age?: number | string | null;
  sex?: string | null;
  main_goal?: string | null;

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
  factors?: string[] | null;

  score?: number | null;
  summary?: string | null;
};

type TrendPoint = {
  id: number;
  dateLabel: string;
  score: number;
};

export default function DashboardPage() {
  const [plan, setPlan] = useState<PlanType>("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<DashboardAssessmentRow[]>([]);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
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
          console.error("Unable to resolve dashboard plan:", err);
        }

        if (!ignore) {
          setPlan(resolvedPlan);
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          if (!ignore) {
            setItems([]);
          }
          return;
        }

        const { data, error: queryError } = await supabase
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
            main_goal,
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
            factors,
            score,
            summary
          `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12);

        if (queryError) throw queryError;

        if (!ignore) {
          setItems((data || []) as DashboardAssessmentRow[]);
        }
      } catch (err: any) {
        console.error("Dashboard load error:", err);

        if (!ignore) {
          setError(err?.message || "No se pudo cargar el dashboard.");
          setItems([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  const latest = items[0] || null;
  const previous = items[1] || null;

  const latestScore = latest ? resolveHealthScore(latest) : 0;
  const previousScore = previous ? resolveHealthScore(previous) : 0;
  const latestConfidence = normalizeConfidence(latest?.confidence_level);

  const latestSummary = useMemo(() => {
    if (!latest) return "";
    return (
      latest.executive_summary?.trim() ||
      latest.summary?.trim() ||
      "Todavía no hay una narrativa ejecutiva disponible."
    );
  }, [latest]);

  const latestClinicalSummary = useMemo(() => {
    if (!latest) return "";
    return latest.clinical_style_summary?.trim() || "";
  }, [latest]);

  const latestNarrative = useMemo(() => {
    if (!latest) return "";
    return (
      latest.score_narrative?.trim() ||
      "No se registró narrativa estructurada del score."
    );
  }, [latest]);

  const latestFollowUp = useMemo(() => {
    if (!latest) return "";
    return (
      latest.professional_followup_advice?.trim() ||
      "No se registró consejo de seguimiento."
    );
  }, [latest]);

  const trend = useMemo<TrendPoint[]>(() => {
    return items
      .slice()
      .reverse()
      .map((item) => ({
        id: item.id,
        dateLabel: formatShortDate(item.created_at),
        score: resolveHealthScore(item),
      }))
      .filter((item) => item.score > 0);
  }, [items]);

  const stats = useMemo(() => {
    const validScores = items
      .map((item) => resolveHealthScore(item))
      .filter((value) => value > 0);

    const average =
      validScores.length > 0
        ? Math.round(
            validScores.reduce((acc, value) => acc + value, 0) /
              validScores.length
          )
        : 0;

    const best = validScores.length > 0 ? Math.max(...validScores) : 0;

    const latestVsPrevious =
      items.length >= 2
        ? resolveHealthScore(items[0]) - resolveHealthScore(items[1])
        : 0;

    const positiveCount = validScores.filter((value) => value >= 80).length;

    return {
      total: items.length,
      average,
      best,
      latestVsPrevious,
      positiveCount,
    };
  }, [items]);

  const mainDrivers = sanitizeStringArray(
    latest?.main_drivers || latest?.factors || []
  );
  const priorityActions = sanitizeStringArray(latest?.priority_actions || []);
  const strengths = sanitizeStringArray(latest?.strengths || []);
  const riskSignals = sanitizeStringArray(latest?.risk_signals || []);

  const latestPlan = normalizePlan(latest?.plan);
  const latestAiMode = normalizeAiMode(latest?.ai_mode);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
            VitaSmart AI · Dashboard
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full bg-slate-900 px-4 py-1 text-sm font-semibold text-white">
              Plan actual: {getPlanLabel(plan)}
            </div>

            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
              Evaluaciones: {stats.total}
            </div>

            {latest ? (
              <>
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
                  Última IA: {latestAiMode === "advanced" ? "Avanzada" : "Base"}
                </div>

                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
                  Último plan usado: {getPlanLabel(latestPlan)}
                </div>
              </>
            ) : null}
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">
            Panel principal de salud preventiva
          </h1>

          <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-600">
            Este panel organiza tu estado más reciente, la narrativa dominante
            del último análisis y una vista rápida de evolución para ayudarte a
            actuar con más claridad, continuidad y mejor criterio preventivo.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-5">
            <StatCard
              title="Último score"
              value={latest ? String(latestScore) : "-"}
              subtitle="Health Score más reciente"
            />
            <StatCard
              title="Promedio"
              value={stats.average ? String(stats.average) : "-"}
              subtitle="Promedio de evaluaciones guardadas"
            />
            <StatCard
              title="Mejor score"
              value={stats.best ? String(stats.best) : "-"}
              subtitle="Mejor resultado histórico"
            />
            <StatCard
              title="Último cambio"
              value={
                stats.total >= 2
                  ? stats.latestVsPrevious > 0
                    ? `+${stats.latestVsPrevious}`
                    : `${stats.latestVsPrevious}`
                  : "-"
              }
              subtitle="Comparado con la evaluación anterior"
            />
            <StatCard
              title="Scores altos"
              value={String(stats.positiveCount)}
              subtitle="Resultados ≥ 80"
            />
          </div>
        </section>

        {loading ? (
          <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-600">Cargando dashboard...</p>
          </section>
        ) : error ? (
          <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-red-900">
              No se pudo cargar el dashboard
            </h2>
            <p className="mt-3 text-red-700">{error}</p>
          </section>
        ) : !latest ? (
          <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Todavía no tienes un análisis reciente
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Cuando completes tu primera evaluación, aquí verás tu score, tus
              prioridades dominantes, tu resumen ejecutivo, la lectura
              clínico-preventiva y la evolución de tus resultados a lo largo del
              tiempo.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/quiz"
                className="inline-flex rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                Hacer análisis
              </Link>

              <Link
                href="/pricing"
                className="inline-flex rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ver planes
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{formatDate(latest.created_at)}</Badge>
                  <Badge>{getPlanLabel(latestPlan)}</Badge>
                  <Badge>
                    {latestAiMode === "advanced" ? "IA avanzada" : "IA base"}
                  </Badge>
                  <ConfidencePill level={latestConfidence} />
                  {latest.assessment_version ? (
                    <Badge>{latest.assessment_version}</Badge>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                      Health Score {latestScore}/100
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
                      {latestSummary}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5 text-center">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Confianza
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {translateConfidence(latestConfidence)}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {latest.confidence_explanation?.trim()
                        ? "Explicación disponible"
                        : "Explicación no registrada"}
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MiniScoreCard label="Sleep" value={latest.sleep_score} />
                  <MiniScoreCard label="Stress" value={latest.stress_score} />
                  <MiniScoreCard label="Energy" value={latest.energy_score} />
                  <MiniScoreCard label="Focus" value={latest.focus_score} />
                  <MiniScoreCard
                    label="Metabolic"
                    value={latest.metabolic_score}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                    Acciones rápidas
                  </h2>

                  <div className="mt-6 grid gap-3">
                    <QuickLink
                      href="/quiz"
                      title="Hacer nuevo análisis"
                      description="Genera un nuevo resultado preventivo estructurado."
                      primary
                    />
                    <QuickLink
                      href="/results"
                      title="Ver resultados"
                      description="Revisar la última lectura completa."
                    />
                    <QuickLink
                      href="/marketplace"
                      title="Abrir marketplace"
                      description="Comparar suplementos según tu perfil."
                    />
                    <QuickLink
                      href="/history"
                      title="Ver historial"
                      description="Revisar evaluaciones previas guardadas."
                    />
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                    Perfil rápido del último análisis
                  </h2>

                  <div className="mt-5 space-y-3">
                    <QuickRow
                      label="Objetivo"
                      value={translateGoal(latest.main_goal)}
                    />
                    <QuickRow
                      label="Sexo"
                      value={translateSex(latest.sex)}
                    />
                    <QuickRow
                      label="Edad"
                      value={
                        latest.age != null && latest.age !== ""
                          ? String(latest.age)
                          : "-"
                      }
                    />
                    <QuickRow
                      label="Fecha"
                      value={formatDate(latest.created_at)}
                    />
                    <QuickRow
                      label="Plan usado"
                      value={getPlanLabel(latestPlan)}
                    />
                    <QuickRow
                      label="Modo IA"
                      value={latestAiMode === "advanced" ? "Avanzada" : "Base"}
                    />
                  </div>
                </div>
              </div>
            </section>

            {latestClinicalSummary ? (
              <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Resumen clínico-preventivo
                </h2>
                <p className="mt-4 max-w-5xl text-sm leading-8 text-slate-700">
                  {latestClinicalSummary}
                </p>
              </section>
            ) : null}

            <section className="mt-8 grid gap-6 xl:grid-cols-3">
              <ListPanel
                title="Fortalezas"
                items={strengths}
                emptyText="No se registraron fortalezas específicas."
              />

              <ListPanel
                title="Factores dominantes"
                items={mainDrivers}
                emptyText="No se registraron factores dominantes."
              />

              <ListPanel
                title="Prioridades sugeridas"
                items={priorityActions}
                emptyText="No se registraron prioridades específicas."
              />
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-2">
              <TextPanel title="Narrativa del score" text={latestNarrative} />

              <TextPanel
                title="Follow-up advice"
                text={latestFollowUp}
              />
            </section>

            <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Evolución reciente
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Vista simple de cómo se han movido tus scores más recientes.
                  </p>
                </div>

                <div className="text-sm text-slate-500">
                  {trend.length} punto(s)
                </div>
              </div>

              {trend.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">
                  No hay suficientes datos para mostrar evolución.
                </p>
              ) : (
                <>
                  <div className="mt-8">
                    <div className="flex items-end gap-3 overflow-x-auto pb-2">
                      {trend.map((point) => (
                        <div
                          key={point.id}
                          className="flex min-w-[84px] flex-col items-center"
                        >
                          <div className="mb-2 text-xs font-semibold text-slate-500">
                            {point.score}
                          </div>
                          <div className="flex h-52 items-end">
                            <div
                              className={`w-12 rounded-t-2xl ${
                                point.score >= 80
                                  ? "bg-emerald-500"
                                  : point.score >= 60
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ height: `${Math.max(point.score, 6)}%` }}
                            />
                          </div>
                          <div className="mt-3 text-center text-xs text-slate-500">
                            {point.dateLabel}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {previous ? (
                    <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Cambio vs evaluación anterior
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-slate-700">
                        Tu último score fue de <strong>{latestScore}</strong> y
                        el anterior fue de <strong>{previousScore}</strong>. El
                        cambio actual es de{" "}
                        <strong>
                          {stats.latestVsPrevious > 0
                            ? `+${stats.latestVsPrevious}`
                            : stats.latestVsPrevious}
                        </strong>{" "}
                        puntos.
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </section>

            {riskSignals.length > 0 ? (
              <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight text-amber-900">
                  Risk signals recientes
                </h2>

                <div className="mt-5 space-y-3">
                  {riskSignals.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-2xl bg-white/70 px-4 py-3 text-sm leading-6 text-amber-900"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Continuidad del proceso
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                    El valor real del sistema aparece cuando repites el análisis,
                    observas tendencias y ajustas tus prioridades con más
                    intención. El dashboard no es solo un resumen: es una guía de
                    continuidad.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/quiz"
                    className="inline-flex rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
                  >
                    Nuevo análisis
                  </Link>

                  <Link
                    href="/history"
                    className="inline-flex rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver historial completo
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function QuickLink({
  href,
  title,
  description,
  primary = false,
}: {
  href: string;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-4 transition ${
        primary
          ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
          : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-white"
      }`}
    >
      <div className="text-base font-semibold">{title}</div>
      <div
        className={`mt-2 text-sm leading-6 ${
          primary ? "text-slate-200" : "text-slate-600"
        }`}
      >
        {description}
      </div>
    </Link>
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

function MiniScoreCard({
  label,
  value,
}: {
  label: string;
  value?: number | null;
}) {
  const score = typeof value === "number" ? value : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="text-sm font-semibold text-slate-900">
          {score ?? "N/A"}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${
            score == null
              ? "bg-slate-200"
              : score >= 80
              ? "bg-emerald-500"
              : score >= 60
              ? "bg-amber-500"
              : "bg-rose-500"
          }`}
          style={{ width: `${score ?? 0}%` }}
        />
      </div>
    </div>
  );
}

function ListPanel({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </h3>

      {items.length > 0 ? (
        <div className="mt-4 space-y-2">
          {items.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

function TextPanel({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </h3>
      <p className="mt-4 text-sm leading-7 text-slate-700">{text}</p>
    </div>
  );
}

function QuickRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

function ConfidencePill({
  level,
}: {
  level: "high" | "moderate" | "limited";
}) {
  const styles =
    level === "high"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : level === "moderate"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}
    >
      {translateConfidence(level)}
    </span>
  );
}

function resolveHealthScore(item: DashboardAssessmentRow): number {
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

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatShortDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function translateConfidence(value: "high" | "moderate" | "limited") {
  if (value === "high") return "Alta confianza";
  if (value === "moderate") return "Confianza media";
  return "Confianza limitada";
}

function translateGoal(value?: string | null) {
  if (value === "energy") return "Más energía";
  if (value === "focus") return "Mejor concentración";
  if (value === "sleep") return "Dormir mejor";
  if (value === "general_health") return "Salud general";
  if (value === "weight") return "Peso / soporte metabólico";
  if (value === "recovery") return "Recuperación";
  return "-";
}

function translateSex(value?: string | null) {
  if (value === "male") return "Hombre";
  if (value === "female") return "Mujer";
  return "-";
}
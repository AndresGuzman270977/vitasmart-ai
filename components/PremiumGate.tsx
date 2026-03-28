"use client";

import Link from "next/link";

type PremiumGateProps = {
  title: string;
  description: string;
  requiredPlan?: "pro" | "premium";
};

export default function PremiumGate({
  title,
  description,
  requiredPlan = "pro",
}: PremiumGateProps) {
  const isPremium = requiredPlan === "premium";
  const ctaLabel = isPremium ? "Pasar a Premium" : "Desbloquear mi análisis completo";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-slate-100" />

      <div className="relative">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            {isPremium ? "Solo Premium" : "Disponible en Pro y Premium"}
          </div>

          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            Función bloqueada
          </div>
        </div>

        <h3 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h3>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          {description}
        </p>

        <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <div className="text-sm font-semibold uppercase tracking-wide text-violet-700">
            Estás viendo una parte limitada
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Al mejorar tu plan, esta sección deja de ser solo una vista parcial y
            se convierte en una herramienta mucho más útil para tomar decisiones
            con más claridad, profundidad y continuidad.
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            Lo que desbloqueas al mejorar tu plan
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <BenefitItem
              title={isPremium ? "Más profundidad" : "Más inteligencia"}
              description={
                isPremium
                  ? "Acceso a la versión más completa, refinada y valiosa de la experiencia."
                  : "Análisis, priorización y sugerencias con más contexto y más utilidad real."
              }
            />
            <BenefitItem
              title="Más personalización"
              description={
                isPremium
                  ? "Una experiencia premium con mayor profundidad y mejor sensación de valor."
                  : "Resultados más relevantes según tu perfil, tu objetivo y tus señales actuales."
              }
            />
            <BenefitItem
              title="Más continuidad"
              description={
                isPremium
                  ? "La capa más avanzada del ecosistema VitaSmart AI para usuarios que quieren la mejor versión."
                  : "Una experiencia pensada para seguimiento real, no solo para una consulta aislada."
              }
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {ctaLabel}
          </Link>

          <Link
            href="/quiz"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Hacer otro análisis
          </Link>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Empieza gratis. Mejora cuando quieras desbloquear una experiencia más
          profunda, más útil y más poderosa.
        </p>
      </div>
    </div>
  );
}

function BenefitItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
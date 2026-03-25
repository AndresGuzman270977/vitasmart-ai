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

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            Lo que desbloqueas al mejorar tu plan
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <BenefitItem
              title="Más profundidad"
              description={
                isPremium
                  ? "Acceso a la versión más completa y refinada de la experiencia."
                  : "Análisis y sugerencias con más contexto e inteligencia."
              }
            />
            <BenefitItem
              title="Más personalización"
              description={
                isPremium
                  ? "Una experiencia premium con mayor valor percibido."
                  : "Resultados más útiles según tu perfil y evolución."
              }
            />
            <BenefitItem
              title="Más continuidad"
              description={
                isPremium
                  ? "La capa más avanzada del ecosistema VitaSmart AI."
                  : "Una experiencia pensada para seguimiento real, no solo consulta puntual."
              }
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Ver planes
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
          poderosa.
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
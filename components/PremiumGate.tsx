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
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <div className="mb-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        🔒 Disponible en {requiredPlan.toUpperCase()}
      </div>

      <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mb-5 text-sm leading-6 text-slate-600">{description}</p>

      <Link
        href="/pricing"
        className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Ver planes
      </Link>
    </div>
  );
}
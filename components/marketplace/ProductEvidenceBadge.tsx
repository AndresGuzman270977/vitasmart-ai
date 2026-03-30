"use client";

type Locale = "es" | "en";

type ProductEvidenceBadgeProps = {
  evidenceLevel?: "high" | "moderate" | "limited";
  locale?: Locale;
};

const textByLocale = {
  es: {
    high: "Evidencia alta",
    moderate: "Evidencia moderada",
    limited: "Evidencia limitada",
  },
  en: {
    high: "High evidence",
    moderate: "Moderate evidence",
    limited: "Limited evidence",
  },
} as const;

export default function ProductEvidenceBadge({
  evidenceLevel,
  locale = "es",
}: ProductEvidenceBadgeProps) {
  if (!evidenceLevel) return null;

  const t = textByLocale[locale] ?? textByLocale.es;

  const config =
    evidenceLevel === "high"
      ? {
          label: t.high,
          className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        }
      : evidenceLevel === "moderate"
      ? {
          label: t.moderate,
          className: "border-amber-200 bg-amber-50 text-amber-700",
        }
      : {
          label: t.limited,
          className: "border-slate-200 bg-slate-100 text-slate-700",
        };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${config.className}`}
    >
      {config.label}
    </span>
  );
}
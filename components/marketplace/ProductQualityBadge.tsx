"use client";

type Locale = "es" | "en";

type ProductQualityBadgeProps = {
  value:
    | "excellent"
    | "very_good"
    | "good"
    | "USP_VERIFIED"
    | "NSF_173"
    | "GMP"
    | "THIRD_PARTY_TESTED"
    | "NONE";
  locale?: Locale;
};

const labelsByLocale = {
  es: {
    excellent: "Excelente",
    very_good: "Muy buena",
    good: "Buena",
    USP_VERIFIED: "Certificado USP",
    NSF_173: "NSF 173",
    GMP: "Buenas prácticas (GMP)",
    THIRD_PARTY_TESTED: "Testeado por terceros",
    NONE: "Básico",
  },
  en: {
    excellent: "Excellent",
    very_good: "Very good",
    good: "Good",
    USP_VERIFIED: "USP Verified",
    NSF_173: "NSF 173",
    GMP: "GMP",
    THIRD_PARTY_TESTED: "3rd Party Tested",
    NONE: "Basic",
  },
} as const;

export default function ProductQualityBadge({
  value,
  locale = "es",
}: ProductQualityBadgeProps) {
  const labels = labelsByLocale[locale] ?? labelsByLocale.es;

  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
      {labels[value] || value}
    </span>
  );
}
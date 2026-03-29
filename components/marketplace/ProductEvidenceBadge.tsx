"use client";

type ProductEvidenceBadgeProps = {
  evidenceLevel?: "high" | "moderate" | "limited";
};

export default function ProductEvidenceBadge({
  evidenceLevel,
}: ProductEvidenceBadgeProps) {
  if (!evidenceLevel) return null;

  const config =
    evidenceLevel === "high"
      ? {
          label: "Evidence high",
          className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        }
      : evidenceLevel === "moderate"
      ? {
          label: "Evidence moderate",
          className: "border-amber-200 bg-amber-50 text-amber-700",
        }
      : {
          label: "Evidence limited",
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
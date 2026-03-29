"use client";

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
};

export default function ProductQualityBadge({
  value,
}: ProductQualityBadgeProps) {
  const map: Record<string, string> = {
    excellent: "Excelente",
    very_good: "Muy buena",
    good: "Buena",
    USP_VERIFIED: "USP Verified",
    NSF_173: "NSF 173",
    GMP: "GMP",
    THIRD_PARTY_TESTED: "3rd Party Tested",
    NONE: "Basic",
  };

  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
      {map[value] || value}
    </span>
  );
}
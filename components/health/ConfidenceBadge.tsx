// components/health/ConfidenceBadge.tsx

"use client";

type ConfidenceBadgeProps = {
  level: "high" | "moderate" | "limited";
  explanation?: string;
};

function getLevelStyles(level: ConfidenceBadgeProps["level"]) {
  switch (level) {
    case "high":
      return {
        label: "High confidence",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "moderate":
      return {
        label: "Moderate confidence",
        className:
          "border-amber-200 bg-amber-50 text-amber-700",
      };
    case "limited":
    default:
      return {
        label: "Limited confidence",
        className:
          "border-slate-200 bg-slate-100 text-slate-700",
      };
  }
}

export default function ConfidenceBadge({
  level,
  explanation,
}: ConfidenceBadgeProps) {
  const styles = getLevelStyles(level);

  return (
    <div className="flex flex-col gap-2">
      <span
        className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${styles.className}`}
      >
        {styles.label}
      </span>

      {explanation ? (
        <p className="max-w-xl text-sm leading-6 text-slate-600">
          {explanation}
        </p>
      ) : null}
    </div>
  );
}
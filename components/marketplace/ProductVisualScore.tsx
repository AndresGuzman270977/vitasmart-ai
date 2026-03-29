"use client";

type ProductVisualScoreProps = {
  label: string;
  value: number | null | undefined;
};

function getTone(value: number) {
  if (value >= 85) return "bg-emerald-500";
  if (value >= 70) return "bg-amber-500";
  return "bg-slate-400";
}

export default function ProductVisualScore({
  label,
  value,
}: ProductVisualScoreProps) {
  const safeValue =
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(100, Math.round(value)))
      : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </span>
        <span className="text-sm font-semibold text-slate-900">
          {safeValue ?? "N/A"}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${safeValue != null ? getTone(safeValue) : "bg-slate-200"}`}
          style={{ width: `${safeValue ?? 0}%` }}
        />
      </div>
    </div>
  );
}
// components/health/ResultSubscoresGrid.tsx

"use client";

type SubscoreItemProps = {
  label: string;
  value: number | null;
};

function getBarWidth(value: number | null) {
  if (value == null) return "0%";
  const safe = Math.max(0, Math.min(100, value));
  return `${safe}%`;
}

function getValueTone(value: number | null) {
  if (value == null) return "bg-slate-300";
  if (value >= 80) return "bg-emerald-500";
  if (value >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

function SubscoreItem({ label, value }: SubscoreItemProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="text-lg font-semibold text-slate-900">
          {value ?? "N/A"}
        </span>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${getValueTone(value)}`}
          style={{ width: getBarWidth(value) }}
        />
      </div>
    </div>
  );
}

type ResultSubscoresGridProps = {
  sleepScore: number | null;
  stressScore: number | null;
  energyScore: number | null;
  focusScore: number | null;
  metabolicScore: number | null;
};

export default function ResultSubscoresGrid({
  sleepScore,
  stressScore,
  energyScore,
  focusScore,
  metabolicScore,
}: ResultSubscoresGridProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Subscores
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          These subscores organize the current profile into key preventive support domains.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SubscoreItem label="Sleep" value={sleepScore} />
        <SubscoreItem label="Stress" value={stressScore} />
        <SubscoreItem label="Energy" value={energyScore} />
        <SubscoreItem label="Focus" value={focusScore} />
        <SubscoreItem label="Metabolic" value={metabolicScore} />
      </div>
    </section>
  );
}
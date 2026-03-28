"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type HealthChartItem = {
  date: string;
  score: number;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{
    value: number;
  }>;
  label?: string;
};

function getScoreTone(value: number) {
  if (value >= 85) return "Muy buen nivel";
  if (value >= 70) return "Base sólida";
  if (value >= 55) return "Mejorable";
  return "Atención prioritaria";
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const value = Number(payload[0]?.value ?? 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">
        {value}/100
      </div>
      <div className="text-xs text-slate-500">Health Score</div>
      <div className="mt-2 text-xs font-medium text-slate-700">
        {getScoreTone(value)}
      </div>
    </div>
  );
}

export default function HealthChart({
  data,
}: {
  data: HealthChartItem[];
}) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#0f172a"
            strokeWidth={3}
            dot={{
              r: 4,
              strokeWidth: 2,
              stroke: "#0f172a",
              fill: "#ffffff",
            }}
            activeDot={{
              r: 6,
              stroke: "#0f172a",
              strokeWidth: 2,
              fill: "#ffffff",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
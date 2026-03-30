// components/health/ResultInsightsPanel.tsx

"use client";

type ResultInsightsPanelProps = {
  scoreNarrative: string;
  strengths: string[];
  mainDrivers: string[];
  priorityActions: string[];
  riskSignals: string[];
  dominantNeeds: string[];
  secondaryNeeds: string[];
  advancedRecommendations: string[];
};

type ListCardProps = {
  title: string;
  items: string[];
};

function ListCard({ title, items }: ListCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </h3>

      {items.length > 0 ? (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-500">
          No se destacaron elementos adicionales en esta sección.
        </p>
      )}
    </div>
  );
}

function humanizeNeed(item: string) {
  return item
    .replace(/Need$/i, "")
    .replace(/([A-Z])/g, " $1")
    .replaceAll("_", " ")
    .trim();
}

export default function ResultInsightsPanel({
  scoreNarrative,
  strengths,
  mainDrivers,
  priorityActions,
  riskSignals,
  dominantNeeds,
  secondaryNeeds,
  advancedRecommendations,
}: ResultInsightsPanelProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Insights
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Interpretación estructurada de las señales de soporte más relevantes
          dentro de tu perfil actual.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Narrativa del score
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          {scoreNarrative}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ListCard title="Fortalezas" items={strengths} />
        <ListCard title="Factores principales" items={mainDrivers} />
        <ListCard title="Acciones prioritarias" items={priorityActions} />
        <ListCard title="Señales de riesgo" items={riskSignals} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Necesidades dominantes
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {dominantNeeds.length > 0 ? (
              dominantNeeds.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                >
                  {humanizeNeed(item)}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">
                No se destacaron necesidades dominantes.
              </span>
            )}
          </div>

          <h4 className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Necesidades secundarias
          </h4>
          <div className="mt-4 flex flex-wrap gap-2">
            {secondaryNeeds.length > 0 ? (
              secondaryNeeds.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700"
                >
                  {humanizeNeed(item)}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">
                No se destacaron necesidades secundarias.
              </span>
            )}
          </div>
        </div>

        <ListCard
          title="Recomendaciones avanzadas"
          items={advancedRecommendations}
        />
      </div>
    </section>
  );
}
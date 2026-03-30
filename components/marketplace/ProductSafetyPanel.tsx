"use client";

type Locale = "es" | "en";

type ProductSafetyPanelProps = {
  restrictionsSummary: string;
  sideEffectsSummary: string;
  cautions?: string[];
  locale?: Locale;
};

const textByLocale = {
  es: {
    title: "Contexto de seguridad",
    restrictions: "Restricciones",
    sideEffects: "Posibles efectos secundarios",
    cautions: "Precauciones",
  },
  en: {
    title: "Safety context",
    restrictions: "Restrictions",
    sideEffects: "Possible side effects",
    cautions: "Cautions",
  },
} as const;

export default function ProductSafetyPanel({
  restrictionsSummary,
  sideEffectsSummary,
  cautions = [],
  locale = "es",
}: ProductSafetyPanelProps) {
  const t = textByLocale[locale] ?? textByLocale.es;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">
        {t.title}
      </h4>

      <div className="mt-3 space-y-3">
        <p className="text-sm leading-6 text-amber-900">
          <strong>{t.restrictions}:</strong> {restrictionsSummary}
        </p>

        <p className="text-sm leading-6 text-amber-900">
          <strong>{t.sideEffects}:</strong> {sideEffectsSummary}
        </p>

        {cautions.length > 0 ? (
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {t.cautions}:
            </p>

            <div className="mt-2 space-y-2">
              {cautions.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-xl bg-white/70 px-3 py-2 text-sm leading-6 text-amber-900"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
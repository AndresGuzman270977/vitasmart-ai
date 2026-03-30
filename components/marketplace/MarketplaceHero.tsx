"use client";

type MarketplaceHeroProps = {
  plan: "free" | "pro" | "premium";
  personalized: boolean;
  ingredientName?: string;
};

function getPlanLabel(plan: MarketplaceHeroProps["plan"]) {
  if (plan === "premium") return "Premium";
  if (plan === "pro") return "Pro";
  return "Free";
}

export default function MarketplaceHero({
  plan,
  personalized,
  ingredientName,
}: MarketplaceHeroProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
          VitaSmart AI Marketplace
        </span>

        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
          Plan {getPlanLabel(plan)}
        </span>

        <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
          {personalized ? "Modo personalizado" : "Modo catálogo"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Comparador premium de suplementos, priorizado para tu perfil
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            Este marketplace organiza los productos según la relevancia del
            ingrediente, el nivel de presupuesto, el contexto de calidad, el
            resumen de evidencia científica y la guía práctica de uso. Está
            diseñado para ayudarte a comparar opciones de forma más clara, no
            para sustituir el criterio clínico profesional.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Estado de personalización
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-700">
            {personalized
              ? `La comparación actual de productos está priorizada alrededor de ${ingredientName || "tus señales de ingredientes más relevantes en este momento"}.`
              : "Actualmente no hay un conjunto de recomendaciones personalizadas cargado, por lo que se está mostrando una vista más amplia del catálogo."}
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-700">
            Las explicaciones de cada producto están estructuradas para ser más
            útiles y claras: por qué aparece, resumen científico, señales de
            calidad, forma de uso, restricciones, posibles efectos secundarios
            y lógica de presupuesto.
          </p>
        </div>
      </div>
    </section>
  );
}
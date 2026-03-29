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
          {personalized ? "Personalized mode" : "Catalog mode"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Premium supplement comparison, prioritized for your profile
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            This marketplace organizes products by ingredient relevance, budget
            tier, quality context, science summary, and practical use guidance.
            It is built to help you compare options more clearly, not to replace
            clinical judgment.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Personalization status
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-700">
            {personalized
              ? `Your current product comparison is being prioritized around ${ingredientName || "your strongest current ingredient signals"}.`
              : "No personalized recommendation set is currently loaded, so a broader catalog view is being shown."}
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-700">
            Product explanations are designed to be more useful and more
            structured: why it appears, science summary, quality signals, how to
            take it, restrictions, side effects, and budget rationale.
          </p>
        </div>
      </div>
    </section>
  );
}
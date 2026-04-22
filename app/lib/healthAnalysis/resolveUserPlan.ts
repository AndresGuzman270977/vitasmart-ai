// app/lib/healthAnalysis/resolveUserPlan.ts

import { AppliedAiMode, RequestedAiMode, UserPlan } from "./types";

type ResolveUserPlanResult = {
  plan: UserPlan;
  requestedAiMode: RequestedAiMode;
  appliedAiMode: AppliedAiMode;
  advancedAI: boolean;
  wasDowngraded: boolean;
  upgradeRequired: boolean;
  upgradeMessage: string | null;
};

function normalizePlan(plan?: string | null): UserPlan {
  const normalized = String(plan || "")
    .trim()
    .toLowerCase();

  if (normalized === "pro") return "pro";
  if (normalized === "premium") return "premium";
  return "free";
}

function normalizeRequestedAiMode(
  value?: string | null
): RequestedAiMode {
  return value === "advanced" ? "advanced" : "basic";
}

function buildUpgradeMessage(
  plan: UserPlan,
  requestedAiMode: RequestedAiMode,
  appliedAiMode: AppliedAiMode
): string | null {
  if (requestedAiMode !== "advanced" || appliedAiMode !== "basic") {
    return null;
  }

  if (plan === "free") {
    return "El análisis avanzado y una interpretación más profunda requieren Pro o Premium.";
  }

  return "Tu plan actual no permite aplicar el modo avanzado solicitado.";
}

export function resolveUserPlanAndAiMode(
  plan: UserPlan,
  requestedAiMode: RequestedAiMode
): ResolveUserPlanResult {
  const safePlan = normalizePlan(plan);
  const safeRequestedAiMode = normalizeRequestedAiMode(requestedAiMode);

  const advancedAllowed = safePlan === "pro" || safePlan === "premium";

  const appliedAiMode: AppliedAiMode =
    safeRequestedAiMode === "advanced" && advancedAllowed
      ? "advanced"
      : "basic";

  const wasDowngraded =
    safeRequestedAiMode === "advanced" && appliedAiMode === "basic";

  const upgradeMessage = buildUpgradeMessage(
    safePlan,
    safeRequestedAiMode,
    appliedAiMode
  );

  return {
    plan: safePlan,
    requestedAiMode: safeRequestedAiMode,
    appliedAiMode,
    advancedAI: appliedAiMode === "advanced",
    wasDowngraded,
    upgradeRequired: wasDowngraded,
    upgradeMessage,
  };
}
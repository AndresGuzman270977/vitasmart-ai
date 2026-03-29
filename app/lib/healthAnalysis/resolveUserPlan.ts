// app/lib/healthAnalysis/resolveUserPlan.ts

import { AppliedAiMode, RequestedAiMode, UserPlan } from "./types";

export function resolveUserPlanAndAiMode(
  plan: UserPlan,
  requestedAiMode: RequestedAiMode
): {
  plan: UserPlan;
  requestedAiMode: RequestedAiMode;
  appliedAiMode: AppliedAiMode;
  advancedAI: boolean;
  wasDowngraded: boolean;
  upgradeRequired: boolean;
  upgradeMessage: string | null;
} {
  const advancedAllowed = plan === "pro" || plan === "premium";

  const appliedAiMode: AppliedAiMode =
    requestedAiMode === "advanced" && advancedAllowed ? "advanced" : "basic";

  const wasDowngraded =
    requestedAiMode === "advanced" && appliedAiMode === "basic";

  return {
    plan,
    requestedAiMode,
    appliedAiMode,
    advancedAI: appliedAiMode === "advanced",
    wasDowngraded,
    upgradeRequired: wasDowngraded,
    upgradeMessage: wasDowngraded
      ? "Advanced analysis and deeper biomarker interpretation require Pro or Premium."
      : null,
  };
}
export type PlanType = "free" | "pro" | "premium";
export type UserPlan = PlanType;
export type MarketplaceMode = "basic" | "smart" | "premium";

export type PlanLimits = {
  historyLimit: number;
  advancedAI: boolean;
  marketplaceMode: MarketplaceMode;
};

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    historyLimit: 3,
    advancedAI: false,
    marketplaceMode: "basic",
  },
  pro: {
    historyLimit: 50,
    advancedAI: true,
    marketplaceMode: "smart",
  },
  premium: {
    historyLimit: Infinity,
    advancedAI: true,
    marketplaceMode: "premium",
  },
};

export function normalizePlan(plan?: string | null): PlanType {
  if (plan === "pro" || plan === "premium") {
    return plan;
  }

  return "free";
}

export function getPlanLimits(plan: PlanType): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)] || PLAN_LIMITS.free;
}

export function canSaveMoreAnalyses(
  plan: PlanType,
  currentCount: number
): boolean {
  const limits = getPlanLimits(plan);

  if (!Number.isFinite(limits.historyLimit)) {
    return true;
  }

  return currentCount < limits.historyLimit;
}

export function hasAdvancedAI(plan: PlanType): boolean {
  return getPlanLimits(plan).advancedAI;
}

export function getMarketplaceMode(plan: PlanType): MarketplaceMode {
  return getPlanLimits(plan).marketplaceMode;
}

export function isPremiumPlan(plan: PlanType): boolean {
  return normalizePlan(plan) === "premium";
}

export function isProOrHigher(plan: PlanType): boolean {
  const normalized = normalizePlan(plan);
  return normalized === "pro" || normalized === "premium";
}

export function getPlanLabel(plan: PlanType): string {
  const normalized = normalizePlan(plan);

  if (normalized === "premium") return "Premium";
  if (normalized === "pro") return "Pro";
  return "Free";
}
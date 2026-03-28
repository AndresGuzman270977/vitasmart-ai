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

const PLAN_ORDER: Record<PlanType, number> = {
  free: 0,
  pro: 1,
  premium: 2,
};

export function normalizePlan(plan?: string | null): PlanType {
  const normalized = String(plan || "")
    .trim()
    .toLowerCase();

  if (normalized === "pro") return "pro";
  if (normalized === "premium") return "premium";
  return "free";
}

export function getPlanLimits(plan: PlanType): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)];
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
  return getPlanRank(plan) >= PLAN_ORDER.pro;
}

export function isFreePlan(plan: PlanType): boolean {
  return normalizePlan(plan) === "free";
}

export function getPlanRank(plan: PlanType): number {
  return PLAN_ORDER[normalizePlan(plan)];
}

export function isSameOrHigherPlan(
  currentPlan: PlanType,
  targetPlan: PlanType
): boolean {
  return getPlanRank(currentPlan) >= getPlanRank(targetPlan);
}

export function getNextPlan(plan: PlanType): PlanType | null {
  const normalized = normalizePlan(plan);

  if (normalized === "free") return "pro";
  if (normalized === "pro") return "premium";
  return null;
}

export function getUpgradeTargetPlan(plan: PlanType): PlanType | null {
  return getNextPlan(plan);
}

export function getPlanLabel(plan: PlanType): string {
  const normalized = normalizePlan(plan);

  if (normalized === "premium") return "Premium";
  if (normalized === "pro") return "Pro";
  return "Free";
}

export function getUpgradeTargetLabel(plan: PlanType): string {
  const nextPlan = getNextPlan(plan);

  if (!nextPlan) return "Premium";
  return getPlanLabel(nextPlan);
}

export function getHistoryLimitLabel(plan: PlanType): string {
  const limits = getPlanLimits(plan);

  if (!Number.isFinite(limits.historyLimit)) {
    return "Ilimitado";
  }

  return String(limits.historyLimit);
}
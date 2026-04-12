import { supabase } from "./supabase";
import { ensureUserProfile, getCurrentUserProfile } from "./profile";
import { getPlanLimits, normalizePlan, type UserPlan } from "./planLimits";

export type ViewerProfile = Awaited<ReturnType<typeof getCurrentUserProfile>>;

export type ViewerState = {
  user: {
    id: string;
    email?: string | null;
  } | null;
  profile: ViewerProfile | null;
  plan: UserPlan;
  limits: ReturnType<typeof getPlanLimits>;
  needsLogin: boolean;
};

export async function resolveViewerState(): Promise<ViewerState> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    const freePlan: UserPlan = "free";

    return {
      user: null,
      profile: null,
      plan: freePlan,
      limits: getPlanLimits(freePlan),
      needsLogin: true,
    };
  }

  let profile: ViewerProfile | null = null;
  let plan: UserPlan = "free";

  try {
    await ensureUserProfile();
    profile = await getCurrentUserProfile();
    plan = normalizePlan(profile?.plan);
  } catch (profileError) {
    console.error("resolveViewerState profile error:", profileError);
    profile = null;
    plan = "free";
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    profile,
    plan,
    limits: getPlanLimits(plan),
    needsLogin: false,
  };
}
import { supabase } from "./supabase";
import { normalizePlan, type PlanType } from "./planLimits";

export type UserProfile = {
  id: string;
  email?: string | null;
  plan: PlanType;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  cancel_at_period_end?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

type BasicUser = {
  id: string;
  email?: string | null;
};

type UserProfileRow = {
  id: string;
  email?: string | null;
  plan?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  cancel_at_period_end?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

const DEFAULT_PLAN: PlanType = "free";

function makeFallbackProfile(user: BasicUser): UserProfile {
  return {
    id: user.id,
    email: user.email ?? null,
    plan: DEFAULT_PLAN,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: null,
    cancel_at_period_end: false,
    created_at: undefined,
    updated_at: undefined,
  };
}

async function getAuthenticatedUser(): Promise<BasicUser | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Error getting authenticated user:", error.message);
      return null;
    }

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? null,
    };
  } catch (error: any) {
    console.error(
      "Unexpected error getting authenticated user:",
      error?.message || error
    );
    return null;
  }
}

function normalizeProfile(data: UserProfileRow): UserProfile {
  return {
    id: data.id,
    email: data.email ?? null,
    plan: normalizePlan(data.plan),
    stripe_customer_id: data.stripe_customer_id ?? null,
    stripe_subscription_id: data.stripe_subscription_id ?? null,
    subscription_status: data.subscription_status ?? null,
    cancel_at_period_end: Boolean(data.cancel_at_period_end),
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

async function selectProfileByUserId(userId: string): Promise<UserProfileRow | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      "id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status, cancel_at_period_end, created_at, updated_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as UserProfileRow | null) ?? null;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const data = await selectProfileByUserId(userId);

    if (!data) {
      return null;
    }

    return normalizeProfile(data);
  } catch (error: any) {
    console.error(
      "Unexpected error loading user profile:",
      error?.message || error
    );
    return null;
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  return getUserProfile(user.id);
}

export async function ensureUserProfile(): Promise<UserProfile | null> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const existingProfile = await getUserProfile(user.id);

  if (existingProfile) {
    return existingProfile;
  }

  const payload = {
    id: user.id,
    email: user.email ?? null,
    plan: DEFAULT_PLAN,
    cancel_at_period_end: false,
  };

  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert([payload], {
        onConflict: "id",
      })
      .select(
        "id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status, cancel_at_period_end, created_at, updated_at"
      )
      .maybeSingle();

    if (error) {
      console.error("Error ensuring user profile:", error.message);
      return makeFallbackProfile(user);
    }

    if (!data) {
      return makeFallbackProfile(user);
    }

    return normalizeProfile(data as UserProfileRow);
  } catch (error: any) {
    console.error(
      "Unexpected error ensuring user profile:",
      error?.message || error
    );
    return makeFallbackProfile(user);
  }
}

export async function updateUserPlan(
  userId: string,
  plan: PlanType
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({
      plan: normalizePlan(plan),
    })
    .eq("id", userId)
    .select(
      "id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status, cancel_at_period_end, created_at, updated_at"
    )
    .single();

  if (error) {
    throw error;
  }

  return normalizeProfile(data as UserProfileRow);
}

export async function getCurrentStripeCustomerId(): Promise<string | null> {
  const profile = await getCurrentUserProfile();
  return profile?.stripe_customer_id ?? null;
}

export async function getCurrentStripeSubscriptionId(): Promise<string | null> {
  const profile = await getCurrentUserProfile();
  return profile?.stripe_subscription_id ?? null;
}

export async function getCurrentSubscriptionStatus(): Promise<string | null> {
  const profile = await getCurrentUserProfile();
  return profile?.subscription_status ?? null;
}

export async function getCurrentCancelAtPeriodEnd(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return Boolean(profile?.cancel_at_period_end);
}
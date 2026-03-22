import { supabase } from "./supabase";
import { normalizePlan, type PlanType } from "./planLimits";

export type UserProfile = {
  id: string;
  email?: string | null;
  plan: PlanType;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  created_at?: string;
  updated_at?: string;
};

const DEFAULT_PLAN: PlanType = "free";

type BasicUser = {
  id: string;
  email?: string | null;
};

function makeFallbackProfile(user: BasicUser): UserProfile {
  return {
    id: user.id,
    email: user.email ?? null,
    plan: DEFAULT_PLAN,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: null,
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
    console.error("Unexpected error getting authenticated user:", error?.message || error);
    return null;
  }
}

function normalizeProfile(data: any): UserProfile {
  return {
    id: data.id,
    email: data.email ?? null,
    plan: normalizePlan(data.plan),
    stripe_customer_id: data.stripe_customer_id ?? null,
    stripe_subscription_id: data.stripe_subscription_id ?? null,
    subscription_status: data.subscription_status ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error loading user profile:", error.message);
      return null;
    }

    if (!data) {
      return null;
    }

    return normalizeProfile(data);
  } catch (error: any) {
    console.error("Unexpected error loading user profile:", error?.message || error);
    return null;
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  return await getUserProfile(user.id);
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
  };

  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert([payload], {
        onConflict: "id",
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error ensuring user profile:", error.message);
      return makeFallbackProfile(user);
    }

    if (!data) {
      return makeFallbackProfile(user);
    }

    return normalizeProfile(data);
  } catch (error: any) {
    console.error("Unexpected error ensuring user profile:", error?.message || error);
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
    .select()
    .single();

  if (error) {
    throw error;
  }

  return normalizeProfile(data);
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
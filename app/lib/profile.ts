import { supabase } from "./supabase";
import { getCurrentUser } from "./auth";
import type { PlanType } from "./planLimits";

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

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
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

  return data as UserProfile;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return getUserProfile(user.id);
}

export async function ensureUserProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser();

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

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert([payload], {
      onConflict: "id",
    })
    .select()
    .single();

  if (error) {
    console.error("Error ensuring user profile:", error.message);
    throw error;
  }

  return data as UserProfile;
}

export async function updateUserPlan(
  userId: string,
  plan: PlanType
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({
      plan,
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as UserProfile;
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
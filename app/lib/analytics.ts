import { supabase } from "./supabase";
import { getCurrentUser } from "./auth";
import { normalizePlan, type PlanType } from "./planLimits";

type TrackEventInput = {
  eventName: string;
  page?: string;
  plan?: PlanType | string | null;
  metadata?: Record<string, unknown>;
};

export async function trackEvent({
  eventName,
  page,
  plan,
  metadata = {},
}: TrackEventInput) {
  try {
    const user = await getCurrentUser();

    await supabase.from("app_events").insert([
      {
        user_id: user?.id ?? null,
        event_name: eventName,
        page: page ?? null,
        plan: plan ? normalizePlan(plan) : null,
        metadata,
      },
    ]);
  } catch (error) {
    console.warn("trackEvent failed:", error);
  }
}
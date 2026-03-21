import { supabase } from "./supabase";
import { getCurrentUser } from "./auth";
import {
  canSaveMoreAnalyses,
  getPlanLimits,
  type UserPlan,
} from "./planLimits";
import { ensureUserProfile, getCurrentUserProfile } from "./profile";

type SaveAssessmentInput = {
  age: string;
  sex: string;
  stress: string;
  sleep: string;
  goal: string;
  score: number;
  summary: string;
  factors: string[];
};

export type AssessmentAiMode = "basic" | "advanced";

type SaveAssessmentMetadata = {
  aiMode?: AssessmentAiMode;
  generatedBy?: string;
};

type SaveAssessmentSuccess = {
  saved: true;
  plan: UserPlan;
  aiModeApplied: AssessmentAiMode;
};

type SaveAssessmentNoUser = {
  saved: false;
  reason: "no-user";
};

type SaveAssessmentPlanLimit = {
  saved: false;
  reason: "plan-limit";
  plan: UserPlan;
};

export type SaveAssessmentResult =
  | SaveAssessmentSuccess
  | SaveAssessmentNoUser
  | SaveAssessmentPlanLimit;

function buildBasePayload(data: SaveAssessmentInput, userId: string) {
  return {
    age: data.age,
    sex: data.sex,
    stress: data.stress,
    sleep: data.sleep,
    goal: data.goal,
    score: data.score,
    summary: data.summary,
    factors: data.factors,
    user_id: userId,
  };
}

export async function saveAssessment(
  data: SaveAssessmentInput,
  metadata?: SaveAssessmentMetadata
): Promise<SaveAssessmentResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { saved: false, reason: "no-user" };
  }

  await ensureUserProfile();

  const profile = await getCurrentUserProfile();

  if (!profile) {
    throw new Error("No se pudo cargar el perfil del usuario.");
  }

  const { count, error: countError } = await supabase
    .from("health_assessments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    throw countError;
  }

  const currentCount = count ?? 0;

  if (!canSaveMoreAnalyses(profile.plan, currentCount)) {
    return {
      saved: false,
      reason: "plan-limit",
      plan: profile.plan,
    };
  }

  const limits = getPlanLimits(profile.plan);
  const requestedAiMode = metadata?.aiMode ?? "basic";

  const finalAiMode: AssessmentAiMode =
    requestedAiMode === "advanced" && limits.advancedAI ? "advanced" : "basic";

  const insertPayload: Record<string, unknown> = {
    ...buildBasePayload(data, user.id),
    plan: profile.plan,
    ai_mode: finalAiMode,
    generated_by: metadata?.generatedBy ?? "vita-smart-ai",
  };

  const { error } = await supabase
    .from("health_assessments")
    .insert([insertPayload]);

  if (error) {
    const message = error.message?.toLowerCase() || "";

    const isMissingColumnError =
      message.includes("column") &&
      (message.includes("ai_mode") ||
        message.includes("generated_by") ||
        message.includes("plan"));

    if (isMissingColumnError) {
      const fallbackPayload = buildBasePayload(data, user.id);

      const { error: fallbackError } = await supabase
        .from("health_assessments")
        .insert([fallbackPayload]);

      if (fallbackError) {
        throw fallbackError;
      }

      return {
        saved: true,
        plan: profile.plan,
        aiModeApplied: finalAiMode,
      };
    }

    throw error;
  }

  return {
    saved: true,
    plan: profile.plan,
    aiModeApplied: finalAiMode,
  };
}
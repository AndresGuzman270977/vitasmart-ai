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

function sanitizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeFactors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function sanitizeScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 70;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function buildBasePayload(data: SaveAssessmentInput, userId: string) {
  return {
    age: sanitizeString(data.age),
    sex: sanitizeString(data.sex),
    stress: sanitizeString(data.stress),
    sleep: sanitizeString(data.sleep),
    goal: sanitizeString(data.goal),
    score: sanitizeScore(data.score),
    summary: sanitizeString(data.summary),
    factors: sanitizeFactors(data.factors),
    user_id: userId,
  };
}

function validatePayload(data: SaveAssessmentInput) {
  const age = sanitizeString(data.age);
  const sex = sanitizeString(data.sex);
  const stress = sanitizeString(data.stress);
  const sleep = sanitizeString(data.sleep);
  const goal = sanitizeString(data.goal);
  const summary = sanitizeString(data.summary);

  if (!age || !sex || !stress || !sleep || !goal) {
    throw new Error("Faltan datos obligatorios para guardar el análisis.");
  }

  if (!summary) {
    throw new Error("El análisis no incluye un resumen válido.");
  }
}

function isMissingOptionalColumnsError(message: string): boolean {
  return (
    message.includes("column") &&
    (message.includes("ai_mode") ||
      message.includes("generated_by") ||
      message.includes("plan"))
  );
}

export async function saveAssessment(
  data: SaveAssessmentInput,
  metadata?: SaveAssessmentMetadata
): Promise<SaveAssessmentResult> {
  validatePayload(data);

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
    .select("id", { count: "exact", head: true })
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
    generated_by: sanitizeString(metadata?.generatedBy) || "vita-smart-ai",
  };

  const { error } = await supabase
    .from("health_assessments")
    .insert([insertPayload]);

  if (error) {
    const message = error.message?.toLowerCase() || "";

    if (isMissingOptionalColumnsError(message)) {
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
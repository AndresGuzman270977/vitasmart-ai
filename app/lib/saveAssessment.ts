import { supabase } from "./supabase";
import { getCurrentUser } from "./auth";
import {
  canSaveMoreAnalyses,
  getPlanLimits,
  normalizePlan,
  type UserPlan,
} from "./planLimits";
import { ensureUserProfile, getCurrentUserProfile } from "./profile";

export type AssessmentAiMode = "basic" | "advanced";

export type LegacySaveAssessmentInput = {
  age: string;
  sex: string;
  stress: string;
  sleep: string;
  goal: string;
  score: number;
  summary: string;
  factors: string[];
};

export type ExpandedSaveAssessmentInput = {
  assessmentVersion?: string;

  plan?: UserPlan;
  aiMode?: AssessmentAiMode;
  generatedBy?: string;

  age?: number | string;
  sex?: string;

  weightKg?: number | null;
  heightCm?: number | null;
  waistCm?: number | null;
  bmi?: number | null;

  stressLevel?: number | null;
  sleepHours?: number | null;
  sleepQuality?: number | null;
  fatigueLevel?: number | null;
  focusDifficulty?: number | null;

  physicalActivity?: number | null;
  alcoholUse?: number | null;
  smokingStatus?: string | null;
  sunExposure?: number | null;
  hydrationLevel?: number | null;
  ultraProcessedFoodLevel?: number | null;

  bloodPressureKnown?: boolean;
  systolicBp?: number | null;
  diastolicBp?: number | null;

  mainGoal?: string;

  baseConditions?: string[];
  currentMedications?: string[];
  currentSupplements?: string[];

  healthScore: number;
  sleepScore?: number | null;
  stressScore?: number | null;
  energyScore?: number | null;
  focusScore?: number | null;
  metabolicScore?: number | null;

  confidenceLevel?: "high" | "moderate" | "limited" | string;
  confidenceExplanation?: string;

  executiveSummary: string;
  clinicalStyleSummary?: string;
  scoreNarrative?: string;
  professionalFollowUpAdvice?: string;

  strengths?: string[];
  mainDrivers?: string[];
  priorityActions?: string[];
  riskSignals?: string[];
  factors?: string[];

  biomarkers?: {
    fasting_glucose?: number | null;
    hba1c?: number | null;
    total_cholesterol?: number | null;
    hdl?: number | null;
    ldl?: number | null;
    triglycerides?: number | null;
    vitamin_d?: number | null;
    b12?: number | null;
    ferritin?: number | null;
    tsh?: number | null;
    creatinine?: number | null;
    ast?: number | null;
    alt?: number | null;
    lab_date?: string | null;
  };
};

export type SaveAssessmentInput =
  | LegacySaveAssessmentInput
  | ExpandedSaveAssessmentInput;

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

type LooseRow = Record<string, unknown>;

const DEDUPE_WINDOW_MINUTES = 10;

function sanitizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeNullableString(value: unknown): string | null {
  const clean = sanitizeString(value);
  return clean || null;
}

function sanitizeStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

function sanitizeScore(value: unknown, fallback = 70): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function sanitizeNullableScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function sanitizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function sanitizeBoolean(value: unknown): boolean {
  return value === true;
}

function isExpandedPayload(
  data: SaveAssessmentInput
): data is ExpandedSaveAssessmentInput {
  return (
    "healthScore" in data ||
    "executiveSummary" in data ||
    "clinicalStyleSummary" in data ||
    "confidenceLevel" in data ||
    "sleepScore" in data
  );
}

function validateLegacyPayload(data: LegacySaveAssessmentInput) {
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

function validateExpandedPayload(data: ExpandedSaveAssessmentInput) {
  const summary = sanitizeString(data.executiveSummary);

  if (!summary) {
    throw new Error(
      "El análisis expandido no incluye executiveSummary válido."
    );
  }

  if (
    data.healthScore == null ||
    typeof data.healthScore !== "number" ||
    !Number.isFinite(data.healthScore)
  ) {
    throw new Error("El análisis expandido no incluye healthScore válido.");
  }
}

function buildLegacyPayload(
  data: LegacySaveAssessmentInput,
  userId: string
): LooseRow {
  return {
    age: sanitizeString(data.age),
    sex: sanitizeString(data.sex),
    stress: sanitizeString(data.stress),
    sleep: sanitizeString(data.sleep),
    goal: sanitizeString(data.goal),
    score: sanitizeScore(data.score),
    summary: sanitizeString(data.summary),
    factors: sanitizeStringArray(data.factors, 5),
    user_id: userId,
  };
}

function buildExpandedPayload(
  data: ExpandedSaveAssessmentInput,
  userId: string,
  plan: UserPlan,
  finalAiMode: AssessmentAiMode,
  generatedBy: string
): LooseRow {
  const ageValue = sanitizeNumber(data.age);

  const basePayload: LooseRow = {
    user_id: userId,

    assessment_version: sanitizeString(data.assessmentVersion) || "v2.0.0",
    plan,
    ai_mode: finalAiMode,
    generated_by: generatedBy,

    age: ageValue,
    sex: sanitizeNullableString(data.sex),

    weight_kg: sanitizeNumber(data.weightKg),
    height_cm: sanitizeNumber(data.heightCm),
    waist_cm: sanitizeNumber(data.waistCm),
    bmi: sanitizeNumber(data.bmi),

    stress_level: sanitizeNumber(data.stressLevel),
    sleep_hours: sanitizeNumber(data.sleepHours),
    sleep_quality: sanitizeNumber(data.sleepQuality),
    fatigue_level: sanitizeNumber(data.fatigueLevel),
    focus_difficulty: sanitizeNumber(data.focusDifficulty),

    physical_activity: sanitizeNumber(data.physicalActivity),
    alcohol_use: sanitizeNumber(data.alcoholUse),
    smoking_status: sanitizeNullableString(data.smokingStatus),
    sun_exposure: sanitizeNumber(data.sunExposure),
    hydration_level: sanitizeNumber(data.hydrationLevel),
    ultra_processed_food_level: sanitizeNumber(data.ultraProcessedFoodLevel),

    blood_pressure_known: sanitizeBoolean(data.bloodPressureKnown),
    systolic_bp: sanitizeNumber(data.systolicBp),
    diastolic_bp: sanitizeNumber(data.diastolicBp),

    main_goal: sanitizeNullableString(data.mainGoal),

    base_conditions: sanitizeStringArray(data.baseConditions, 20),
    current_medications: sanitizeStringArray(data.currentMedications, 20),
    current_supplements: sanitizeStringArray(data.currentSupplements, 20),

    health_score: sanitizeScore(data.healthScore),
    sleep_score: sanitizeNullableScore(data.sleepScore),
    stress_score: sanitizeNullableScore(data.stressScore),
    energy_score: sanitizeNullableScore(data.energyScore),
    focus_score: sanitizeNullableScore(data.focusScore),
    metabolic_score: sanitizeNullableScore(data.metabolicScore),

    confidence_level: sanitizeNullableString(data.confidenceLevel),
    confidence_explanation: sanitizeNullableString(data.confidenceExplanation),

    executive_summary: sanitizeString(data.executiveSummary),
    clinical_style_summary: sanitizeNullableString(data.clinicalStyleSummary),
    score_narrative: sanitizeNullableString(data.scoreNarrative),
    professional_followup_advice: sanitizeNullableString(
      data.professionalFollowUpAdvice
    ),

    strengths: sanitizeStringArray(data.strengths, 12),
    main_drivers: sanitizeStringArray(data.mainDrivers, 12),
    priority_actions: sanitizeStringArray(data.priorityActions, 12),
    risk_signals: sanitizeStringArray(data.riskSignals, 12),
    factors: sanitizeStringArray(data.factors, 12),

    // Compatibilidad legacy
    score: sanitizeScore(data.healthScore),
    summary: sanitizeString(data.executiveSummary),
    stress: mapStressLevelToLegacy(data.stressLevel),
    sleep: mapSleepHoursToLegacy(data.sleepHours),
    goal: sanitizeNullableString(mapGoalToLegacy(data.mainGoal)),
  };

  if (ageValue != null) {
    basePayload.age_legacy_text = String(ageValue);
  }

  return basePayload;
}

function buildBiomarkerPayload(
  data: ExpandedSaveAssessmentInput
): LooseRow | null {
  if (!data.biomarkers) return null;

  const payload: LooseRow = {
    fasting_glucose: sanitizeNumber(data.biomarkers.fasting_glucose),
    hba1c: sanitizeNumber(data.biomarkers.hba1c),
    total_cholesterol: sanitizeNumber(data.biomarkers.total_cholesterol),
    hdl: sanitizeNumber(data.biomarkers.hdl),
    ldl: sanitizeNumber(data.biomarkers.ldl),
    triglycerides: sanitizeNumber(data.biomarkers.triglycerides),
    vitamin_d: sanitizeNumber(data.biomarkers.vitamin_d),
    b12: sanitizeNumber(data.biomarkers.b12),
    ferritin: sanitizeNumber(data.biomarkers.ferritin),
    tsh: sanitizeNumber(data.biomarkers.tsh),
    creatinine: sanitizeNumber(data.biomarkers.creatinine),
    ast: sanitizeNumber(data.biomarkers.ast),
    alt: sanitizeNumber(data.biomarkers.alt),
    lab_date: sanitizeNullableString(data.biomarkers.lab_date),
  };

  const hasAnyMeaningfulValue = Object.values(payload).some(
    (value) => value !== null && value !== ""
  );

  return hasAnyMeaningfulValue ? payload : null;
}

function isOptionalColumnFallbackError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    (normalized.includes("column") &&
      (normalized.includes("does not exist") ||
        normalized.includes("schema cache") ||
        normalized.includes("could not find") ||
        normalized.includes("unknown column"))) ||
    (normalized.includes("relation") && normalized.includes("does not exist")) ||
    (normalized.includes("assessment_biomarkers") &&
      normalized.includes("does not exist"))
  );
}

function isBiomarkerTableCompatibilityError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("assessment_biomarkers") &&
    (normalized.includes("does not exist") ||
      normalized.includes("schema cache") ||
      normalized.includes("column") ||
      normalized.includes("could not find") ||
      normalized.includes("unknown column"))
  );
}

function mapStressLevelToLegacy(value?: number | null): string {
  if (!value) return "";
  if (value <= 2) return "low";
  if (value === 3) return "medium";
  return "high";
}

function mapSleepHoursToLegacy(value?: number | null): string {
  if (value == null) return "";
  if (value < 5.5) return "5";
  if (value < 6.5) return "6";
  if (value < 7.5) return "7";
  return "8";
}

function mapGoalToLegacy(value?: string | null): string {
  if (value === "energy") return "energy";
  if (value === "focus") return "focus";
  if (value === "sleep") return "sleep";
  if (value === "general_health") return "health";
  if (value === "weight") return "health";
  if (value === "recovery") return "energy";
  return "health";
}

function buildLegacyFallbackFromExpanded(
  data: ExpandedSaveAssessmentInput,
  userId: string
): LooseRow {
  const mainDrivers = sanitizeStringArray(data.mainDrivers, 5);
  const factors = sanitizeStringArray(data.factors, 5);

  return buildLegacyPayload(
    {
      age: data.age != null && data.age !== "" ? String(data.age) : "",
      sex: sanitizeString(data.sex),
      stress: mapStressLevelToLegacy(data.stressLevel),
      sleep: mapSleepHoursToLegacy(data.sleepHours),
      goal: mapGoalToLegacy(data.mainGoal),
      score: data.healthScore,
      summary: data.executiveSummary,
      factors: mainDrivers.length > 0 ? mainDrivers : factors,
    },
    userId
  );
}

async function findRecentDuplicateExpandedAssessment(params: {
  userId: string;
  assessmentVersion: string;
  healthScore: number;
  mainGoal: string | null;
  executiveSummary: string;
  aiMode: AssessmentAiMode;
}): Promise<boolean> {
  const since = new Date(
    Date.now() - DEDUPE_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const { data, error } = await (supabase
    .from("health_assessments")
    .select(
      "id, assessment_version, health_score, main_goal, executive_summary, ai_mode, created_at"
    )
    .eq("user_id", params.userId)
    .eq("assessment_version", params.assessmentVersion)
    .eq("health_score", params.healthScore)
    .eq("ai_mode", params.aiMode)
    .eq("executive_summary", params.executiveSummary)
    .gte("created_at", since) as any);

  if (error) {
    console.warn("No se pudo verificar duplicado reciente:", error.message);
    return false;
  }

  const rows = Array.isArray(data) ? data : [];

  return rows.some((row) => {
    const rowMainGoal =
      typeof row?.main_goal === "string" ? row.main_goal.trim() : null;
    return rowMainGoal === params.mainGoal;
  });
}

async function insertHealthAssessment(
  payload: LooseRow
): Promise<{ id: string }> {
  const { data, error } = await (supabase
    .from("health_assessments")
    .insert([payload] as any)
    .select("id")
    .single() as any);

  if (error) throw error;
  return data as { id: string };
}

async function insertBiomarkers(assessmentId: string, payload: LooseRow) {
  const { error } = await (supabase.from("assessment_biomarkers").insert([
    {
      health_assessment_id: assessmentId,
      assessment_id: assessmentId,
      ...payload,
    },
  ] as any) as any);

  if (error) {
    const message = error.message?.toLowerCase() || "";
    if (isBiomarkerTableCompatibilityError(message)) {
      console.warn(
        "Biomarcadores no guardados por compatibilidad de esquema:",
        error.message
      );
      return;
    }
    throw error;
  }
}

async function insertLegacyCompatiblePayload(
  payload: LooseRow,
  allowMinimalFallback = true
) {
  const { error } = await (supabase
    .from("health_assessments")
    .insert([payload] as any) as any);

  if (!error) return;

  const message = error.message?.toLowerCase?.() || "";

  if (!isOptionalColumnFallbackError(message) || !allowMinimalFallback) {
    throw error;
  }

  const minimalPayload: LooseRow = {
    user_id: payload.user_id,
    age: payload.age,
    sex: payload.sex,
    stress: payload.stress,
    sleep: payload.sleep,
    goal: payload.goal,
    score: payload.score,
    summary: payload.summary,
    factors: payload.factors,
  };

  const { error: minimalError } = await (supabase
    .from("health_assessments")
    .insert([minimalPayload] as any) as any);

  if (minimalError) throw minimalError;
}

async function resolveUserPlanAndCounts(userId: string) {
  await ensureUserProfile();

  const profile = await getCurrentUserProfile();

  if (!profile) {
    throw new Error("No se pudo cargar el perfil del usuario.");
  }

  const userPlan = normalizePlan(profile.plan);

  const { count, error: countError } = await supabase
    .from("health_assessments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    throw countError;
  }

  return {
    profile,
    userPlan,
    currentCount: count ?? 0,
  };
}

function buildFallbackGeneratedBy(
  baseGeneratedBy: string,
  mode: "expanded" | "legacy" | "legacy-fallback"
): string {
  const base = sanitizeString(baseGeneratedBy) || "vita-smart-ai";
  return `${base}:${mode}`;
}

export async function saveAssessment(
  data: SaveAssessmentInput,
  metadata?: SaveAssessmentMetadata
): Promise<SaveAssessmentResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { saved: false, reason: "no-user" };
  }

  const { userPlan, currentCount } = await resolveUserPlanAndCounts(user.id);

  if (!canSaveMoreAnalyses(userPlan, currentCount)) {
    return {
      saved: false,
      reason: "plan-limit",
      plan: userPlan,
    };
  }

  const limits = getPlanLimits(userPlan);

  const requestedAiMode =
    metadata?.aiMode ||
    (isExpandedPayload(data) ? data.aiMode : undefined) ||
    "basic";

  const finalAiMode: AssessmentAiMode =
    requestedAiMode === "advanced" && limits.advancedAI ? "advanced" : "basic";

  const generatedBy =
    sanitizeString(metadata?.generatedBy) ||
    (isExpandedPayload(data)
      ? sanitizeString(data.generatedBy) || "vita-smart-ai-v2"
      : "vita-smart-ai");

  if (!isExpandedPayload(data)) {
    validateLegacyPayload(data);

    const insertPayload: LooseRow = {
      ...buildLegacyPayload(data, user.id),
      plan: userPlan,
      ai_mode: finalAiMode,
      generated_by: buildFallbackGeneratedBy(generatedBy, "legacy"),
    };

    await insertLegacyCompatiblePayload(insertPayload, true);

    return {
      saved: true,
      plan: userPlan,
      aiModeApplied: finalAiMode,
    };
  }

  validateExpandedPayload(data);

  const normalizedAssessmentVersion =
    sanitizeString(data.assessmentVersion) || "v2.0.0";
  const normalizedExecutiveSummary = sanitizeString(data.executiveSummary);
  const normalizedMainGoal = sanitizeNullableString(data.mainGoal);
  const normalizedHealthScore = sanitizeScore(data.healthScore);

  const duplicateExists = await findRecentDuplicateExpandedAssessment({
    userId: user.id,
    assessmentVersion: normalizedAssessmentVersion,
    healthScore: normalizedHealthScore,
    mainGoal: normalizedMainGoal,
    executiveSummary: normalizedExecutiveSummary,
    aiMode: finalAiMode,
  });

  if (duplicateExists) {
    return {
      saved: true,
      plan: userPlan,
      aiModeApplied: finalAiMode,
    };
  }

  const expandedPayload = buildExpandedPayload(
    {
      ...data,
      assessmentVersion: normalizedAssessmentVersion,
      executiveSummary: normalizedExecutiveSummary,
      healthScore: normalizedHealthScore,
      mainGoal: normalizedMainGoal ?? undefined,
    },
    user.id,
    userPlan,
    finalAiMode,
    buildFallbackGeneratedBy(generatedBy, "expanded")
  );

  try {
    const inserted = await insertHealthAssessment(expandedPayload);

    const biomarkerPayload = buildBiomarkerPayload(data);
    if (biomarkerPayload) {
      await insertBiomarkers(inserted.id, biomarkerPayload);
    }

    return {
      saved: true,
      plan: userPlan,
      aiModeApplied: finalAiMode,
    };
  } catch (error: any) {
    const message = error?.message?.toLowerCase?.() || "";

    if (!isOptionalColumnFallbackError(message)) {
      throw error;
    }

    console.warn(
      "Fallo al guardar payload expandido; se intentará fallback legacy controlado:",
      error?.message || error
    );

    const legacyFallbackPayload: LooseRow = {
      ...buildLegacyFallbackFromExpanded(data, user.id),
      plan: userPlan,
      ai_mode: finalAiMode,
      generated_by: buildFallbackGeneratedBy(generatedBy, "legacy-fallback"),
    };

    await insertLegacyCompatiblePayload(legacyFallbackPayload, true);

    return {
      saved: true,
      plan: userPlan,
      aiModeApplied: finalAiMode,
    };
  }
}
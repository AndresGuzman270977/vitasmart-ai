// app/lib/healthAnalysis/saveHealthAnalysisSnapshot.ts

import { supabase } from "../supabase";
import { getCurrentUser } from "../auth";
import { ensureUserProfile, getCurrentUserProfile } from "../profile";
import {
  canSaveMoreAnalyses,
  getPlanLimits,
  normalizePlan,
  type UserPlan,
} from "../planLimits";
import type {
  HealthAnalysisRequest,
  HealthAnalysisResponse,
} from "./types";

type SaveSnapshotParams = {
  userId?: string | null;
  request: HealthAnalysisRequest;
  response: HealthAnalysisResponse;
};

type SaveSnapshotResult = {
  saved: boolean;
  assessmentId?: number;
  reason?:
    | "no-user"
    | "no-profile"
    | "plan-limit"
    | "db-error"
    | "unknown";
  details?: string;
};

type LooseRow = Record<string, unknown>;

function sanitizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeNullableString(value: unknown): string | null {
  const clean = sanitizeString(value);
  return clean || null;
}

function sanitizeStringArray(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, max);
}

function sanitizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function sanitizeInteger(value: unknown): number | null {
  const n = sanitizeNumber(value);
  return n == null ? null : Math.round(n);
}

function inferBmi(weightKg?: number, heightCm?: number): number | null {
  if (
    typeof weightKg !== "number" ||
    !Number.isFinite(weightKg) ||
    typeof heightCm !== "number" ||
    !Number.isFinite(heightCm) ||
    heightCm <= 0
  ) {
    return null;
  }

  return Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1));
}

function buildAssessmentInsertPayload(params: {
  userId: string;
  userPlan: UserPlan;
  request: HealthAnalysisRequest;
  response: HealthAnalysisResponse;
}): LooseRow {
  const assessment = params.request.assessment || {};
  const scores = params.response.scores;
  const confidence = params.response.confidence;
  const summaries = params.response.summaries;
  const insights = params.response.insights;

  const weightKg = sanitizeNumber(assessment.weightKg);
  const heightCm = sanitizeNumber(assessment.heightCm);
  const waistCm = sanitizeNumber(assessment.waistCm);
  const bmi = inferBmi(weightKg ?? undefined, heightCm ?? undefined);

  return {
    user_id: params.userId,

    assessment_version:
      sanitizeString(params.response.assessmentVersion) || "v2.0.0",
    plan: params.userPlan,
    ai_mode: params.response.appliedAiMode,
    generated_by: "health-analysis-api",

    age: sanitizeInteger(assessment.age),
    sex: sanitizeNullableString(assessment.sex),

    weight_kg: weightKg,
    height_cm: heightCm,
    waist_cm: waistCm,
    bmi,

    stress_level: sanitizeInteger(assessment.stressLevel),
    sleep_hours: sanitizeNumber(assessment.sleepHours),
    sleep_quality: sanitizeInteger(assessment.sleepQuality),
    fatigue_level: sanitizeInteger(assessment.fatigueLevel),
    focus_difficulty: sanitizeInteger(assessment.focusDifficulty),

    physical_activity: sanitizeInteger(assessment.physicalActivity),
    alcohol_use: sanitizeInteger(assessment.alcoholUse),
    smoking_status: sanitizeNullableString(assessment.smokingStatus),
    sun_exposure: sanitizeInteger(assessment.sunExposure),
    hydration_level: sanitizeInteger(assessment.hydrationLevel),
    ultra_processed_food_level: sanitizeInteger(
      assessment.ultraProcessedFoodLevel
    ),

    blood_pressure_known: Boolean(assessment.bloodPressureKnown),
    systolic_bp: sanitizeInteger(assessment.systolicBp),
    diastolic_bp: sanitizeInteger(assessment.diastolicBp),

    main_goal: sanitizeNullableString(assessment.mainGoal),

    base_conditions: sanitizeStringArray(assessment.baseConditions, 20),
    current_medications: sanitizeStringArray(
      assessment.currentMedications,
      20
    ),
    current_supplements: sanitizeStringArray(
      assessment.currentSupplements,
      20
    ),

    health_score: sanitizeInteger(scores.healthScore),
    sleep_score: sanitizeInteger(scores.sleepScore),
    stress_score: sanitizeInteger(scores.stressScore),
    energy_score: sanitizeInteger(scores.energyScore),
    focus_score: sanitizeInteger(scores.focusScore),
    metabolic_score: sanitizeInteger(scores.metabolicScore),

    confidence_level: sanitizeNullableString(confidence.confidenceLevel),
    confidence_explanation: sanitizeNullableString(
      confidence.confidenceExplanation
    ),

    executive_summary: sanitizeString(summaries.executiveSummary),
    clinical_style_summary: sanitizeNullableString(
      summaries.clinicalStyleSummary
    ),
    score_narrative: sanitizeNullableString(summaries.scoreNarrative),
    professional_followup_advice: sanitizeNullableString(
      summaries.professionalFollowUpAdvice
    ),

    strengths: sanitizeStringArray(insights.strengths, 12),
    main_drivers: sanitizeStringArray(insights.mainDrivers, 12),
    priority_actions: sanitizeStringArray(insights.priorityActions, 12),
    risk_signals: sanitizeStringArray(insights.riskSignals, 12),
    factors: sanitizeStringArray(
      [
        ...sanitizeStringArray(insights.mainDrivers, 8),
        ...sanitizeStringArray(params.response.userNeeds.dominantNeeds, 4),
      ],
      12
    ),

    // Compatibilidad temporal con el esquema legacy
    score: sanitizeInteger(scores.healthScore),
    summary: sanitizeString(summaries.executiveSummary),
    stress: mapStressLevelToLegacy(assessment.stressLevel),
    sleep: mapSleepHoursToLegacy(assessment.sleepHours),
    goal: mapGoalToLegacy(assessment.mainGoal),
  };
}

function buildBiomarkerInsertPayload(
  assessmentId: number,
  biomarkers?: HealthAnalysisRequest["biomarkers"]
): LooseRow | null {
  if (!biomarkers) return null;

  return {
    assessment_id: assessmentId,
    fasting_glucose: sanitizeNumber(biomarkers.fasting_glucose),
    hba1c: sanitizeNumber(biomarkers.hba1c),
    total_cholesterol: sanitizeNumber(biomarkers.total_cholesterol),
    hdl: sanitizeNumber(biomarkers.hdl),
    ldl: sanitizeNumber(biomarkers.ldl),
    triglycerides: sanitizeNumber(biomarkers.triglycerides),
    vitamin_d: sanitizeNumber(biomarkers.vitamin_d),
    b12: sanitizeNumber(biomarkers.b12),
    ferritin: sanitizeNumber(biomarkers.ferritin),
    tsh: sanitizeNumber(biomarkers.tsh),
    creatinine: sanitizeNumber(biomarkers.creatinine),
    ast: sanitizeNumber(biomarkers.ast),
    alt: sanitizeNumber(biomarkers.alt),
    lab_date: sanitizeNullableString(biomarkers.lab_date),
  };
}

function buildRecommendationInsertPayload(params: {
  assessmentId: number;
  item: HealthAnalysisResponse["productRecommendations"][number];
  rank: number;
}): LooseRow {
  return {
    assessment_id: params.assessmentId,
    ingredient_slug: params.item.ingredientSlug,
    ingredient_name: params.item.ingredientName,
    match_score: sanitizeInteger(params.item.matchScore),
    safety_decision: sanitizeNullableString(params.item.safetyDecision),
    why_matched: sanitizeStringArray(params.item.whyMatched, 10),
    cautions: sanitizeStringArray(params.item.cautions, 10),
    rank: params.rank,
    is_primary: params.rank === 1,
    evidence_level: sanitizeNullableString(params.item.evidenceLevel),
    evidence_summary: sanitizeNullableString(params.item.evidenceSummary),
    scientific_context: sanitizeNullableString(params.item.scientificContext),
  };
}

function buildProductOptionInsertPayload(params: {
  assessmentRecommendationId: string;
  view: NonNullable<
    HealthAnalysisResponse["productRecommendations"][number]["options"]["excellent"]
  >;
}): LooseRow {
  return {
    assessment_recommendation_id: params.assessmentRecommendationId,
    product_slug: sanitizeNullableString(params.view.product.slug),
    product_name: sanitizeString(params.view.product.productName),
    brand: sanitizeNullableString(params.view.product.brand),
    manufacturer: sanitizeNullableString(params.view.product.manufacturer),

    budget_tier: sanitizeNullableString(params.view.product.budgetTier),
    fit_score: sanitizeInteger(params.view.fitScore),
    quality_score: sanitizeInteger(params.view.qualityScore),
    value_score: sanitizeInteger(params.view.valueScore),

    price_label: sanitizeNullableString(params.view.product.priceLabel),
    estimated_cost_per_day_usd: sanitizeNumber(
      params.view.product.estimatedCostPerDayUsd
    ),

    image_url: sanitizeNullableString(params.view.product.imageUrl),
    buy_url: sanitizeNullableString(params.view.product.buyUrl),

    quality_seals: sanitizeStringArray(params.view.product.qualitySeals, 10),
    quality_notes: sanitizeStringArray(params.view.product.qualityNotes, 10),

    why_for_user: sanitizeNullableString(params.view.narratives.whyForUser),
    science_summary: sanitizeNullableString(
      params.view.narratives.scienceSummary
    ),
    lab_quality_summary: sanitizeNullableString(
      params.view.narratives.labQualitySummary
    ),
    how_to_take: sanitizeNullableString(params.view.narratives.howToTake),
    restrictions_summary: sanitizeNullableString(
      params.view.narratives.restrictionsSummary
    ),
    side_effects_summary: sanitizeNullableString(
      params.view.narratives.sideEffectsSummary
    ),
    budget_reason: sanitizeNullableString(
      params.view.narratives.budgetReason
    ),
  };
}

function mapStressLevelToLegacy(value?: number): string {
  if (!value) return "";
  if (value <= 2) return "low";
  if (value === 3) return "medium";
  return "high";
}

function mapSleepHoursToLegacy(value?: number): string {
  if (value == null) return "";
  if (value < 5.5) return "5";
  if (value < 6.5) return "6";
  if (value < 7.5) return "7";
  return "8";
}

function mapGoalToLegacy(value?: string): string {
  if (value === "energy") return "energy";
  if (value === "focus") return "focus";
  if (value === "sleep") return "sleep";
  if (value === "general_health") return "health";
  if (value === "weight") return "health";
  if (value === "recovery") return "energy";
  return "health";
}

export async function saveHealthAnalysisSnapshot(
  params: SaveSnapshotParams
): Promise<SaveSnapshotResult> {
  try {
    const currentUser = await getCurrentUser();
    const effectiveUserId = params.userId || currentUser?.id || null;

    if (!effectiveUserId) {
      return {
        saved: false,
        reason: "no-user",
      };
    }

    await ensureUserProfile();
    const profile = await getCurrentUserProfile();

    if (!profile) {
      return {
        saved: false,
        reason: "no-profile",
      };
    }

    const userPlan = normalizePlan(profile.plan);

    const { count, error: countError } = await supabase
      .from("health_assessments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", effectiveUserId);

    if (countError) {
      return {
        saved: false,
        reason: "db-error",
        details: countError.message,
      };
    }

    const currentCount = count ?? 0;

    if (!canSaveMoreAnalyses(userPlan, currentCount)) {
      return {
        saved: false,
        reason: "plan-limit",
      };
    }

    const limits = getPlanLimits(userPlan);
    const appliedAiMode =
      params.response.appliedAiMode === "advanced" && limits.advancedAI
        ? "advanced"
        : "basic";

    const assessmentPayload = buildAssessmentInsertPayload({
      userId: effectiveUserId,
      userPlan,
      request: params.request,
      response: {
        ...params.response,
        appliedAiMode,
      },
    });

    const { data: insertedAssessment, error: assessmentError } = await (supabase
      .from("health_assessments")
      .insert([assessmentPayload] as any)
      .select("id")
      .single() as any);

    if (assessmentError || !insertedAssessment?.id) {
      return {
        saved: false,
        reason: "db-error",
        details: assessmentError?.message || "Unable to insert assessment.",
      };
    }

    const assessmentId = Number(insertedAssessment.id);

    const biomarkerPayload = buildBiomarkerInsertPayload(
      assessmentId,
      params.request.biomarkers
    );

    if (biomarkerPayload) {
      const { error: biomarkerError } = await (supabase
        .from("assessment_biomarkers")
        .insert([biomarkerPayload] as any) as any);

      if (biomarkerError) {
        return {
          saved: false,
          assessmentId,
          reason: "db-error",
          details: biomarkerError.message,
        };
      }
    }

    for (let index = 0; index < params.response.productRecommendations.length; index++) {
      const recommendation = params.response.productRecommendations[index];

      const recommendationPayload = buildRecommendationInsertPayload({
        assessmentId,
        item: recommendation,
        rank: index + 1,
      });

      const { data: insertedRecommendation, error: recommendationError } =
        await (supabase
          .from("assessment_recommendations")
          .insert([recommendationPayload] as any)
          .select("id")
          .single() as any);

      if (recommendationError || !insertedRecommendation?.id) {
        return {
          saved: false,
          assessmentId,
          reason: "db-error",
          details:
            recommendationError?.message ||
            "Unable to insert assessment recommendation.",
        };
      }

      const assessmentRecommendationId = String(insertedRecommendation.id);

      const optionViews = [
        recommendation.options.excellent,
        recommendation.options.veryGood,
        recommendation.options.good,
      ].filter(Boolean);

      for (const optionView of optionViews) {
        const optionPayload = buildProductOptionInsertPayload({
          assessmentRecommendationId,
          view: optionView as NonNullable<typeof optionView>,
        });

        const { error: optionError } = await (supabase
          .from("recommendation_product_options")
          .insert([optionPayload] as any) as any);

        if (optionError) {
          return {
            saved: false,
            assessmentId,
            reason: "db-error",
            details: optionError.message,
          };
        }
      }
    }

    return {
      saved: true,
      assessmentId,
    };
  } catch (error: any) {
    return {
      saved: false,
      reason: "unknown",
      details: error?.message || "Unknown snapshot persistence error.",
    };
  }
}
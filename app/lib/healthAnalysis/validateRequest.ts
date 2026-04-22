// app/lib/healthAnalysis/validateRequest.ts

import {
  AssessmentInput,
  BiomarkerInput,
  HealthAnalysisRequest,
  MainGoal,
  RequestedAiMode,
  UserPlan,
} from "./types";

type ValidationResult =
  | {
      ok: true;
      data: {
        plan: UserPlan;
        requestedAiMode: RequestedAiMode;
        assessment: AssessmentInput;
        biomarkers?: BiomarkerInput;
      };
    }
  | {
      ok: false;
      error: string;
      fieldErrors?: string[];
    };

const ALLOWED_GOALS: MainGoal[] = [
  "energy",
  "focus",
  "sleep",
  "general_health",
  "weight",
  "recovery",
];

const ALLOWED_PLANS: UserPlan[] = ["free", "pro", "premium"];
const ALLOWED_AI_MODES: RequestedAiMode[] = ["basic", "advanced"];
const ALLOWED_SMOKING_STATUS = [
  "never",
  "former",
  "current",
  "occasional",
  "unknown",
] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampOptionalNumber(
  value: unknown,
  min: number,
  max: number
): number | undefined {
  if (!isFiniteNumber(value)) return undefined;
  return Math.max(min, Math.min(max, value));
}

function sanitizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  return clean || undefined;
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizePlan(value: unknown): UserPlan {
  return ALLOWED_PLANS.includes(value as UserPlan)
    ? (value as UserPlan)
    : "free";
}

function normalizeRequestedAiMode(
  value: unknown,
  plan: UserPlan
): RequestedAiMode {
  if (ALLOWED_AI_MODES.includes(value as RequestedAiMode)) {
    return value as RequestedAiMode;
  }

  return plan === "pro" || plan === "premium" ? "advanced" : "basic";
}

export function validateHealthAnalysisRequest(
  payload: unknown
): ValidationResult {
  if (!payload || typeof payload !== "object") {
    return {
      ok: false,
      error: "Invalid request body.",
    };
  }

  const raw = payload as Partial<HealthAnalysisRequest>;
  const fieldErrors: string[] = [];

  const plan: UserPlan = normalizePlan(raw.plan);
  const requestedAiMode: RequestedAiMode = normalizeRequestedAiMode(
    raw.requestedAiMode,
    plan
  );

  if (!raw.assessment || typeof raw.assessment !== "object") {
    return {
      ok: false,
      error: "Assessment is required.",
      fieldErrors: ["assessment"],
    };
  }

  const a = raw.assessment as AssessmentInput;

  const assessment: AssessmentInput = {
    age: clampOptionalNumber(a.age, 18, 100),
    sex: a.sex === "male" || a.sex === "female" ? a.sex : undefined,

    weightKg: clampOptionalNumber(a.weightKg, 20, 350),
    heightCm: clampOptionalNumber(a.heightCm, 100, 250),
    waistCm: clampOptionalNumber(a.waistCm, 30, 250),

    stressLevel: clampOptionalNumber(a.stressLevel, 1, 5),
    sleepHours: clampOptionalNumber(a.sleepHours, 0, 16),
    sleepQuality: clampOptionalNumber(a.sleepQuality, 1, 5),
    fatigueLevel: clampOptionalNumber(a.fatigueLevel, 1, 5),
    focusDifficulty: clampOptionalNumber(a.focusDifficulty, 1, 5),

    physicalActivity: clampOptionalNumber(a.physicalActivity, 1, 5),
    alcoholUse: clampOptionalNumber(a.alcoholUse, 0, 5),
    smokingStatus:
      a.smokingStatus &&
      ALLOWED_SMOKING_STATUS.includes(a.smokingStatus as any)
        ? a.smokingStatus
        : undefined,
    sunExposure: clampOptionalNumber(a.sunExposure, 1, 5),
    hydrationLevel: clampOptionalNumber(a.hydrationLevel, 1, 5),
    ultraProcessedFoodLevel: clampOptionalNumber(
      a.ultraProcessedFoodLevel,
      1,
      5
    ),

    bloodPressureKnown:
      typeof a.bloodPressureKnown === "boolean" ? a.bloodPressureKnown : false,
    systolicBp: clampOptionalNumber(a.systolicBp, 70, 260),
    diastolicBp: clampOptionalNumber(a.diastolicBp, 40, 160),

    mainGoal:
      a.mainGoal && ALLOWED_GOALS.includes(a.mainGoal)
        ? a.mainGoal
        : "general_health",

    baseConditions: sanitizeStringArray(a.baseConditions),
    currentMedications: sanitizeStringArray(a.currentMedications),
    currentSupplements: sanitizeStringArray(a.currentSupplements),
  };

  if (
    assessment.weightKg &&
    assessment.heightCm &&
    assessment.weightKg < 25 &&
    assessment.heightCm > 220
  ) {
    fieldErrors.push("weightKg_or_heightCm_implausible");
  }

  if (
    assessment.bloodPressureKnown &&
    (!assessment.systolicBp || !assessment.diastolicBp)
  ) {
    fieldErrors.push("blood_pressure_incomplete");
  }

  let biomarkers: BiomarkerInput | undefined;

  if (raw.biomarkers && typeof raw.biomarkers === "object") {
    const b = raw.biomarkers as BiomarkerInput;

    const parsedBiomarkers: BiomarkerInput = {
      fasting_glucose: clampOptionalNumber(b.fasting_glucose, 20, 600),
      hba1c: clampOptionalNumber(b.hba1c, 3, 20),
      total_cholesterol: clampOptionalNumber(b.total_cholesterol, 50, 500),
      hdl: clampOptionalNumber(b.hdl, 10, 150),
      ldl: clampOptionalNumber(b.ldl, 10, 350),
      triglycerides: clampOptionalNumber(b.triglycerides, 20, 1500),
      vitamin_d: clampOptionalNumber(b.vitamin_d, 1, 200),
      b12: clampOptionalNumber(b.b12, 20, 3000),
      ferritin: clampOptionalNumber(b.ferritin, 1, 3000),
      tsh: clampOptionalNumber(b.tsh, 0.01, 100),
      creatinine: clampOptionalNumber(b.creatinine, 0.1, 20),
      ast: clampOptionalNumber(b.ast, 1, 2000),
      alt: clampOptionalNumber(b.alt, 1, 2000),
      lab_date: sanitizeString(b.lab_date),
    };

    const hasAtLeastOneBiomarker = Object.values(parsedBiomarkers).some(
      (value) => value !== undefined
    );

    biomarkers = hasAtLeastOneBiomarker ? parsedBiomarkers : undefined;
  }

  if (plan === "free") {
    biomarkers = undefined;
  }

  if (fieldErrors.length > 0) {
    return {
      ok: false,
      error: "Validation failed for one or more fields.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      plan,
      requestedAiMode,
      assessment,
      biomarkers,
    },
  };
}
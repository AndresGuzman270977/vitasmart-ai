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

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 20);
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

  const plan: UserPlan = ALLOWED_PLANS.includes(raw.plan as UserPlan)
    ? (raw.plan as UserPlan)
    : "free";

  const requestedAiMode: RequestedAiMode = ALLOWED_AI_MODES.includes(
    raw.requestedAiMode as RequestedAiMode
  )
    ? (raw.requestedAiMode as RequestedAiMode)
    : "basic";

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
      ["never", "former", "current", "occasional", "unknown"].includes(
        a.smokingStatus
      )
        ? a.smokingStatus
        : undefined,
    sunExposure: clampOptionalNumber(a.sunExposure, 1, 5),
    hydrationLevel: clampOptionalNumber(a.hydrationLevel, 1, 5),
    ultraProcessedFoodLevel: clampOptionalNumber(a.ultraProcessedFoodLevel, 1, 5),

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

  let biomarkers: BiomarkerInput | undefined = undefined;

  if (raw.biomarkers && typeof raw.biomarkers === "object") {
    const b = raw.biomarkers as BiomarkerInput;
    biomarkers = {
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
      lab_date: b.lab_date ? String(b.lab_date) : undefined,
    };
  }

  if (plan === "free" && biomarkers) {
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
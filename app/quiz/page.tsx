"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ensureUserProfile, getCurrentUserProfile } from "../lib/profile";
import {
  normalizePlan,
  getPlanLabel,
  type PlanType,
} from "../lib/planLimits";

type MainGoal =
  | "energy"
  | "focus"
  | "sleep"
  | "general_health"
  | "weight"
  | "recovery";

type SmokingStatus =
  | "never"
  | "former"
  | "current"
  | "occasional"
  | "unknown";

type RequestedAiMode = "basic" | "advanced";

type QuizDraft = {
  plan?: PlanType;
  requestedAiMode?: RequestedAiMode;
  assessment: {
    age?: number;
    sex?: "male" | "female";

    weightKg?: number;
    heightCm?: number;
    waistCm?: number;

    stressLevel?: number;
    sleepHours?: number;
    sleepQuality?: number;
    fatigueLevel?: number;
    focusDifficulty?: number;

    physicalActivity?: number;
    alcoholUse?: number;
    smokingStatus?: SmokingStatus;
    sunExposure?: number;
    hydrationLevel?: number;
    ultraProcessedFoodLevel?: number;

    bloodPressureKnown?: boolean;
    systolicBp?: number;
    diastolicBp?: number;

    mainGoal?: MainGoal;

    baseConditions?: string[];
    currentMedications?: string[];
    currentSupplements?: string[];
  };
  biomarkers?: {
    fasting_glucose?: number;
    hba1c?: number;
    total_cholesterol?: number;
    hdl?: number;
    ldl?: number;
    triglycerides?: number;
    vitamin_d?: number;
    b12?: number;
    ferritin?: number;
    tsh?: number;
    creatinine?: number;
    ast?: number;
    alt?: number;
    lab_date?: string;
  };
};

const QUIZ_STORAGE_KEY = "vitaSmartQuizDraft";
const LAST_ANALYSIS_CACHE_KEY = "vitaSmartLastHealthAnalysis";

const DEFAULT_DRAFT: QuizDraft = {
  requestedAiMode: "advanced",
  assessment: {
    baseConditions: [],
    currentMedications: [],
    currentSupplements: [],
    bloodPressureKnown: false,
    mainGoal: "general_health",
    smokingStatus: "unknown",
  },
  biomarkers: {},
};

const TOTAL_STEPS = 6;

export default function QuizPage() {
  const [plan, setPlan] = useState<PlanType>("free");
  const [planLoading, setPlanLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<QuizDraft>(DEFAULT_DRAFT);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function initializePage() {
      try {
        setPlanLoading(true);

        let resolvedPlan: PlanType = "free";

        try {
          await ensureUserProfile();
          const profile = await getCurrentUserProfile();
          resolvedPlan = normalizePlan(profile?.plan);
        } catch (err) {
          console.error("Unable to resolve plan in quiz:", err);
        }

        const stored =
          typeof window !== "undefined"
            ? sessionStorage.getItem(QUIZ_STORAGE_KEY)
            : null;

        let nextDraft = DEFAULT_DRAFT;

        if (stored) {
          try {
            const parsed = JSON.parse(stored) as QuizDraft;
            nextDraft = {
              ...DEFAULT_DRAFT,
              ...parsed,
              assessment: {
                ...DEFAULT_DRAFT.assessment,
                ...parsed.assessment,
                baseConditions: parsed.assessment?.baseConditions || [],
                currentMedications: parsed.assessment?.currentMedications || [],
                currentSupplements:
                  parsed.assessment?.currentSupplements || [],
              },
              biomarkers: {
                ...DEFAULT_DRAFT.biomarkers,
                ...parsed.biomarkers,
              },
            };
          } catch {
            nextDraft = DEFAULT_DRAFT;
          }
        }

        nextDraft.plan = resolvedPlan;
        nextDraft.requestedAiMode =
          resolvedPlan === "free" ? "basic" : "advanced";

        if (!ignore) {
          setPlan(resolvedPlan);
          setDraft(nextDraft);
        }
      } finally {
        if (!ignore) {
          setPlanLoading(false);
        }
      }
    }

    initializePage();

    return () => {
      ignore = true;
    };
  }, []);

  const bmi = useMemo(() => {
    const weight = draft.assessment.weightKg;
    const height = draft.assessment.heightCm;

    if (
      typeof weight !== "number" ||
      !Number.isFinite(weight) ||
      typeof height !== "number" ||
      !Number.isFinite(height) ||
      height <= 0
    ) {
      return null;
    }

    return Number((weight / Math.pow(height / 100, 2)).toFixed(1));
  }, [draft.assessment.weightKg, draft.assessment.heightCm]);

  const canUseBiomarkers = plan === "pro" || plan === "premium";

  function updateAssessment<K extends keyof QuizDraft["assessment"]>(
    key: K,
    value: QuizDraft["assessment"][K]
  ) {
    setDraft((prev) => ({
      ...prev,
      plan,
      requestedAiMode: plan === "free" ? "basic" : "advanced",
      assessment: {
        ...prev.assessment,
        [key]: value,
      },
    }));
  }

  function updateBiomarker<K extends keyof NonNullable<QuizDraft["biomarkers"]>>(
    key: K,
    value: NonNullable<QuizDraft["biomarkers"]>[K]
  ) {
    setDraft((prev) => ({
      ...prev,
      biomarkers: {
        ...(prev.biomarkers || {}),
        [key]: value,
      },
    }));
  }

  function handleStringListChange(
    key: "baseConditions" | "currentMedications" | "currentSupplements",
    raw: string
  ) {
    const list = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    updateAssessment(key, list);
  }

  function persistDraft(nextDraft: QuizDraft) {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(nextDraft));
    sessionStorage.removeItem(LAST_ANALYSIS_CACHE_KEY);
  }

  function validateStep(currentStep: number): string | null {
    const a = draft.assessment;

    if (currentStep === 1) {
      if (!a.age || !a.sex || !a.weightKg || !a.heightCm) {
        return "Completa edad, sexo, peso y estatura para continuar.";
      }
    }

    if (currentStep === 2) {
      if (!a.stressLevel || a.sleepHours == null || !a.sleepQuality) {
        return "Completa estrés, horas de sueño y calidad de sueño.";
      }
    }

    if (currentStep === 3) {
      if (
        !a.physicalActivity ||
        a.alcoholUse == null ||
        !a.smokingStatus ||
        !a.sunExposure
      ) {
        return "Completa actividad física, alcohol, tabaquismo y exposición solar.";
      }
    }

    if (currentStep === 4) {
      if (!a.mainGoal) {
        return "Selecciona un objetivo principal.";
      }

      if (
        a.bloodPressureKnown &&
        (!a.systolicBp || !a.diastolicBp)
      ) {
        return "Si conoces tu presión arterial, completa sistólica y diastólica.";
      }
    }

    if (currentStep === 6 && canUseBiomarkers) {
      if (!draft.biomarkers?.lab_date) {
        return "Agrega al menos la fecha de los laboratorios o vuelve al bloque anterior.";
      }
    }

    return null;
  }

  function handleNext() {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  }

  function handleSubmit() {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }

    const finalDraft: QuizDraft = {
      ...draft,
      plan,
      requestedAiMode: plan === "free" ? "basic" : "advanced",
      assessment: {
        ...draft.assessment,
      },
    };

    persistDraft(finalDraft);
    window.location.href = "/results";
  }

  useEffect(() => {
    if (planLoading) return;
    const nextDraft: QuizDraft = {
      ...draft,
      plan,
      requestedAiMode: plan === "free" ? "basic" : "advanced",
    };
    persistDraft(nextDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, plan, planLoading]);

  const progress = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
            VitaSmart AI · Preventive Assessment
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full bg-slate-900 px-4 py-1 text-sm font-semibold text-white">
              Plan actual: {planLoading ? "Cargando..." : getPlanLabel(plan)}
            </div>

            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
              IA objetivo: {plan === "free" ? "Base" : "Avanzada"}
            </div>

            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
              Paso {step} de {TOTAL_STEPS}
            </div>
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">
            Evaluación preventiva estructurada
          </h1>

          <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-600">
            Esta evaluación organiza tu perfil por bloques para construir una
            lectura más seria, más útil y mejor priorizada. No busca hacer
            diagnóstico, sino orientar, resumir señales y ayudarte a ordenar
            prioridades.
          </p>

          <div className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-600">
                Progreso
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {progress}%
              </span>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <StepHeader
            step={step}
            title={getStepTitle(step)}
            description={getStepDescription(step, canUseBiomarkers)}
          />

          {step === 1 && (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <NumberField
                label="Edad"
                value={draft.assessment.age}
                onChange={(value) => updateAssessment("age", value)}
                min={18}
                max={100}
                placeholder="Ej: 39"
              />

              <SelectField
                label="Sexo"
                value={draft.assessment.sex || ""}
                onChange={(value) =>
                  updateAssessment("sex", value as "male" | "female")
                }
                options={[
                  { value: "", label: "Selecciona" },
                  { value: "male", label: "Hombre" },
                  { value: "female", label: "Mujer" },
                ]}
              />

              <NumberField
                label="Peso (kg)"
                value={draft.assessment.weightKg}
                onChange={(value) => updateAssessment("weightKg", value)}
                min={20}
                max={350}
                placeholder="Ej: 78"
              />

              <NumberField
                label="Estatura (cm)"
                value={draft.assessment.heightCm}
                onChange={(value) => updateAssessment("heightCm", value)}
                min={100}
                max={250}
                placeholder="Ej: 175"
              />

              <NumberField
                label="Cintura (cm) — opcional"
                value={draft.assessment.waistCm}
                onChange={(value) => updateAssessment("waistCm", value)}
                min={30}
                max={250}
                placeholder="Ej: 92"
              />

              <ReadOnlyCard
                label="IMC estimado"
                value={bmi != null ? `${bmi}` : "Se calcula al ingresar peso y estatura"}
              />
            </div>
          )}

          {step === 2 && (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <RangeSelect
                label="Nivel de estrés"
                value={draft.assessment.stressLevel}
                onChange={(value) => updateAssessment("stressLevel", value)}
              />

              <NumberField
                label="Horas de sueño"
                value={draft.assessment.sleepHours}
                onChange={(value) => updateAssessment("sleepHours", value)}
                min={0}
                max={16}
                step={0.5}
                placeholder="Ej: 6.5"
              />

              <RangeSelect
                label="Calidad de sueño"
                value={draft.assessment.sleepQuality}
                onChange={(value) => updateAssessment("sleepQuality", value)}
              />

              <RangeSelect
                label="Fatiga"
                value={draft.assessment.fatigueLevel}
                onChange={(value) => updateAssessment("fatigueLevel", value)}
              />

              <RangeSelect
                label="Dificultad de enfoque"
                value={draft.assessment.focusDifficulty}
                onChange={(value) => updateAssessment("focusDifficulty", value)}
              />
            </div>
          )}

          {step === 3 && (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <RangeSelect
                label="Actividad física"
                value={draft.assessment.physicalActivity}
                onChange={(value) => updateAssessment("physicalActivity", value)}
              />

              <SelectField
                label="Alcohol"
                value={
                  draft.assessment.alcoholUse != null
                    ? String(draft.assessment.alcoholUse)
                    : ""
                }
                onChange={(value) =>
                  updateAssessment(
                    "alcoholUse",
                    value === "" ? undefined : Number(value)
                  )
                }
                options={[
                  { value: "", label: "Selecciona" },
                  { value: "0", label: "Nada o casi nada" },
                  { value: "1", label: "Muy bajo" },
                  { value: "2", label: "Bajo" },
                  { value: "3", label: "Medio" },
                  { value: "4", label: "Alto" },
                  { value: "5", label: "Muy alto" },
                ]}
              />

              <SelectField
                label="Tabaquismo"
                value={draft.assessment.smokingStatus || "unknown"}
                onChange={(value) =>
                  updateAssessment("smokingStatus", value as SmokingStatus)
                }
                options={[
                  { value: "unknown", label: "No especificado" },
                  { value: "never", label: "Nunca" },
                  { value: "former", label: "Exfumador" },
                  { value: "current", label: "Actual" },
                  { value: "occasional", label: "Ocasional" },
                ]}
              />

              <RangeSelect
                label="Exposición solar"
                value={draft.assessment.sunExposure}
                onChange={(value) => updateAssessment("sunExposure", value)}
              />

              <RangeSelect
                label="Hidratación — opcional"
                value={draft.assessment.hydrationLevel}
                onChange={(value) => updateAssessment("hydrationLevel", value)}
                optional
              />

              <RangeSelect
                label="Ultraprocesados — opcional"
                value={draft.assessment.ultraProcessedFoodLevel}
                onChange={(value) =>
                  updateAssessment("ultraProcessedFoodLevel", value)
                }
                optional
              />
            </div>
          )}

          {step === 4 && (
            <div className="mt-8 space-y-8">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <ToggleField
                  label="¿Conoces tu presión arterial?"
                  checked={Boolean(draft.assessment.bloodPressureKnown)}
                  onChange={(checked) =>
                    updateAssessment("bloodPressureKnown", checked)
                  }
                />

                {draft.assessment.bloodPressureKnown ? (
                  <>
                    <NumberField
                      label="Sistólica"
                      value={draft.assessment.systolicBp}
                      onChange={(value) => updateAssessment("systolicBp", value)}
                      min={70}
                      max={260}
                      placeholder="Ej: 128"
                    />
                    <NumberField
                      label="Diastólica"
                      value={draft.assessment.diastolicBp}
                      onChange={(value) => updateAssessment("diastolicBp", value)}
                      min={40}
                      max={160}
                      placeholder="Ej: 82"
                    />
                  </>
                ) : null}
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <TextAreaField
                  label="Enfermedades de base"
                  helper="Separa por comas. Ej: hipertensión, gastritis, hipotiroidismo"
                  value={(draft.assessment.baseConditions || []).join(", ")}
                  onChange={(value) =>
                    handleStringListChange("baseConditions", value)
                  }
                />

                <TextAreaField
                  label="Medicamentos actuales"
                  helper="Separa por comas. Ej: losartán, metformina"
                  value={(draft.assessment.currentMedications || []).join(", ")}
                  onChange={(value) =>
                    handleStringListChange("currentMedications", value)
                  }
                />

                <TextAreaField
                  label="Suplementos actuales"
                  helper="Separa por comas. Ej: magnesio, omega-3, vitamina D"
                  value={(draft.assessment.currentSupplements || []).join(", ")}
                  onChange={(value) =>
                    handleStringListChange("currentSupplements", value)
                  }
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Objetivo principal
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {GOAL_OPTIONS.map((item) => {
                    const active = draft.assessment.mainGoal === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => updateAssessment("mainGoal", item.value)}
                        className={`rounded-2xl border p-5 text-left transition ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-base font-semibold">{item.label}</div>
                        <div
                          className={`mt-2 text-sm leading-6 ${
                            active ? "text-slate-200" : "text-slate-600"
                          }`}
                        >
                          {item.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Biomarcadores
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    Este bloque aporta una capa más fuerte para la interpretación
                    preventiva. Está disponible en Pro y Premium.
                  </p>
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    canUseBiomarkers
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {canUseBiomarkers ? "Desbloqueado" : "Bloqueado"}
                </span>
              </div>

              {canUseBiomarkers ? (
                <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <NumberField
                    label="Glucosa en ayunas"
                    value={draft.biomarkers?.fasting_glucose}
                    onChange={(value) => updateBiomarker("fasting_glucose", value)}
                    placeholder="Ej: 95"
                  />

                  <NumberField
                    label="HbA1c"
                    value={draft.biomarkers?.hba1c}
                    onChange={(value) => updateBiomarker("hba1c", value)}
                    step={0.1}
                    placeholder="Ej: 5.4"
                  />

                  <NumberField
                    label="Colesterol total"
                    value={draft.biomarkers?.total_cholesterol}
                    onChange={(value) =>
                      updateBiomarker("total_cholesterol", value)
                    }
                    placeholder="Ej: 190"
                  />

                  <NumberField
                    label="HDL"
                    value={draft.biomarkers?.hdl}
                    onChange={(value) => updateBiomarker("hdl", value)}
                    placeholder="Ej: 48"
                  />

                  <NumberField
                    label="LDL"
                    value={draft.biomarkers?.ldl}
                    onChange={(value) => updateBiomarker("ldl", value)}
                    placeholder="Ej: 112"
                  />

                  <NumberField
                    label="Triglicéridos"
                    value={draft.biomarkers?.triglycerides}
                    onChange={(value) => updateBiomarker("triglycerides", value)}
                    placeholder="Ej: 145"
                  />

                  <NumberField
                    label="Vitamina D"
                    value={draft.biomarkers?.vitamin_d}
                    onChange={(value) => updateBiomarker("vitamin_d", value)}
                    placeholder="Ej: 28"
                  />

                  <NumberField
                    label="Vitamina B12"
                    value={draft.biomarkers?.b12}
                    onChange={(value) => updateBiomarker("b12", value)}
                    placeholder="Ej: 460"
                  />

                  <NumberField
                    label="Ferritina"
                    value={draft.biomarkers?.ferritin}
                    onChange={(value) => updateBiomarker("ferritin", value)}
                    placeholder="Ej: 85"
                  />

                  <NumberField
                    label="TSH"
                    value={draft.biomarkers?.tsh}
                    onChange={(value) => updateBiomarker("tsh", value)}
                    step={0.1}
                    placeholder="Ej: 2.4"
                  />

                  <NumberField
                    label="Creatinina"
                    value={draft.biomarkers?.creatinine}
                    onChange={(value) => updateBiomarker("creatinine", value)}
                    step={0.1}
                    placeholder="Ej: 0.9"
                  />

                  <NumberField
                    label="AST"
                    value={draft.biomarkers?.ast}
                    onChange={(value) => updateBiomarker("ast", value)}
                    placeholder="Ej: 24"
                  />

                  <NumberField
                    label="ALT"
                    value={draft.biomarkers?.alt}
                    onChange={(value) => updateBiomarker("alt", value)}
                    placeholder="Ej: 27"
                  />

                  <DateField
                    label="Fecha de laboratorios"
                    value={draft.biomarkers?.lab_date || ""}
                    onChange={(value) => updateBiomarker("lab_date", value)}
                  />
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-6">
                  <p className="text-sm leading-7 text-violet-900">
                    Tu plan actual permite una evaluación útil, pero sin la capa
                    de biomarcadores. Si quieres una interpretación más profunda,
                    más contextual y con mejor lectura metabólica o nutricional,
                    sube a Pro o Premium.
                  </p>

                  <div className="mt-4">
                    <Link
                      href="/pricing"
                      className="inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Ver planes
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="mt-8 space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xl font-semibold text-slate-900">
                  Resumen antes de generar resultados
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Revisa este resumen. Al continuar, VitaSmart AI guardará tu
                  draft en sesión y construirá tu lectura preventiva en la
                  pantalla de resultados.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryItem label="Edad" value={String(draft.assessment.age || "-")} />
                  <SummaryItem label="Sexo" value={translateSex(draft.assessment.sex)} />
                  <SummaryItem
                    label="Peso / estatura"
                    value={`${draft.assessment.weightKg || "-"} kg · ${
                      draft.assessment.heightCm || "-"
                    } cm`}
                  />
                  <SummaryItem
                    label="IMC estimado"
                    value={bmi != null ? String(bmi) : "-"}
                  />
                  <SummaryItem
                    label="Estrés"
                    value={translateFiveLevelLabel(draft.assessment.stressLevel)}
                  />
                  <SummaryItem
                    label="Sueño"
                    value={
                      draft.assessment.sleepHours != null
                        ? `${draft.assessment.sleepHours} h`
                        : "-"
                    }
                  />
                  <SummaryItem
                    label="Calidad de sueño"
                    value={translateFiveLevelLabel(draft.assessment.sleepQuality)}
                  />
                  <SummaryItem
                    label="Objetivo"
                    value={translateGoal(draft.assessment.mainGoal)}
                  />
                  <SummaryItem
                    label="Plan / IA"
                    value={`${getPlanLabel(plan)} · ${
                      plan === "free" ? "Base" : "Avanzada"
                    }`}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
                Esta plataforma no reemplaza evaluación médica. La interpretación
                será preventiva, prudente y orientada a priorización de señales,
                no a diagnóstico.
              </div>
            </div>
          )}

          {error ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 1}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Atrás
              </button>

              <Link
                href="/pricing"
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ver planes
              </Link>
            </div>

            <div className="flex gap-3">
              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
                >
                  Generar resultados
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StepHeader({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
        Bloque {step}
      </div>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : Number(e.target.value))
        }
        min={min}
        max={max}
        step={step ?? 1}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-slate-900"
      />
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-slate-900"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-slate-900"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-14 rounded-full transition ${
          checked ? "bg-slate-900" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-8" : "left-1"
          }`}
        />
      </button>
    </label>
  );
}

function RangeSelect({
  label,
  value,
  onChange,
  optional = false,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700">
        {label} {optional ? "— opcional" : ""}
      </span>
      <select
        value={value != null ? String(value) : ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : Number(e.target.value))
        }
        className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-slate-900"
      >
        <option value="">{optional ? "No responder" : "Selecciona"}</option>
        <option value="1">1 · Muy bajo / muy pobre</option>
        <option value="2">2 · Bajo</option>
        <option value="3">3 · Medio</option>
        <option value="4">4 · Bueno / alto</option>
        <option value="5">5 · Muy bueno / muy alto</option>
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-slate-900"
      />
      {helper ? (
        <span className="mt-2 block text-xs leading-5 text-slate-500">
          {helper}
        </span>
      ) : null}
    </label>
  );
}

function ReadOnlyCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function getStepTitle(step: number) {
  if (step === 1) return "Perfil corporal";
  if (step === 2) return "Sueño y estrés";
  if (step === 3) return "Hábitos";
  if (step === 4) return "Contexto de salud y objetivo";
  if (step === 5) return "Biomarcadores";
  return "Resumen final";
}

function getStepDescription(step: number, canUseBiomarkers: boolean) {
  if (step === 1) {
    return "Este bloque define la base corporal del análisis: edad, sexo, peso, estatura y cintura opcional. A partir de esto, VitaSmart AI puede calcular un contexto corporal más útil.";
  }
  if (step === 2) {
    return "Aquí capturamos dos de las capas más dominantes del perfil preventivo: estrés, horas de sueño, calidad de sueño, fatiga y dificultad de enfoque.";
  }
  if (step === 3) {
    return "Los hábitos cambian radicalmente la calidad de la interpretación. Actividad física, alcohol, tabaquismo, sol, hidratación y ultraprocesados ayudan a priorizar mejor.";
  }
  if (step === 4) {
    return "En este bloque organizamos presión arterial conocida, contexto médico, suplementos actuales y el objetivo principal que quieres priorizar.";
  }
  if (step === 5) {
    return canUseBiomarkers
      ? "Si tienes laboratorios, aquí es donde la interpretación preventiva gana profundidad. No necesitas llenar todos los campos, pero entre más contexto real haya, mejor."
      : "Este bloque pertenece a Pro y Premium. En Free seguirás teniendo una lectura útil, pero sin la capa de biomarcadores.";
  }
  return "Última revisión antes de construir tu lectura personalizada. El resultado será una interpretación preventiva estructurada y no un diagnóstico.";
}

function translateSex(value?: string) {
  if (value === "male") return "Hombre";
  if (value === "female") return "Mujer";
  return "-";
}

function translateGoal(value?: string) {
  if (value === "energy") return "Más energía";
  if (value === "focus") return "Mejor concentración";
  if (value === "sleep") return "Dormir mejor";
  if (value === "general_health") return "Salud general";
  if (value === "weight") return "Peso / soporte metabólico";
  if (value === "recovery") return "Recuperación";
  return "-";
}

function translateFiveLevelLabel(value?: number) {
  if (!value) return "-";
  if (value === 1) return "Muy bajo";
  if (value === 2) return "Bajo";
  if (value === 3) return "Medio";
  if (value === 4) return "Bueno";
  return "Muy bueno";
}

const GOAL_OPTIONS: Array<{
  value: MainGoal;
  label: string;
  description: string;
}> = [
  {
    value: "energy",
    label: "Más energía",
    description:
      "Prioriza estabilidad diaria, reducción de fatiga y mejor sensación de rendimiento.",
  },
  {
    value: "focus",
    label: "Mejor concentración",
    description:
      "Prioriza claridad mental, atención sostenida y una lectura más útil del enfoque.",
  },
  {
    value: "sleep",
    label: "Dormir mejor",
    description:
      "Prioriza calidad, duración y consistencia del descanso.",
  },
  {
    value: "general_health",
    label: "Salud general",
    description:
      "Prioriza una lectura más equilibrada de bienestar preventivo global.",
  },
  {
    value: "weight",
    label: "Peso / soporte metabólico",
    description:
      "Prioriza señales metabólicas, hábitos y contexto corporal.",
  },
  {
    value: "recovery",
    label: "Recuperación",
    description:
      "Prioriza balance entre carga, descanso, estrés y recuperación funcional.",
  },
];
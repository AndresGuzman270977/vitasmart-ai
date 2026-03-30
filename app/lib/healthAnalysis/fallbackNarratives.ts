// app/lib/healthAnalysis/fallbackNarratives.ts

import { ingredientCatalog } from "../catalog/ingredientCatalog";
import { ProductCatalogItem } from "../catalog/catalogTypes";
import {
  HealthAnalysisConfidenceBlock,
  HealthAnalysisScoreBlock,
  HealthAnalysisSummaryBlock,
  ProductNarrativeOutput,
} from "./types";

type Locale = "es" | "en";

function scoreBand(score: number): "strong" | "mixed" | "fragile" {
  if (score >= 80) return "strong";
  if (score >= 60) return "mixed";
  return "fragile";
}

function humanizeNeedLabel(value: string): string {
  return value
    .replace(/Need$/i, "")
    .replace(/([A-Z])/g, " $1")
    .replaceAll("_", " ")
    .trim()
    .toLowerCase();
}

const textByLocale = {
  es: {
    noData: "N/A",
    generalHealth: "salud general",
    executiveStrong:
      "Tu perfil actual muestra una lectura preventiva relativamente sólida, aunque todavía hay áreas concretas que podrían optimizarse. Las oportunidades más claras aparecen alrededor de {needs}.",
    executiveMixed:
      "Tu perfil actual sugiere una lectura preventiva mixta. Algunas áreas parecen razonablemente estables, pero hay oportunidades claras para priorizar {needs}.",
    executiveFragile:
      "Tu perfil actual sugiere que varias áreas preventivas merecen una atención más cercana. Las prioridades más relevantes parecen ser {needs}.",
    clinicalIntro:
      "Esta interpretación no es diagnóstica. Es una lectura preventiva estructurada basada en datos autorreportados",
    completenessHigh: "con una completitud de datos relativamente buena",
    completenessModerate: "con una completitud de datos moderada",
    completenessLimited: "con una completitud de datos limitada",
    clinicalDrivers:
      "Los factores dominantes en este perfil son {drivers}. Estos hallazgos pueden ser consistentes con una necesidad de reforzar hábitos y, cuando corresponda, realizar seguimiento profesional.",
    clinicalDriversFallback: "necesidades preventivas generales de soporte",
    scoreNarrative:
      "Health Score: {health}/100. Sueño: {sleep}, Estrés: {stress}, Energía: {energy}, Enfoque: {focus}, Metabólico: {metabolic}. Nivel de confianza: {confidence}.",
    followUpWithRisks:
      "Se identificaron algunas señales preventivas de seguimiento: {risks}. Si estos patrones persisten, o si existen síntomas, medicamentos o condiciones médicas conocidas, sería razonable validar estos hallazgos con un profesional de salud calificado.",
    followUpWithoutRisks:
      "Este perfil no genera señales preventivas de alerta especialmente fuertes, pero sigue siendo razonable revisar la evolución con el tiempo, especialmente si el objetivo principal es {goal}. Una revisión profesional puede ser útil si persisten síntomas o si luego se dispone de nuevos datos de laboratorio.",
    qualityNoSeal:
      "Esta entrada del catálogo no resalta un sello fuerte de verificación externa, por lo que la confianza depende más del contexto de marca y de la formulación.",
    qualityWithSeal:
      "El contexto de calidad incluye {seals}, lo que puede aumentar la confianza en estándares de fabricación o verificación según el producto específico.",
    additionalNotes: "Notas adicionales del producto: {notes}.",
    whyForUserWithReasons:
      "Este producto aparece como relevante porque {reasons}",
    whyForUserFallback:
      "Este producto aparece como relevante porque el ingrediente se alinea con una de las prioridades de soporte más fuertes del perfil actual.",
    scienceFallback:
      "Este ingrediente fue seleccionado porque podría alinearse con el perfil preventivo actual de soporte, aunque su relevancia científica puede variar según el contexto.",
    withFood: "Generalmente se utiliza con comida.",
    withoutFood: "A menudo no depende de la comida.",
    dependsOnFood: "El momento respecto a la comida depende de la formulación.",
    useByLabel:
      "Utilízalo según la etiqueta del producto y, cuando sea necesario, bajo orientación profesional individual.",
    restrictionsPrefix: "Las restricciones relevantes pueden incluir: {restrictions}.",
    additionalCaution: "Contexto adicional de precaución: {cautions}",
    noRestrictionSignal:
      "No se identificó programáticamente una restricción mayor más allá de la revisión general de la etiqueta y del contexto de medicamentos o condiciones.",
    sideEffectsPrefix:
      "Los posibles efectos secundarios pueden incluir: {effects}.",
    sideEffectsFallback:
      "Los posibles efectos secundarios dependen del ingrediente y del contexto de dosis; sigue siendo recomendable revisar la etiqueta.",
    budgetExcellent:
      "Esta opción entra en la categoría Excelente porque puntúa fuerte en confianza de formulación, contexto de calidad de marca y posicionamiento premium general.",
    budgetVeryGood:
      "Esta opción entra en la categoría Muy buena porque equilibra calidad y valor de forma práctica.",
    budgetGood:
      "Esta opción entra en la categoría Buena porque mantiene el ingrediente accesible con un costo de entrada menor, aunque el contexto de calidad es más básico.",
    recSleep:
      "Prioriza la consistencia del sueño, los horarios de descanso y la reducción de estímulos nocturnos antes de escalar la complejidad de suplementación.",
    recStress:
      "Usa el soporte para estrés como parte de una estrategia más amplia que incluya rutina, capacidad de recuperación y regulación de la carga diaria.",
    recMetabolic:
      "El soporte metabólico debería enfatizar movimiento diario, seguimiento de cintura/peso y control de laboratorio cuando esté disponible.",
    recFocus:
      "Para objetivos relacionados con enfoque, conviene diferenciar la mala concentración causada por estrés o falta de sueño de un problema real de rendimiento cognitivo diurno.",
    recRiskSignals:
      "Como hay señales preventivas de seguimiento presentes, cualquier síntoma persistente o inquietud relacionada con laboratorio merece revisión profesional.",
    recFallback:
      "Conserva este análisis como línea base preventiva y reevalúa después de cambios consistentes en rutina, sueño, actividad o nutrición.",
  },
  en: {
    noData: "N/A",
    generalHealth: "general health",
    executiveStrong:
      "Your current profile shows a relatively solid preventive health picture, although there are still targeted areas that could be optimized. The strongest opportunities appear around {needs}.",
    executiveMixed:
      "Your current profile suggests a mixed preventive health picture. Some areas look reasonably stable, but there are clear opportunities to prioritize {needs}.",
    executiveFragile:
      "Your current profile suggests several preventive areas deserve closer attention. The most relevant priorities appear to be {needs}.",
    clinicalIntro:
      "This interpretation is not diagnostic. It is a structured preventive reading of self-reported inputs",
    completenessHigh: "with relatively good data completeness",
    completenessModerate: "with moderate data completeness",
    completenessLimited: "with limited data completeness",
    clinicalDrivers:
      "The dominant drivers in this profile are {drivers}. These findings may be consistent with a need for lifestyle reinforcement and, when relevant, professional follow-up.",
    clinicalDriversFallback: "general preventive support needs",
    scoreNarrative:
      "Health Score: {health}/100. Sleep: {sleep}, Stress: {stress}, Energy: {energy}, Focus: {focus}, Metabolic: {metabolic}. Confidence level: {confidence}.",
    followUpWithRisks:
      "Some preventive follow-up signals were identified: {risks}. If these patterns persist, or if there are symptoms, medications, or known medical conditions involved, it would be reasonable to validate the findings with a qualified health professional.",
    followUpWithoutRisks:
      "This profile does not generate strong preventive warning signals, but it would still be reasonable to review progress over time, especially if the main goal is {goal}. A professional review may be useful if symptoms persist or additional lab data becomes available.",
    qualityNoSeal:
      "No strong third-party seal is highlighted in this catalog entry, so confidence depends more on brand and formulation context.",
    qualityWithSeal:
      "Quality context includes {seals}, which may increase confidence in manufacturing or verification standards depending on the specific product.",
    additionalNotes: "Additional product notes: {notes}.",
    whyForUserWithReasons:
      "This product appears relevant because {reasons}",
    whyForUserFallback:
      "This product appears relevant because the ingredient aligns with one of the stronger support priorities in the current profile.",
    scienceFallback:
      "This ingredient was selected because it may align with the current preventive support profile, although scientific relevance can vary depending on context.",
    withFood: "Typically used with food.",
    withoutFood: "Often not dependent on food.",
    dependsOnFood: "Food timing depends on the formulation.",
    useByLabel:
      "Use according to the product label and individual professional guidance when needed.",
    restrictionsPrefix: "Relevant restrictions may include: {restrictions}.",
    additionalCaution: "Additional caution context: {cautions}",
    noRestrictionSignal:
      "No major restriction signal was programmatically highlighted beyond general label review and medication/context screening.",
    sideEffectsPrefix: "Possible side effects may include: {effects}.",
    sideEffectsFallback:
      "Possible side effects depend on the ingredient and dose context; label review is still recommended.",
    budgetExcellent:
      "This option enters the Excellent tier because it scores strongly on formulation confidence, brand quality context, and overall premium positioning.",
    budgetVeryGood:
      "This option enters the Very good tier because it balances quality and value in a practical way.",
    budgetGood:
      "This option enters the Good tier because it keeps the ingredient accessible at a lower entry cost, even if the quality context is more basic.",
    recSleep:
      "Prioritize sleep consistency, sleep timing, and evening stimulus reduction before escalating supplement complexity.",
    recStress:
      "Use stress-reduction support as part of a broader strategy that includes routine, recovery capacity, and workload regulation.",
    recMetabolic:
      "Metabolic support should emphasize daily movement, waist/weight tracking, and lab follow-up when available.",
    recFocus:
      "For focus-related goals, it is useful to separate poor concentration caused by stress or sleep loss from true daytime cognitive performance issues.",
    recRiskSignals:
      "Because preventive follow-up signals are present, any persistent symptoms or abnormal laboratory concerns deserve professional review.",
    recFallback:
      "Keep the current analysis as a preventive baseline and reassess after consistent changes in routine, sleep, activity, or nutrition.",
  },
} as const;

function formatTemplate(
  template: string,
  values: Record<string, string | number>
): string {
  return Object.entries(values).reduce((acc, [key, value]) => {
    return acc.replaceAll(`{${key}}`, String(value));
  }, template);
}

export function buildFallbackResultNarratives(params: {
  scores: HealthAnalysisScoreBlock;
  confidence: HealthAnalysisConfidenceBlock;
  strengths: string[];
  mainDrivers: string[];
  priorityActions: string[];
  riskSignals: string[];
  mainGoal?: string;
  dominantNeeds: string[];
  secondaryNeeds: string[];
  locale?: Locale;
}): HealthAnalysisSummaryBlock {
  const locale = params.locale ?? "es";
  const t = textByLocale[locale] ?? textByLocale.es;
  const band = scoreBand(params.scores.healthScore);

  const needsText =
    params.dominantNeeds.map(humanizeNeedLabel).slice(0, 2).join(" y ") ||
    t.generalHealth;

  const executiveSummary =
    band === "strong"
      ? formatTemplate(t.executiveStrong, { needs: needsText })
      : band === "mixed"
      ? formatTemplate(t.executiveMixed, { needs: needsText })
      : formatTemplate(t.executiveFragile, { needs: needsText });

  const completenessText =
    params.confidence.completenessScore >= 70
      ? t.completenessHigh
      : params.confidence.completenessScore >= 40
      ? t.completenessModerate
      : t.completenessLimited;

  const driversText =
    params.mainDrivers.length > 0
      ? params.mainDrivers.join(", ").toLowerCase()
      : t.clinicalDriversFallback;

  const clinicalStyleSummary = `${t.clinicalIntro} ${completenessText}. ${formatTemplate(
    t.clinicalDrivers,
    { drivers: driversText }
  )}`;

  const scoreNarrative = formatTemplate(t.scoreNarrative, {
    health: params.scores.healthScore,
    sleep: params.scores.sleepScore ?? t.noData,
    stress: params.scores.stressScore ?? t.noData,
    energy: params.scores.energyScore ?? t.noData,
    focus: params.scores.focusScore ?? t.noData,
    metabolic: params.scores.metabolicScore ?? t.noData,
    confidence: params.confidence.confidenceLevel,
  });

  const professionalFollowUpAdvice =
    params.riskSignals.length > 0
      ? formatTemplate(t.followUpWithRisks, {
          risks: params.riskSignals.slice(0, 3).join("; "),
        })
      : formatTemplate(t.followUpWithoutRisks, {
          goal: params.mainGoal ?? t.generalHealth,
        });

  return {
    executiveSummary,
    clinicalStyleSummary,
    scoreNarrative,
    professionalFollowUpAdvice,
  };
}

function qualitySealNarrative(
  product: ProductCatalogItem,
  locale: Locale = "es"
): string {
  const t = textByLocale[locale] ?? textByLocale.es;

  if (
    product.qualitySeals.length === 0 ||
    product.qualitySeals.includes("NONE")
  ) {
    return t.qualityNoSeal;
  }

  return formatTemplate(t.qualityWithSeal, {
    seals: product.qualitySeals.join(", "),
  });
}

export function buildFallbackProductNarrative(params: {
  ingredientSlug: string;
  product: ProductCatalogItem;
  whyMatched: string[];
  cautions: string[];
  locale?: Locale;
}): ProductNarrativeOutput {
  const locale = params.locale ?? "es";
  const t = textByLocale[locale] ?? textByLocale.es;

  const ingredient = ingredientCatalog.find(
    (item) => item.slug === params.ingredientSlug
  );

  const whyForUser = params.whyMatched.length
    ? formatTemplate(t.whyForUserWithReasons, {
        reasons: params.whyMatched.slice(0, 3).join(" "),
      })
    : t.whyForUserFallback;

  const scienceSummary = ingredient
    ? `${ingredient.evidenceSummary} ${ingredient.scientificContext}`
    : t.scienceFallback;

  const qualityNotesText =
    params.product.qualityNotes.length > 0
      ? ` ${formatTemplate(t.additionalNotes, {
          notes: params.product.qualityNotes.join(", "),
        })}`
      : "";

  const labQualitySummary = `${qualitySealNarrative(
    params.product,
    locale
  )}${qualityNotesText}`;

  const howToTake = ingredient
    ? `${ingredient.suggestedUse.timing}. ${
        ingredient.suggestedUse.withFood === true
          ? t.withFood
          : ingredient.suggestedUse.withFood === false
          ? t.withoutFood
          : t.dependsOnFood
      } ${ingredient.suggestedUse.generalDoseNote} ${
        ingredient.suggestedUse.durationNote
      }`
    : t.useByLabel;

  const restrictionsSummary =
    ingredient && ingredient.restrictions.length > 0
      ? `${formatTemplate(t.restrictionsPrefix, {
          restrictions: ingredient.restrictions.join(", "),
        })} ${
          params.cautions.length > 0
            ? formatTemplate(t.additionalCaution, {
                cautions: params.cautions.join(" "),
              })
            : ""
        }`.trim()
      : params.cautions.length > 0
      ? params.cautions.join(" ")
      : t.noRestrictionSignal;

  const sideEffectsSummary =
    ingredient && ingredient.sideEffects.length > 0
      ? formatTemplate(t.sideEffectsPrefix, {
          effects: ingredient.sideEffects.join(", "),
        })
      : t.sideEffectsFallback;

  const budgetReason =
    params.product.budgetTier === "excellent"
      ? t.budgetExcellent
      : params.product.budgetTier === "very_good"
      ? t.budgetVeryGood
      : t.budgetGood;

  return {
    whyForUser,
    scienceSummary,
    labQualitySummary,
    howToTake,
    restrictionsSummary,
    sideEffectsSummary,
    budgetReason,
  };
}

export function buildFallbackAdvancedRecommendations(params: {
  dominantNeeds: string[];
  secondaryNeeds: string[];
  riskSignals: string[];
  mainGoal?: string;
  locale?: Locale;
}): string[] {
  const locale = params.locale ?? "es";
  const t = textByLocale[locale] ?? textByLocale.es;

  const items: string[] = [];

  if (params.dominantNeeds.some((n) => n.toLowerCase().includes("sleep"))) {
    items.push(t.recSleep);
  }

  if (params.dominantNeeds.some((n) => n.toLowerCase().includes("stress"))) {
    items.push(t.recStress);
  }

  if (params.dominantNeeds.some((n) => n.toLowerCase().includes("metabolic"))) {
    items.push(t.recMetabolic);
  }

  if (params.mainGoal === "focus") {
    items.push(t.recFocus);
  }

  if (params.riskSignals.length > 0) {
    items.push(t.recRiskSignals);
  }

  if (items.length === 0) {
    items.push(t.recFallback);
  }

  return items.slice(0, 4);
}
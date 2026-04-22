// app/lib/healthAnalysis/fallbackNarratives.ts

import { ingredientCatalog } from "../catalog/ingredientCatalog";
import type { ProductCatalogItem } from "../catalog/catalogTypes";
import type {
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

function cleanArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, max);
}

function joinNaturalEs(items: string[]): string {
  const clean = cleanArray(items, 6);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} y ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} y ${clean[clean.length - 1]}`;
}

function joinNaturalEn(items: string[]): string {
  const clean = cleanArray(items, 6);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

function pickVariant<T>(items: readonly T[], seedSource: string | number): T {
  if (!items.length) {
    throw new Error("pickVariant recibió un arreglo vacío.");
  }

  const seed = String(seedSource || "");
  const score = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return items[score % items.length];
}

const textByLocale = {
  es: {
    noData: "N/A",
    generalHealth: "salud general",

    executiveStrongVariants: [
      "Tu perfil actual muestra una base preventiva relativamente sólida. Aun así, las oportunidades de optimización más claras aparecen alrededor de {needs}.",
      "La lectura actual sugiere un punto de partida favorable desde una perspectiva preventiva, aunque todavía conviene refinar áreas como {needs}.",
      "En conjunto, tu perfil se ve estable en términos preventivos, pero todavía hay margen de mejora especialmente en {needs}.",
    ],
    executiveMixedVariants: [
      "Tu perfil actual muestra una lectura preventiva mixta. Hay áreas razonablemente estables, pero las prioridades más claras se concentran en {needs}.",
      "La lectura actual combina señales favorables con oportunidades evidentes de mejora. Las más relevantes parecen girar alrededor de {needs}.",
      "Este resultado sugiere una base intermedia: no todo luce comprometido, pero sí hay prioridades claras que conviene ordenar en {needs}.",
    ],
    executiveFragileVariants: [
      "Tu perfil actual sugiere que varias áreas preventivas merecen una atención más cercana. Las prioridades más relevantes parecen ser {needs}.",
      "La lectura actual apunta a una base más frágil de lo deseable, con oportunidades de intervención especialmente visibles en {needs}.",
      "Este resultado indica que conviene actuar con más intención en varias capas del perfil, sobre todo en {needs}.",
    ],

    clinicalIntroVariants: [
      "Esta interpretación no es diagnóstica. Es una lectura preventiva estructurada basada en datos autorreportados",
      "Este resultado no debe leerse como diagnóstico. Se trata de una interpretación preventiva construida a partir de información autorreportada",
      "La siguiente lectura tiene un enfoque preventivo y no diagnóstico. Está basada en los datos compartidos por el usuario",
    ],

    completenessHigh: "con una completitud de datos relativamente buena",
    completenessModerate: "con una completitud de datos moderada",
    completenessLimited: "con una completitud de datos limitada",

    clinicalDriversVariants: [
      "Los factores dominantes en este perfil son {drivers}. Esto sugiere que conviene reforzar hábitos base y, cuando aplique, considerar seguimiento profesional.",
      "Los elementos que más pesan en esta lectura son {drivers}. En términos preventivos, esto orienta hacia refuerzo de hábitos, contexto clínico y seguimiento cuando corresponda.",
      "Los principales conductores del resultado actual son {drivers}. Esto puede ser consistente con una necesidad de reorganizar prioridades y validar evolución en el tiempo.",
    ],

    clinicalDriversFallback: "necesidades preventivas generales de soporte",

    scoreNarrativeVariants: [
      "El Health Score actual es {health}/100. En subdominios, sueño: {sleep}, estrés: {stress}, energía: {energy}, enfoque: {focus} y metabólico: {metabolic}. El nivel de confianza del sistema fue {confidence}.",
      "Tu Health Score se ubicó en {health}/100. La lectura por dominios muestra sueño: {sleep}, estrés: {stress}, energía: {energy}, enfoque: {focus} y componente metabólico: {metabolic}. La confianza global fue {confidence}.",
      "El puntaje global fue {health}/100. A nivel interno, el perfil quedó distribuido en sueño: {sleep}, estrés: {stress}, energía: {energy}, enfoque: {focus} y metabólico: {metabolic}, con un nivel de confianza {confidence}.",
    ],

    followUpWithRisksVariants: [
      "Se identificaron algunas señales preventivas de seguimiento: {risks}. Si estos patrones persisten, o si existen síntomas, medicamentos o condiciones médicas conocidas, sería razonable validar estos hallazgos con un profesional de salud calificado.",
      "Entre los puntos que merecen más atención aparecen {risks}. Si estas señales se mantienen en el tiempo o se combinan con síntomas y antecedentes, conviene apoyarse en seguimiento profesional.",
      "La lectura detectó señales preventivas que merece la pena vigilar: {risks}. Si esto coincide con síntomas, medicación activa o antecedentes clínicos, la validación profesional gana relevancia.",
    ],

    followUpWithoutRisksVariants: [
      "Este perfil no genera señales preventivas de alerta especialmente fuertes, pero sigue siendo razonable revisar la evolución con el tiempo, especialmente si el objetivo principal es {goal}.",
      "No se observan señales preventivas especialmente intensas, aunque sí conviene reevaluar progreso y consistencia, sobre todo si tu objetivo principal es {goal}.",
      "No aparecen alertas preventivas dominantes en esta lectura, pero sigue siendo útil revisar evolución y continuidad, en especial si la prioridad actual es {goal}.",
    ],

    qualityNoSeal:
      "Esta entrada del catálogo no resalta un sello fuerte de verificación externa, por lo que la confianza depende más del contexto de marca y de la formulación.",
    qualityWithSeal:
      "El contexto de calidad incluye {seals}, lo que puede aumentar la confianza en estándares de fabricación o verificación según el producto específico.",
    additionalNotes: "Notas adicionales del producto: {notes}.",

    whyForUserVariants: [
      "Este producto aparece como relevante porque {reasons}",
      "Este producto gana relevancia en tu perfil porque {reasons}",
      "La lógica del sistema lo considera pertinente porque {reasons}",
    ],

    whyForUserFallback:
      "Este producto aparece como relevante porque el ingrediente se alinea con una de las prioridades de soporte más fuertes del perfil actual.",

    scienceFallback:
      "Este ingrediente fue seleccionado porque podría alinearse con el perfil preventivo actual de soporte, aunque su relevancia científica puede variar según el contexto.",

    withFood: "Generalmente se utiliza con comida.",
    withoutFood: "A menudo no depende de la comida.",
    dependsOnFood: "El momento respecto a la comida depende de la formulación.",
    useByLabel:
      "Utilízalo según la etiqueta del producto y, cuando sea necesario, bajo orientación profesional individual.",

    restrictionsPrefix:
      "Las restricciones relevantes pueden incluir: {restrictions}.",
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

    recSleepVariants: [
      "Prioriza la consistencia del sueño, los horarios de descanso y la reducción de estímulos nocturnos antes de escalar la complejidad de suplementación.",
      "Antes de aumentar la complejidad del soporte, conviene reforzar higiene del sueño, horarios y regularidad nocturna.",
      "Si el sueño aparece como prioridad, la primera capa de mejora debería centrarse en consistencia horaria, recuperación nocturna y reducción de interrupciones.",
    ],
    recStressVariants: [
      "Usa el soporte para estrés como parte de una estrategia más amplia que incluya rutina, capacidad de recuperación y regulación de la carga diaria.",
      "No conviene tratar el estrés solo con suplementación; la mejora suele depender también de carga mental, descanso y estructura diaria.",
      "El soporte de estrés funciona mejor cuando se combina con una estrategia más amplia de regulación, descanso y recuperación.",
    ],
    recMetabolicVariants: [
      "El soporte metabólico debería enfatizar movimiento diario, seguimiento de cintura/peso y control de laboratorio cuando esté disponible.",
      "La prioridad metabólica suele responder mejor cuando se combina actividad física, seguimiento corporal y validación con laboratorios.",
      "Si el componente metabólico pesa en el perfil, conviene reforzar movimiento diario, control de medidas y seguimiento analítico cuando exista.",
    ],
    recFocusVariants: [
      "Para objetivos relacionados con enfoque, conviene diferenciar la mala concentración causada por estrés o falta de sueño de un problema real de rendimiento cognitivo diurno.",
      "Si la prioridad es el enfoque, vale la pena separar la distracción secundaria a estrés o sueño pobre de un verdadero problema de rendimiento mental sostenido.",
      "Cuando el objetivo principal es concentración, primero conviene identificar si la raíz está en descanso, estrés o energía, antes de escalar apoyos específicos.",
    ],
    recRiskSignalsVariants: [
      "Como hay señales preventivas de seguimiento presentes, cualquier síntoma persistente o inquietud relacionada con laboratorio merece revisión profesional.",
      "Dado que aparecieron señales de seguimiento preventivo, cualquier persistencia clínica o hallazgo analítico debería revisarse profesionalmente.",
      "La presencia de señales preventivas hace recomendable validar con un profesional cualquier síntoma sostenido o cambio clínico relevante.",
    ],
    recFallbackVariants: [
      "Conserva este análisis como línea base preventiva y reevalúa después de cambios consistentes en rutina, sueño, actividad o nutrición.",
      "Toma esta lectura como punto de referencia y vuelve a medir tras sostener ajustes reales en hábitos y recuperación.",
      "Usa este resultado como línea base y repite la evaluación después de cambios consistentes en tus hábitos principales.",
    ],
  },

  en: {
    noData: "N/A",
    generalHealth: "general health",

    executiveStrongVariants: [
      "Your current profile shows a relatively solid preventive picture, although there are still targeted areas that could be optimized around {needs}.",
      "The current reading suggests a favorable preventive baseline, even though there is still room to refine areas such as {needs}.",
      "Overall, your profile looks reasonably stable from a preventive standpoint, but there is still room for improvement around {needs}.",
    ],
    executiveMixedVariants: [
      "Your current profile suggests a mixed preventive picture. Some areas look reasonably stable, but the clearest priorities cluster around {needs}.",
      "The current reading combines favorable signals with visible opportunities for improvement, especially around {needs}.",
      "This result suggests an intermediate baseline: not everything looks compromised, but there are still clear priorities around {needs}.",
    ],
    executiveFragileVariants: [
      "Your current profile suggests several preventive areas deserve closer attention, especially around {needs}.",
      "The current reading points to a more fragile baseline than desirable, with visible opportunities for intervention around {needs}.",
      "This result suggests a need for more intentional action across several layers of the profile, particularly around {needs}.",
    ],

    clinicalIntroVariants: [
      "This interpretation is not diagnostic. It is a structured preventive reading of self-reported inputs",
      "This result should not be read as a diagnosis. It is a preventive interpretation built from self-reported information",
      "The following reading is preventive rather than diagnostic and is based on user-provided inputs",
    ],

    completenessHigh: "with relatively good data completeness",
    completenessModerate: "with moderate data completeness",
    completenessLimited: "with limited data completeness",

    clinicalDriversVariants: [
      "The dominant drivers in this profile are {drivers}. This suggests a need to reinforce foundational habits and, when appropriate, consider professional follow-up.",
      "The elements carrying the most weight in this reading are {drivers}. From a preventive perspective, that points toward lifestyle reinforcement and follow-up when relevant.",
      "The main contributors to the current result are {drivers}. This may be consistent with a need to reorganize priorities and validate progress over time.",
    ],

    clinicalDriversFallback: "general preventive support needs",

    scoreNarrativeVariants: [
      "The current Health Score is {health}/100. Across domains, sleep: {sleep}, stress: {stress}, energy: {energy}, focus: {focus}, and metabolic: {metabolic}. Confidence level was {confidence}.",
      "Your Health Score landed at {health}/100. Domain breakdown shows sleep: {sleep}, stress: {stress}, energy: {energy}, focus: {focus}, and metabolic: {metabolic}. Overall confidence was {confidence}.",
      "The global score was {health}/100. Internally, the profile distributed into sleep: {sleep}, stress: {stress}, energy: {energy}, focus: {focus}, and metabolic: {metabolic}, with {confidence} confidence.",
    ],

    followUpWithRisksVariants: [
      "Some preventive follow-up signals were identified: {risks}. If these patterns persist, or if symptoms, medications, or known conditions are involved, it would be reasonable to validate the findings with a qualified health professional.",
      "Among the points that deserve more attention are {risks}. If these signals persist over time or overlap with symptoms and clinical history, professional follow-up becomes more relevant.",
      "The reading detected preventive signals worth watching: {risks}. If this overlaps with symptoms, active medication use, or medical history, professional validation is advisable.",
    ],

    followUpWithoutRisksVariants: [
      "This profile does not generate especially strong preventive warning signals, but it is still reasonable to review progress over time, especially if the main goal is {goal}.",
      "No especially intense preventive signals appear here, although it still makes sense to reassess progress and consistency, especially if your main goal is {goal}.",
      "There are no dominant warning signals in this reading, but follow-up over time remains useful, particularly if the current priority is {goal}.",
    ],

    qualityNoSeal:
      "No strong third-party seal is highlighted in this catalog entry, so confidence depends more on brand and formulation context.",
    qualityWithSeal:
      "Quality context includes {seals}, which may increase confidence in manufacturing or verification standards depending on the product.",
    additionalNotes: "Additional product notes: {notes}.",

    whyForUserVariants: [
      "This product appears relevant because {reasons}",
      "This product gains relevance in your profile because {reasons}",
      "The system considers this product pertinent because {reasons}",
    ],

    whyForUserFallback:
      "This product appears relevant because the ingredient aligns with one of the stronger support priorities in the current profile.",

    scienceFallback:
      "This ingredient was selected because it may align with the current preventive support profile, although scientific relevance can vary depending on context.",

    withFood: "Typically used with food.",
    withoutFood: "Often not dependent on food.",
    dependsOnFood: "Food timing depends on the formulation.",
    useByLabel:
      "Use according to the product label and individual professional guidance when needed.",

    restrictionsPrefix:
      "Relevant restrictions may include: {restrictions}.",
    additionalCaution: "Additional caution context: {cautions}",
    noRestrictionSignal:
      "No major restriction signal was highlighted beyond label review and medication/context screening.",

    sideEffectsPrefix: "Possible side effects may include: {effects}.",
    sideEffectsFallback:
      "Possible side effects depend on ingredient and dosing context; label review is still recommended.",

    budgetExcellent:
      "This option enters the Excellent tier because it scores strongly on formulation confidence, brand quality context, and premium positioning.",
    budgetVeryGood:
      "This option enters the Very good tier because it balances quality and value in a practical way.",
    budgetGood:
      "This option enters the Good tier because it keeps the ingredient accessible at a lower entry cost, even if the quality context is more basic.",

    recSleepVariants: [
      "Prioritize sleep consistency, sleep timing, and evening stimulus reduction before escalating supplement complexity.",
      "Before increasing support complexity, it makes sense to reinforce sleep hygiene, schedule consistency, and night recovery.",
      "If sleep is a priority, the first layer of improvement should focus on timing regularity, recovery, and reduction of disruptions.",
    ],
    recStressVariants: [
      "Use stress support as part of a broader strategy that includes routine, recovery capacity, and workload regulation.",
      "It is rarely useful to address stress only through supplementation; improvement usually depends on rest, recovery, and daily structure too.",
      "Stress support tends to work better when combined with a broader regulation and recovery strategy.",
    ],
    recMetabolicVariants: [
      "Metabolic support should emphasize daily movement, waist/weight tracking, and lab follow-up when available.",
      "Metabolic priorities usually respond better when physical activity, body tracking, and lab validation are combined.",
      "If metabolic support is a major theme, reinforce daily movement, body measurements, and analytical follow-up when possible.",
    ],
    recFocusVariants: [
      "For focus-related goals, it is useful to separate concentration loss caused by stress or poor sleep from true daytime cognitive performance issues.",
      "If focus is the main priority, it helps to identify whether the root cause is sleep, stress, or energy before escalating targeted support.",
      "When concentration is the main goal, first distinguish between stress-related distraction and true sustained performance issues.",
    ],
    recRiskSignalsVariants: [
      "Because preventive follow-up signals are present, any persistent symptoms or laboratory concerns deserve professional review.",
      "Since follow-up signals were detected, persistent clinical changes or abnormal laboratory concerns should be reviewed professionally.",
      "The presence of preventive signals makes professional review advisable if symptoms or relevant lab changes persist.",
    ],
    recFallbackVariants: [
      "Keep this analysis as a preventive baseline and reassess after consistent changes in routine, sleep, activity, or nutrition.",
      "Use this reading as a reference point and reassess after maintaining meaningful changes in habits and recovery.",
      "Treat this result as your baseline and repeat the evaluation after consistent changes in your main routines.",
    ],
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

function getJoiner(locale: Locale) {
  return locale === "en" ? joinNaturalEn : joinNaturalEs;
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
  const t = textByLocale[locale];
  const joiner = getJoiner(locale);
  const band = scoreBand(params.scores.healthScore);

  const dominantNeeds = cleanArray(params.dominantNeeds, 3).map(
    humanizeNeedLabel
  );
  const secondaryNeeds = cleanArray(params.secondaryNeeds, 2).map(
    humanizeNeedLabel
  );
  const drivers = cleanArray(params.mainDrivers, 4);
  const risks = cleanArray(params.riskSignals, 3);
  const priorities = cleanArray(params.priorityActions, 3);

  const needsPool =
    dominantNeeds.length > 0
      ? dominantNeeds
      : secondaryNeeds.length > 0
      ? secondaryNeeds
      : [t.generalHealth];

  const needsText = joiner(needsPool);

  const executiveTemplate =
    band === "strong"
      ? pickVariant(
          t.executiveStrongVariants,
          `${params.scores.healthScore}${needsText}`
        )
      : band === "mixed"
      ? pickVariant(
          t.executiveMixedVariants,
          `${params.scores.healthScore}${needsText}`
        )
      : pickVariant(
          t.executiveFragileVariants,
          `${params.scores.healthScore}${needsText}`
        );

  const executiveSummary = formatTemplate(executiveTemplate, {
    needs: needsText,
  });

  const completenessText =
    params.confidence.completenessScore >= 70
      ? t.completenessHigh
      : params.confidence.completenessScore >= 40
      ? t.completenessModerate
      : t.completenessLimited;

  const driversText =
    drivers.length > 0
      ? joiner(drivers.map((d) => d.toLowerCase()))
      : t.clinicalDriversFallback;

  const clinicalIntro = pickVariant(
    t.clinicalIntroVariants,
    `${params.confidence.completenessScore}${driversText}`
  );

  const clinicalDriversTemplate = pickVariant(
    t.clinicalDriversVariants,
    `${driversText}${params.scores.healthScore}`
  );

  let clinicalStyleSummary = `${clinicalIntro} ${completenessText}. ${formatTemplate(
    clinicalDriversTemplate,
    { drivers: driversText }
  )}`;

  if (priorities.length > 0) {
    const prioritiesText = joiner(priorities);
    clinicalStyleSummary +=
      locale === "en"
        ? ` The current action priorities appear to be ${prioritiesText}.`
        : ` Las prioridades de acción actuales parecen centrarse en ${prioritiesText}.`;
  }

  const scoreNarrativeTemplate = pickVariant(
    t.scoreNarrativeVariants,
    `${params.scores.healthScore}${params.confidence.confidenceLevel}`
  );

  const scoreNarrative = formatTemplate(scoreNarrativeTemplate, {
    health: params.scores.healthScore,
    sleep: params.scores.sleepScore ?? t.noData,
    stress: params.scores.stressScore ?? t.noData,
    energy: params.scores.energyScore ?? t.noData,
    focus: params.scores.focusScore ?? t.noData,
    metabolic: params.scores.metabolicScore ?? t.noData,
    confidence:
      locale === "en"
        ? params.confidence.confidenceLevel
        : params.confidence.confidenceLevel === "high"
        ? "alta"
        : params.confidence.confidenceLevel === "moderate"
        ? "media"
        : "limitada",
  });

  const professionalFollowUpAdvice =
    risks.length > 0
      ? formatTemplate(
          pickVariant(t.followUpWithRisksVariants, risks.join("|")),
          {
            risks: joiner(risks),
          }
        )
      : formatTemplate(
          pickVariant(
            t.followUpWithoutRisksVariants,
            `${params.mainGoal || ""}${params.scores.healthScore}`
          ),
          {
            goal: params.mainGoal ?? t.generalHealth,
          }
        );

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
  const t = textByLocale[locale];

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
  const t = textByLocale[locale];
  const joiner = getJoiner(locale);

  const ingredient = ingredientCatalog.find(
    (item) => item.slug === params.ingredientSlug
  );

  const safeWhyMatched = cleanArray(params.whyMatched, 3);
  const safeCautions = cleanArray(params.cautions, 4);

  const whyForUser = safeWhyMatched.length
    ? formatTemplate(
        pickVariant(t.whyForUserVariants, safeWhyMatched.join("|")),
        {
          reasons: joiner(safeWhyMatched),
        }
      )
    : t.whyForUserFallback;

  const scienceSummary = ingredient
    ? `${ingredient.evidenceSummary} ${ingredient.scientificContext}`.trim()
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
      }`.trim()
    : t.useByLabel;

  const restrictionsSummary =
    ingredient && ingredient.restrictions.length > 0
      ? `${formatTemplate(t.restrictionsPrefix, {
          restrictions: ingredient.restrictions.join(", "),
        })} ${
          safeCautions.length > 0
            ? formatTemplate(t.additionalCaution, {
                cautions: joiner(safeCautions),
              })
            : ""
        }`.trim()
      : safeCautions.length > 0
      ? joiner(safeCautions)
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
  const t = textByLocale[locale];

  const dominant = cleanArray(params.dominantNeeds, 6).map((n) =>
    n.toLowerCase()
  );
  const risks = cleanArray(params.riskSignals, 4);

  const items: string[] = [];

  if (dominant.some((n) => n.includes("sleep"))) {
    items.push(pickVariant(t.recSleepVariants, dominant.join("|")));
  }

  if (dominant.some((n) => n.includes("stress"))) {
    items.push(pickVariant(t.recStressVariants, dominant.join("|")));
  }

  if (dominant.some((n) => n.includes("metabolic"))) {
    items.push(pickVariant(t.recMetabolicVariants, dominant.join("|")));
  }

  if (params.mainGoal === "focus") {
    items.push(pickVariant(t.recFocusVariants, params.mainGoal));
  }

  if (risks.length > 0) {
    items.push(pickVariant(t.recRiskSignalsVariants, risks.join("|")));
  }

  if (items.length === 0) {
    items.push(
      pickVariant(t.recFallbackVariants, params.mainGoal || "fallback")
    );
  }

  return Array.from(new Set(items)).slice(0, 4);
}
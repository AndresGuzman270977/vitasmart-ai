// app/lib/healthAnalysis/generateHealthNarrativesWithAI.ts

import OpenAI from "openai";
import type { HealthAnalysisSummaryBlock } from "./types";
import type { AiNarrativeContext } from "./buildAiNarrativeContext";

export type GeneratedHealthNarratives = {
  summaries: HealthAnalysisSummaryBlock;
  advancedRecommendations: string[];
};

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Falta OPENAI_API_KEY en las variables de entorno.");
  }

  return new OpenAI({ apiKey });
}

function safeText(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function safeStringArray(value: unknown, fallback: string[], max = 8) {
  if (!Array.isArray(value)) return fallback;

  const cleaned = value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, max);

  return cleaned.length > 0 ? cleaned : fallback;
}

function buildPrompt(context: AiNarrativeContext) {
  return `
Eres un redactor experto en salud preventiva para VitaSmart AI.

Genera una lectura personalizada en español usando SOLO los datos del contexto.

Reglas obligatorias:
- No diagnostiques.
- No afirmes enfermedades.
- No inventes síntomas, biomarcadores ni antecedentes.
- No uses lenguaje alarmista.
- No recomiendes suspender medicamentos.
- No reemplaces consulta médica.
- No repitas literalmente los textos fallback.
- No uses markdown.
- No pongas títulos dentro de los campos.
- Redacta con tono humano, premium, claro y clínico-preventivo.
- Si faltan datos, dilo de forma natural y prudente.
- Las recomendaciones deben ser concretas, accionables y coherentes con scores, drivers, riskSignals y needs.

Diferenciación por plan:
- Pro: más claridad, explicación y priorización.
- Premium: mayor profundidad, continuidad y personalización.
- Free normalmente no debería llegar a esta función.

Devuelve exactamente:
{
  "executiveSummary": "string",
  "clinicalStyleSummary": "string",
  "scoreNarrative": "string",
  "professionalFollowUpAdvice": "string",
  "advancedRecommendations": ["string"]
}

Contexto:
${JSON.stringify(context)}
`.trim();
}

export async function generateHealthNarrativesWithAI(
  context: AiNarrativeContext
): Promise<GeneratedHealthNarratives> {
  const client = getOpenAIClient();

  const response = await client.responses.create({
    model: process.env.OPENAI_HEALTH_MODEL?.trim() || "gpt-4.1-mini",
    temperature: 0.75,
    input: [
      {
        role: "system",
        content:
          "Eres un especialista en redacción personalizada de resultados preventivos de salud para una app premium de wellness. Respondes siempre en español claro, prudente y no diagnóstico.",
      },
      {
        role: "user",
        content: buildPrompt(context),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "health_narratives",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            executiveSummary: { type: "string" },
            clinicalStyleSummary: { type: "string" },
            scoreNarrative: { type: "string" },
            professionalFollowUpAdvice: { type: "string" },
            advancedRecommendations: {
              type: "array",
              minItems: 1,
              maxItems: 8,
              items: { type: "string" },
            },
          },
          required: [
            "executiveSummary",
            "clinicalStyleSummary",
            "scoreNarrative",
            "professionalFollowUpAdvice",
            "advancedRecommendations",
          ],
        },
      },
    },
  });

  const raw = response.output_text || "{}";

  let parsed: any;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("La IA no devolvió JSON estructurado válido.");
  }

  return {
    summaries: {
      executiveSummary: safeText(
        parsed.executiveSummary,
        context.fallbackSummaries.executiveSummary
      ),
      clinicalStyleSummary: safeText(
        parsed.clinicalStyleSummary,
        context.fallbackSummaries.clinicalStyleSummary
      ),
      scoreNarrative: safeText(
        parsed.scoreNarrative,
        context.fallbackSummaries.scoreNarrative
      ),
      professionalFollowUpAdvice: safeText(
        parsed.professionalFollowUpAdvice,
        context.fallbackSummaries.professionalFollowUpAdvice
      ),
    },
    advancedRecommendations: safeStringArray(
      parsed.advancedRecommendations,
      context.fallbackAdvancedRecommendations,
      8
    ),
  };
}
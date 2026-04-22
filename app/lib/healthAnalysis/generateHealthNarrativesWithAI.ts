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
Eres un redactor experto en resultados preventivos de salud y bienestar para una app premium llamada VitaSmart AI.

Tu trabajo es transformar datos estructurados reales del usuario en una respuesta MUY personalizada, menos repetitiva y más natural que un sistema de plantillas.

Objetivos:
- Redactar con tono humano, clínico-preventivo, elegante y útil.
- Variar la redacción entre usuarios.
- Basarte en los datos reales del perfil, scores, drivers, riesgos, needs y contexto.
- No inventar diagnósticos.
- No afirmar enfermedades no confirmadas.
- No sonar alarmista.
- No repetir literalmente las frases fallback salvo que sea necesario.
- Si faltan datos, intégralo con naturalidad.
- Las recomendaciones deben ser accionables, concretas y no redundantes.

Devuelve SOLO JSON válido con esta estructura exacta:
{
  "executiveSummary": "string",
  "clinicalStyleSummary": "string",
  "scoreNarrative": "string",
  "professionalFollowUpAdvice": "string",
  "advancedRecommendations": ["string", "string", "string", "string"]
}

Contexto completo del caso:
${JSON.stringify(context, null, 2)}
`.trim();
}

export async function generateHealthNarrativesWithAI(
  context: AiNarrativeContext
): Promise<GeneratedHealthNarratives> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_HEALTH_MODEL?.trim() || "gpt-4.1-mini",
    temperature: 0.9,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Eres un especialista en redacción personalizada de resultados preventivos de salud para una aplicación de wellness.",
      },
      {
        role: "user",
        content: buildPrompt(context),
      },
    ],
  });

  const raw = response.choices?.[0]?.message?.content || "{}";

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("La IA no devolvió un JSON válido.");
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
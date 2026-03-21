import OpenAI from "openai";
import { getPlanLimits, PlanType } from "./planLimits";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type GenerateAnalysisParams = {
  input: any;
  plan: PlanType;
};

export async function generateHealthAnalysis({
  input,
  plan,
}: GenerateAnalysisParams) {
  const limits = getPlanLimits(plan);

  const isAdvanced = limits.advancedAI;

  const systemPrompt = `
Eres un experto en salud y bienestar.

Niveles de respuesta:

- BASIC (usuarios free):
  - Consejos generales
  - Recomendaciones básicas
  - NO suplementos específicos
  - NO protocolos avanzados

- ADVANCED (pro/premium):
  - Recomendaciones personalizadas
  - Suplementos específicos
  - Protocolos detallados
  - Estrategias optimizadas

Nivel actual: ${isAdvanced ? "ADVANCED" : "BASIC"}
`;

  const userPrompt = `
Datos del usuario:
${JSON.stringify(input, null, 2)}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return completion.choices[0].message.content;
}
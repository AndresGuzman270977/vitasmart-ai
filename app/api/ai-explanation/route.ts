import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import {
  getPlanLimits,
  normalizePlan,
  type PlanType,
} from "../../lib/planLimits";

type RequestBody = {
  age?: string;
  sex?: string;
  stress?: string;
  sleep?: string;
  goal?: string;
  requestedAiMode?: "basic" | "advanced";
};

type UserProfileRow = {
  id: string;
  email?: string | null;
  plan?: PlanType | string | null;
};

type AdvancedRecommendation = {
  title: string;
  description: string;
};

type SafeAnalysisResponse = {
  score: number;
  summary: string;
  factors: string[];
  advancedRecommendations?: AdvancedRecommendation[];
};

function buildBasicPrompt({
  age,
  sex,
  stress,
  sleep,
  goal,
}: Required<Pick<RequestBody, "age" | "sex" | "stress" | "sleep" | "goal">>) {
  return `
Eres un analista de salud preventiva y bienestar.

Analiza este perfil:
- Edad: ${age}
- Sexo: ${sex}
- Estrés: ${stress}
- Sueño: ${sleep}
- Objetivo: ${goal}

Devuelve únicamente JSON válido con esta estructura exacta:

{
  "score": number,
  "summary": "texto breve en español, máximo 3 frases",
  "factors": ["factor 1", "factor 2", "factor 3"]
}

Reglas:
- El score debe estar entre 40 y 95.
- Si el estrés es alto, baja el score.
- Si duerme poco, baja el score.
- Si el objetivo es salud general y el perfil es razonable, score medio-alto.
- No diagnostiques enfermedades.
- Escribe en español claro, profesional y amigable.
- factors debe tener exactamente 3 elementos.
`;
}

function buildAdvancedPrompt({
  age,
  sex,
  stress,
  sleep,
  goal,
}: Required<Pick<RequestBody, "age" | "sex" | "stress" | "sleep" | "goal">>) {
  return `
Eres un analista avanzado de salud preventiva y bienestar.

Analiza este perfil:
- Edad: ${age}
- Sexo: ${sex}
- Estrés: ${stress}
- Sueño: ${sleep}
- Objetivo: ${goal}

Devuelve únicamente JSON válido con esta estructura exacta:

{
  "score": number,
  "summary": "texto breve en español, máximo 4 frases",
  "factors": ["factor 1", "factor 2", "factor 3"],
  "advanced_recommendations": [
    {
      "title": "título breve",
      "description": "explicación breve y clara"
    },
    {
      "title": "título breve",
      "description": "explicación breve y clara"
    },
    {
      "title": "título breve",
      "description": "explicación breve y clara"
    }
  ]
}

Reglas:
- El score debe estar entre 40 y 95.
- Si el estrés es alto, baja el score.
- Si duerme poco, baja el score.
- Si el objetivo es salud general y el perfil es razonable, score medio-alto.
- No diagnostiques enfermedades.
- Escribe en español claro, profesional y amigable.
- factors debe tener exactamente 3 elementos.
- advanced_recommendations debe tener exactamente 3 elementos.
- advanced_recommendations debe incluir sugerencias de hábitos, timing o enfoque de bienestar, sin hacer afirmaciones médicas ni prescribir tratamientos.
`;
}

function sanitizeAnalysisResponse(
  parsed: any,
  advancedEnabled: boolean
): SafeAnalysisResponse {
  const safeScore =
    typeof parsed?.score === "number" && Number.isFinite(parsed.score)
      ? Math.min(95, Math.max(40, Math.round(parsed.score)))
      : 70;

  const safeSummary =
    typeof parsed?.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim()
      : "No fue posible generar un análisis detallado.";

  const safeFactors = Array.isArray(parsed?.factors)
    ? parsed.factors
        .filter((item: unknown) => typeof item === "string" && item.trim())
        .slice(0, 3)
    : [];

  while (safeFactors.length < 3) {
    if (safeFactors.length === 0) safeFactors.push("perfil general");
    else if (safeFactors.length === 1) safeFactors.push("información limitada");
    else safeFactors.push("revisión recomendada");
  }

  const baseResponse: SafeAnalysisResponse = {
    score: safeScore,
    summary: safeSummary,
    factors: safeFactors,
  };

  if (!advancedEnabled) {
    return baseResponse;
  }

  const safeAdvancedRecommendations = Array.isArray(
    parsed?.advanced_recommendations
  )
    ? parsed.advanced_recommendations
        .filter(
          (item: any) =>
            item &&
            typeof item.title === "string" &&
            item.title.trim() &&
            typeof item.description === "string" &&
            item.description.trim()
        )
        .slice(0, 3)
        .map((item: any) => ({
          title: item.title.trim(),
          description: item.description.trim(),
        }))
    : [];

  if (safeAdvancedRecommendations.length === 0) {
    safeAdvancedRecommendations.push(
      {
        title: "Mejora del descanso",
        description:
          "Prioriza una rutina de sueño constante y reduce estímulos intensos antes de dormir.",
      },
      {
        title: "Gestión del estrés",
        description:
          "Introduce pausas activas, respiración guiada o caminatas cortas para reducir la carga diaria.",
      },
      {
        title: "Soporte del objetivo principal",
        description:
          "Ajusta hábitos diarios de forma consistente según tu meta actual de energía, enfoque o bienestar general.",
      }
    );
  }

  baseResponse.advancedRecommendations = safeAdvancedRecommendations.slice(0, 3);

  return baseResponse;
}

async function getUserPlanFromRequest(req: Request): Promise<PlanType> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return "free";
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    return "free";
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return "free";
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, email, plan")
    .eq("id", user.id)
    .maybeSingle<UserProfileRow>();

  return normalizePlan(profile?.plan);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    const age = String(body.age || "").trim();
    const sex = String(body.sex || "").trim();
    const stress = String(body.stress || "").trim();
    const sleep = String(body.sleep || "").trim();
    const goal = String(body.goal || "").trim();

    const requestedAiMode =
      body.requestedAiMode === "advanced" ? "advanced" : "basic";

    if (!age || !sex || !stress || !sleep || !goal) {
      return Response.json(
        { error: "Faltan datos obligatorios para generar el análisis." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "Falta OPENAI_API_KEY en .env.local" },
        { status: 500 }
      );
    }

    const plan = await getUserPlanFromRequest(req);
    const limits = getPlanLimits(plan);

    const appliedAiMode =
      requestedAiMode === "advanced" && limits.advancedAI
        ? "advanced"
        : "basic";

    const advancedEnabled = appliedAiMode === "advanced";
    const wasDowngraded =
      requestedAiMode === "advanced" && appliedAiMode === "basic";

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = advancedEnabled
      ? buildAdvancedPrompt({ age, sex, stress, sleep, goal })
      : buildBasicPrompt({ age, sex, stress, sleep, goal });

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
    });

    const fallbackBasic =
      '{"score":70,"summary":"No fue posible generar un análisis detallado.","factors":["perfil general","información limitada","revisión recomendada"]}';

    const fallbackAdvanced =
      '{"score":70,"summary":"No fue posible generar un análisis detallado.","factors":["perfil general","información limitada","revisión recomendada"],"advanced_recommendations":[{"title":"Mejora del descanso","description":"Prioriza una rutina de sueño constante y reduce estímulos intensos antes de dormir."},{"title":"Gestión del estrés","description":"Introduce pausas activas, respiración guiada o caminatas cortas para reducir la carga diaria."},{"title":"Soporte del objetivo principal","description":"Ajusta hábitos diarios de forma consistente según tu meta actual de energía, enfoque o bienestar general."}]}';

    const text =
      response.output_text?.trim() ||
      (advancedEnabled ? fallbackAdvanced : fallbackBasic);

    let parsed: any;

    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json(
        {
          error: "La IA devolvió un formato inválido.",
          raw: text,
        },
        { status: 500 }
      );
    }

    const safeResponse = sanitizeAnalysisResponse(parsed, advancedEnabled);

    return Response.json({
      plan,
      requestedAiMode,
      appliedAiMode,
      advancedAI: advancedEnabled,
      wasDowngraded,
      upgradeRequired: wasDowngraded,
      upgradeMessage: wasDowngraded
        ? "Tu plan actual no incluye análisis avanzado. Actualiza a Pro o Premium para desbloquearlo."
        : null,
      score: safeResponse.score,
      summary: safeResponse.summary,
      factors: safeResponse.factors,
      advancedRecommendations: safeResponse.advancedRecommendations || [],
    });
  } catch (error: any) {
    console.error("ERROR EN /api/ai-explanation:", error);

    return Response.json(
      {
        error:
          error?.message || "Error interno al generar el análisis inteligente.",
      },
      { status: 500 }
    );
  }
}
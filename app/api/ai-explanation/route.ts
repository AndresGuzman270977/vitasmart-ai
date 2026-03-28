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
Eres un analista de salud preventiva y bienestar para una app moderna orientada a claridad, hábitos y mejora personal.

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
- No hables de tratamientos ni prescripciones.
- Escribe en español claro, profesional, moderno y amigable.
- El summary debe sonar útil y accionable, no genérico.
- factors debe tener exactamente 3 elementos.
- Los factors deben ser concretos y cortos, tipo: "estrés elevado", "sueño subóptimo", "base funcional".
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
Eres un analista avanzado de salud preventiva y bienestar para una app premium orientada a claridad, hábitos y mejora personal.

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
- No hagas afirmaciones médicas.
- No prescribas tratamientos.
- Escribe en español claro, profesional, moderno y amigable.
- El summary debe sonar más útil, específico y accionable que el análisis básico.
- factors debe tener exactamente 3 elementos.
- advanced_recommendations debe tener exactamente 3 elementos.
- Cada recommendation debe sentirse premium y personalizada.
- Las recomendaciones deben incluir hábitos, timing, consistencia, enfoque, recuperación, energía o bienestar según el perfil.
- No repitas el mismo concepto en las 3 recomendaciones.
- Cada title debe ser corto, fuerte y orientado a acción.
- Cada description debe ser breve, útil y entendible por una persona no técnica.
`;
}

function sanitizeAnalysisResponse(
  parsed: unknown,
  advancedEnabled: boolean,
  goal: string
): SafeAnalysisResponse {
  const obj =
    parsed && typeof parsed === "object" ? (parsed as Record<string, any>) : {};

  const safeScore =
    typeof obj.score === "number" && Number.isFinite(obj.score)
      ? Math.min(95, Math.max(40, Math.round(obj.score)))
      : 70;

  const safeSummary =
    typeof obj.summary === "string" && obj.summary.trim()
      ? obj.summary.trim()
      : "Tu resultado muestra una lectura inicial útil para entender tu punto de partida actual.";

  const safeFactors = Array.isArray(obj.factors)
    ? obj.factors
        .filter((item: unknown) => typeof item === "string" && item.trim())
        .map((item: string) => item.trim())
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
    obj.advanced_recommendations
  )
    ? obj.advanced_recommendations
        .filter(
          (item: unknown) =>
            item &&
            typeof item === "object" &&
            typeof (item as any).title === "string" &&
            (item as any).title.trim() &&
            typeof (item as any).description === "string" &&
            (item as any).description.trim()
        )
        .slice(0, 3)
        .map((item: any) => ({
          title: item.title.trim(),
          description: item.description.trim(),
        }))
    : [];

  if (safeAdvancedRecommendations.length === 0) {
    const fallbackByGoal: Record<string, AdvancedRecommendation[]> = {
      energy: [
        {
          title: "Recuperación energética",
          description:
            "Ordena mejor tu descanso, hidratación y ritmo diario para sostener energía con más estabilidad.",
        },
        {
          title: "Bloques de activación",
          description:
            "Concentra tus tareas más exigentes en tus horas más funcionales para aprovechar mejor tu perfil actual.",
        },
        {
          title: "Consistencia física y mental",
          description:
            "Pequeños ajustes diarios bien repetidos pueden elevar tu sensación general de rendimiento.",
        },
      ],
      focus: [
        {
          title: "Protección del enfoque",
          description:
            "Reduce interrupciones y agrupa tareas clave en bloques cortos para mejorar claridad mental.",
        },
        {
          title: "Energía cognitiva",
          description:
            "Cuida sueño, pausas y ritmo de trabajo para evitar fatiga mental acumulada.",
        },
        {
          title: "Rutina de profundidad",
          description:
            "Establece momentos del día con menor ruido para sostener concentración con más intención.",
        },
      ],
      sleep: [
        {
          title: "Higiene del sueño",
          description:
            "Mantén un horario más estable y reduce estímulos intensos antes de dormir para favorecer recuperación.",
        },
        {
          title: "Señales de descanso",
          description:
            "Observa cómo cambia tu energía durante el día para ajustar mejor tu rutina nocturna.",
        },
        {
          title: "Preparación nocturna",
          description:
            "Una secuencia simple y constante antes de dormir puede ayudarte a mejorar la calidad del descanso.",
        },
      ],
      health: [
        {
          title: "Base de bienestar",
          description:
            "Enfócate primero en hábitos sostenibles antes de buscar cambios intensos o difíciles de mantener.",
        },
        {
          title: "Prioridad diaria",
          description:
            "Elige una o dos acciones clave para reforzar tu salud general sin saturarte.",
        },
        {
          title: "Mejora acumulativa",
          description:
            "La continuidad suele generar más valor que los cambios bruscos cuando buscas bienestar integral.",
        },
      ],
    };

    const genericFallback: AdvancedRecommendation[] = [
      {
        title: "Más claridad diaria",
        description:
          "Ordenar mejor tus hábitos base puede ayudarte a mejorar energía, enfoque o recuperación con más consistencia.",
      },
      {
        title: "Prioridad correcta",
        description:
          "Atacar primero los factores que más pesan en tu perfil actual suele producir mejoras más visibles.",
      },
      {
        title: "Mejora sostenible",
        description:
          "Pequeños ajustes repetidos con intención suelen generar resultados más útiles que esfuerzos aislados.",
      },
    ];

    baseResponse.advancedRecommendations =
      fallbackByGoal[goal] || genericFallback;
    return baseResponse;
  }

  while (safeAdvancedRecommendations.length < 3) {
    safeAdvancedRecommendations.push({
      title: "Optimización gradual",
      description:
        "Refuerza hábitos simples y consistentes para mejorar tu lectura general con más continuidad.",
    });
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
    .maybeSingle();

  return normalizePlan((profile as UserProfileRow | null)?.plan);
}

function buildFallbackRawJson(advancedEnabled: boolean, goal: string) {
  if (!advancedEnabled) {
    return JSON.stringify({
      score: 70,
      summary:
        "Tu resultado muestra una lectura inicial útil para entender tu punto de partida actual.",
      factors: ["perfil general", "información limitada", "revisión recomendada"],
    });
  }

  const fallbackMap: Record<string, AdvancedRecommendation[]> = {
    energy: [
      {
        title: "Recuperación energética",
        description:
          "Ordena mejor tu descanso, hidratación y ritmo diario para sostener energía con más estabilidad.",
      },
      {
        title: "Bloques de activación",
        description:
          "Concentra tus tareas más exigentes en tus horas más funcionales para aprovechar mejor tu perfil actual.",
      },
      {
        title: "Consistencia física y mental",
        description:
          "Pequeños ajustes diarios bien repetidos pueden elevar tu sensación general de rendimiento.",
      },
    ],
    focus: [
      {
        title: "Protección del enfoque",
        description:
          "Reduce interrupciones y agrupa tareas clave en bloques cortos para mejorar claridad mental.",
      },
      {
        title: "Energía cognitiva",
        description:
          "Cuida sueño, pausas y ritmo de trabajo para evitar fatiga mental acumulada.",
      },
      {
        title: "Rutina de profundidad",
        description:
          "Establece momentos del día con menor ruido para sostener concentración con más intención.",
      },
    ],
    sleep: [
      {
        title: "Higiene del sueño",
        description:
          "Mantén un horario más estable y reduce estímulos intensos antes de dormir para favorecer recuperación.",
      },
      {
        title: "Señales de descanso",
        description:
          "Observa cómo cambia tu energía durante el día para ajustar mejor tu rutina nocturna.",
      },
      {
        title: "Preparación nocturna",
        description:
          "Una secuencia simple y constante antes de dormir puede ayudarte a mejorar la calidad del descanso.",
      },
    ],
    health: [
      {
        title: "Base de bienestar",
        description:
          "Enfócate primero en hábitos sostenibles antes de buscar cambios intensos o difíciles de mantener.",
      },
      {
        title: "Prioridad diaria",
        description:
          "Elige una o dos acciones clave para reforzar tu salud general sin saturarte.",
      },
      {
        title: "Mejora acumulativa",
        description:
          "La continuidad suele generar más valor que los cambios bruscos cuando buscas bienestar integral.",
      },
    ],
  };

  return JSON.stringify({
    score: 70,
    summary:
      "Tu resultado muestra una lectura útil de tu situación actual y sugiere que aún hay espacio para mejorar con más intención.",
    factors: ["perfil general", "información limitada", "revisión recomendada"],
    advanced_recommendations: fallbackMap[goal] || [
      {
        title: "Más claridad diaria",
        description:
          "Ordenar mejor tus hábitos base puede ayudarte a mejorar energía, enfoque o recuperación con más consistencia.",
      },
      {
        title: "Prioridad correcta",
        description:
          "Atacar primero los factores que más pesan en tu perfil actual suele producir mejoras más visibles.",
      },
      {
        title: "Mejora sostenible",
        description:
          "Pequeños ajustes repetidos con intención suelen generar resultados más útiles que esfuerzos aislados.",
      },
    ],
  });
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

    const fallbackRawJson = buildFallbackRawJson(advancedEnabled, goal);

    const text = response.output_text?.trim() || fallbackRawJson;

    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = JSON.parse(fallbackRawJson);
    }

    const safeResponse = sanitizeAnalysisResponse(
      parsed,
      advancedEnabled,
      goal
    );

    return Response.json({
      plan,
      requestedAiMode,
      appliedAiMode,
      advancedAI: advancedEnabled,
      wasDowngraded,
      upgradeRequired: wasDowngraded,
      upgradeMessage: wasDowngraded
        ? "Tu plan actual no incluye análisis avanzado. Actualiza a Pro o Premium para desbloquear recomendaciones más profundas y personalizadas."
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
// app/api/health-analysis/route.ts

import { NextRequest, NextResponse } from "next/server";
import { runHealthEngine } from "../../lib/healthEngine";
import { runRecommendationEngine } from "../../lib/recommendationEngine";
import { validateHealthAnalysisRequest } from "../../lib/healthAnalysis/validateRequest";
import { resolveUserPlanAndAiMode } from "../../lib/healthAnalysis/resolveUserPlan";
import {
  buildFallbackAdvancedRecommendations,
  buildFallbackResultNarratives,
} from "../../lib/healthAnalysis/fallbackNarratives";
import { formatHealthAnalysisResponse } from "../../lib/healthAnalysis/formatHealthAnalysisResponse";
import { saveHealthAnalysisSnapshot } from "../../lib/healthAnalysis/saveHealthAnalysisSnapshot";
import type {
  HealthAnalysisRequest,
  HealthAnalysisSummaryBlock,
} from "../../lib/healthAnalysis/types";
import { getCurrentUser } from "../../lib/auth";
import {
  buildAiNarrativeContext,
  type AiNarrativeContext,
} from "../../lib/healthAnalysis/buildAiNarrativeContext";
import {
  generateHealthNarrativesWithAI,
  type GeneratedHealthNarratives,
} from "../../lib/healthAnalysis/generateHealthNarrativesWithAI";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HealthAnalysisRequest;

    const validation = validateHealthAnalysisRequest(body);

    if (!validation.ok) {
      return NextResponse.json(
        {
          error: validation.error,
          fieldErrors: validation.fieldErrors ?? [],
        },
        { status: 400 }
      );
    }

    const { plan, requestedAiMode, assessment, biomarkers } = validation.data;

    const planMeta = resolveUserPlanAndAiMode(plan, requestedAiMode);

    const engineResult = runHealthEngine({
      ...assessment,
      biomarkers,
    });

    const recommendationEngine = runRecommendationEngine({
      profile: {
        ...engineResult.normalizedProfile,
        mainGoal: assessment.mainGoal,
        baseConditions: assessment.baseConditions,
        currentMedications: assessment.currentMedications,
        currentSupplements: assessment.currentSupplements,
        biomarkers,
      },
      needScores: engineResult.needScores,
      dominantNeeds: engineResult.dominantNeeds,
      secondaryNeeds: engineResult.secondaryNeeds,
    });

    const fallbackSummaries = buildFallbackResultNarratives({
      scores: {
        healthScore: engineResult.healthScore,
        sleepScore: engineResult.subscores.sleepScore,
        stressScore: engineResult.subscores.stressScore,
        energyScore: engineResult.subscores.energyScore,
        focusScore: engineResult.subscores.focusScore,
        metabolicScore: engineResult.subscores.metabolicScore,
      },
      confidence: engineResult.confidence,
      strengths: engineResult.strengths,
      mainDrivers: engineResult.mainDrivers,
      priorityActions: engineResult.priorityActions,
      riskSignals: engineResult.riskSignals,
      mainGoal: assessment.mainGoal,
      dominantNeeds: engineResult.dominantNeeds,
      secondaryNeeds: engineResult.secondaryNeeds,
    });

    const fallbackAdvancedRecommendations =
      planMeta.advancedAI || planMeta.plan === "premium"
        ? buildFallbackAdvancedRecommendations({
            dominantNeeds: engineResult.dominantNeeds,
            secondaryNeeds: engineResult.secondaryNeeds,
            riskSignals: engineResult.riskSignals,
            mainGoal: assessment.mainGoal,
          })
        : [];

    let finalSummaries: HealthAnalysisSummaryBlock = fallbackSummaries;
    let finalAdvancedRecommendations = fallbackAdvancedRecommendations;
    let aiNarrativesApplied = false;
    let aiNarrativesError: string | null = null;

    const allowAiNarratives =
      planMeta.plan === "pro" || planMeta.plan === "premium";

    if (allowAiNarratives) {
      try {
        const topIngredientNames =
          recommendationEngine.recommendationOutput.topIngredients
            ?.map((item) => item.ingredientName?.trim())
            .filter(Boolean)
            .slice(0, 6) || [];

        const narrativeContext: AiNarrativeContext = buildAiNarrativeContext({
          planMeta: {
            plan: planMeta.plan,
            requestedAiMode: planMeta.requestedAiMode,
            appliedAiMode: planMeta.appliedAiMode,
          },
          assessment,
          biomarkers,
          scores: {
            healthScore: engineResult.healthScore,
            sleepScore: engineResult.subscores.sleepScore,
            stressScore: engineResult.subscores.stressScore,
            energyScore: engineResult.subscores.energyScore,
            focusScore: engineResult.subscores.focusScore,
            metabolicScore: engineResult.subscores.metabolicScore,
          },
          confidence: engineResult.confidence,
          insights: {
            strengths: engineResult.strengths,
            mainDrivers: engineResult.mainDrivers,
            priorityActions: engineResult.priorityActions,
            riskSignals: engineResult.riskSignals,
          },
          userNeeds: {
            dominantNeeds: engineResult.dominantNeeds,
            secondaryNeeds: engineResult.secondaryNeeds,
          },
          fallbackSummaries,
          fallbackAdvancedRecommendations,
          topIngredientNames,
        });

        const aiNarratives: GeneratedHealthNarratives =
          await generateHealthNarrativesWithAI(narrativeContext);

        finalSummaries = aiNarratives.summaries;
        finalAdvancedRecommendations = aiNarratives.advancedRecommendations;
        aiNarrativesApplied = true;
      } catch (aiError: any) {
        aiNarrativesApplied = false;
        aiNarrativesError =
          aiError?.message || "No se pudo generar narrativa con IA.";
        console.error("AI narrative generation error:", aiError);
      }
    }

    const response = formatHealthAnalysisResponse({
      planMeta,
      scores: {
        healthScore: engineResult.healthScore,
        sleepScore: engineResult.subscores.sleepScore,
        stressScore: engineResult.subscores.stressScore,
        energyScore: engineResult.subscores.energyScore,
        focusScore: engineResult.subscores.focusScore,
        metabolicScore: engineResult.subscores.metabolicScore,
      },
      confidence: engineResult.confidence,
      summaries: finalSummaries,
      insights: {
        strengths: engineResult.strengths,
        mainDrivers: engineResult.mainDrivers,
        priorityActions: engineResult.priorityActions,
        riskSignals: engineResult.riskSignals,
      },
      userNeeds: {
        dominantNeeds: engineResult.dominantNeeds,
        secondaryNeeds: engineResult.secondaryNeeds,
      },
      advancedRecommendations: finalAdvancedRecommendations,
      rawProductRecommendations:
        recommendationEngine.recommendationOutput.topIngredients,
    });

    const currentUser = await getCurrentUser();

    const snapshotResult = await saveHealthAnalysisSnapshot({
      userId: currentUser?.id || null,
      request: body,
      response: {
        ...response,
        meta: {
          aiNarrativesApplied,
          aiNarrativesError,
        },
      } as any,
    });

    return NextResponse.json(
      {
        ...response,
        persistence: {
          saved: false,
          reason: null,
          snapshotSaved: snapshotResult.saved,
          assessmentId: snapshotResult.assessmentId ?? null,
          details: snapshotResult.details ?? null,
        },
        meta: {
          aiNarrativesApplied,
          aiNarrativesError,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("health-analysis POST error", error);

    return NextResponse.json(
      {
        error: "Internal server error while building health analysis.",
      },
      { status: 500 }
    );
  }
}
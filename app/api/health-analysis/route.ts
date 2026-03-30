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
import { saveAssessment } from "../../lib/saveAssessment";
import type { HealthAnalysisRequest } from "../../lib/healthAnalysis/types";
import { getCurrentUser } from "../../lib/auth";

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

    const summaries = buildFallbackResultNarratives({
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

    const advancedRecommendations =
      planMeta.advancedAI || planMeta.plan === "premium"
        ? buildFallbackAdvancedRecommendations({
            dominantNeeds: engineResult.dominantNeeds,
            secondaryNeeds: engineResult.secondaryNeeds,
            riskSignals: engineResult.riskSignals,
            mainGoal: assessment.mainGoal,
          })
        : [];

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
      summaries,
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
      advancedRecommendations,
      rawProductRecommendations:
        recommendationEngine.recommendationOutput.topIngredients,
    });

    const currentUser = await getCurrentUser();

    let saveResult:
      | Awaited<ReturnType<typeof saveAssessment>>
      | null = null;

    if (currentUser?.id) {
      saveResult = await saveAssessment(
        {
          assessmentVersion: response.assessmentVersion,

          plan: response.plan,
          aiMode: response.appliedAiMode,
          generatedBy: "health-analysis-api",

          age: assessment.age,
          sex: assessment.sex,

          weightKg: assessment.weightKg ?? null,
          heightCm: assessment.heightCm ?? null,
          waistCm: assessment.waistCm ?? null,
          bmi:
            typeof assessment.weightKg === "number" &&
            typeof assessment.heightCm === "number" &&
            assessment.heightCm > 0
              ? Number(
                  (
                    assessment.weightKg /
                    Math.pow(assessment.heightCm / 100, 2)
                  ).toFixed(1)
                )
              : null,

          stressLevel: assessment.stressLevel ?? null,
          sleepHours: assessment.sleepHours ?? null,
          sleepQuality: assessment.sleepQuality ?? null,
          fatigueLevel: assessment.fatigueLevel ?? null,
          focusDifficulty: assessment.focusDifficulty ?? null,

          physicalActivity: assessment.physicalActivity ?? null,
          alcoholUse: assessment.alcoholUse ?? null,
          smokingStatus: assessment.smokingStatus ?? null,
          sunExposure: assessment.sunExposure ?? null,
          hydrationLevel: assessment.hydrationLevel ?? null,
          ultraProcessedFoodLevel:
            assessment.ultraProcessedFoodLevel ?? null,

          bloodPressureKnown: Boolean(assessment.bloodPressureKnown),
          systolicBp: assessment.systolicBp ?? null,
          diastolicBp: assessment.diastolicBp ?? null,

          mainGoal: assessment.mainGoal,

          baseConditions: assessment.baseConditions ?? [],
          currentMedications: assessment.currentMedications ?? [],
          currentSupplements: assessment.currentSupplements ?? [],

          healthScore: response.scores.healthScore,
          sleepScore: response.scores.sleepScore,
          stressScore: response.scores.stressScore,
          energyScore: response.scores.energyScore,
          focusScore: response.scores.focusScore,
          metabolicScore: response.scores.metabolicScore,

          confidenceLevel: response.confidence.confidenceLevel,
          confidenceExplanation: response.confidence.confidenceExplanation,

          executiveSummary: response.summaries.executiveSummary,
          clinicalStyleSummary: response.summaries.clinicalStyleSummary,
          scoreNarrative: response.summaries.scoreNarrative,
          professionalFollowUpAdvice:
            response.summaries.professionalFollowUpAdvice,

          strengths: response.insights.strengths,
          mainDrivers: response.insights.mainDrivers,
          priorityActions: response.insights.priorityActions,
          riskSignals: response.insights.riskSignals,
          factors: [
            ...response.insights.mainDrivers,
            ...response.userNeeds.dominantNeeds,
          ].slice(0, 12),

          biomarkers,
        },
        {
          aiMode: response.appliedAiMode,
          generatedBy: "health-analysis-api",
        }
      );
    }

    const snapshotResult = await saveHealthAnalysisSnapshot({
      userId: currentUser?.id || null,
      request: body,
      response,
    });

    return NextResponse.json(
      {
        ...response,
        persistence: {
          saved: saveResult?.saved ?? false,
          reason:
            saveResult && "reason" in saveResult ? saveResult.reason : null,
          snapshotSaved: snapshotResult.saved,
          assessmentId: snapshotResult.assessmentId ?? null,
          details: snapshotResult.details ?? null,
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
// app/lib/healthAnalysis/buildAiResultInput.ts

import { HealthAnalysisScoreBlock, HealthAnalysisConfidenceBlock } from "./types";

type BuildAiResultInputParams = {
  mainGoal?: string;
  scores: HealthAnalysisScoreBlock;
  confidence: HealthAnalysisConfidenceBlock;
  strengths: string[];
  mainDrivers: string[];
  priorityActions: string[];
  riskSignals: string[];
  dominantNeeds: string[];
  secondaryNeeds: string[];
};

export function buildAiResultInput(params: BuildAiResultInputParams) {
  return {
    userGoal: params.mainGoal ?? "general_health",
    scoreContext: params.scores,
    confidence: params.confidence,
    strengths: params.strengths,
    mainDrivers: params.mainDrivers,
    priorityActions: params.priorityActions,
    riskSignals: params.riskSignals,
    dominantNeeds: params.dominantNeeds,
    secondaryNeeds: params.secondaryNeeds,
  };
}
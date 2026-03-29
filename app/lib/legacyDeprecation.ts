// app/lib/legacyDeprecation.ts

export function buildLegacyDeprecationMessage(moduleName: string): string {
  return `[VitaSmart AI] The legacy module "${moduleName}" is deprecated and should not be used in the new preventive health architecture. Use catalog + healthEngine + recommendationEngine + healthAnalysis instead.`;
}

export function logLegacyDeprecation(moduleName: string) {
  if (typeof console !== "undefined") {
    console.warn(buildLegacyDeprecationMessage(moduleName));
  }
}
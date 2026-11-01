export interface GeneratedStep {
  label: string;
  stepOrder: number;
  complicationCode: string | null;
  complicationLabel: string | null;
}

/**
 * RG-ETP-04 : rang croissant ; à égalité, étapes de base d'abord, puis ordre du code de complication.
 * Renvoie un nouveau tableau.
 */
export function orderSteps(steps: GeneratedStep[]): GeneratedStep[] {
  return [...steps].sort((a, b) => {
    if (a.stepOrder !== b.stepOrder) return a.stepOrder - b.stepOrder;
    if (a.complicationCode === b.complicationCode) return 0;
    if (a.complicationCode === null) return -1;
    if (b.complicationCode === null) return 1;
    return a.complicationCode < b.complicationCode ? -1 : 1;
  });
}

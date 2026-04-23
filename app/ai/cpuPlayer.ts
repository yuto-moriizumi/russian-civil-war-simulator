// Re-export from domain layer for backward compatibility.
// New code should import directly from domain/game/aiInitialization,
// domain/game/divisionNaming, or domain/game/tickHelpers/aiTick.

export { createInitialAIState, createInitialAIArmyGroup } from '../domain/game/aiInitialization';
export { generateAIDivisionName } from '../domain/game/divisionNaming';
export { runAITick } from '../domain/game/tickHelpers/aiTick';
export type { AIProductionRequest, AIActions } from '../domain/game/tickHelpers/aiTick';

/**
 * Tick Helper Modules
 * 
 * This directory contains the modular components of the game tick system.
 * Each module handles a specific responsibility within the game loop.
 */

export { detectDivisionDuplicates, logDivisionDuplicates } from './duplicateDetection';
export type { DuplicationCheckResult } from './duplicateDetection';
export { validateDivisions } from './divisionValidation';
export { processMovements } from './movementProcessing';
export { processCombats } from './combatProcessing';
export { applyCompletedMovements, applyFinishedCombats } from './movementApplication';
export { regenerateDivisionHP } from './hpRegeneration';
export { syncArmyGroupTerritories } from './armyGroupSync';
export { checkAndCompleteMissions, checkAndClaimAIMissions } from './missionCompletion';
export { processProductionQueue } from './productionProcessing';
export { processScheduledEvents } from './scheduledEventProcessing';

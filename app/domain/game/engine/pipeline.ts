import {
  validateDivisionsStep,
  processProductionQueueStep,
  processScheduledEventsStep,
  processMovementsStep,
  processMidTransitCombatsStep,
  processCombatsStep,
  applyMovementsAndCombatsStep,
  regenerateHPStep,
  processAIStep,
  syncArmyGroupsStep,
  applyArmyGroupActionsStep,
  applyMissionsStep,
  reconcilePlayerArmyGroupsStep,
} from './steps';
import { SimulationContext, SimulationDeps, SimulationLogger, SimulationStep, EngineSimulationState } from './types';

/** Ordered pipeline: each step receives and returns a SimulationContext. */
const simulationPipeline: SimulationStep[] = [
  validateDivisionsStep,
  processProductionQueueStep,
  processScheduledEventsStep,
  processMovementsStep,
  processMidTransitCombatsStep,
  processCombatsStep,
  applyMovementsAndCombatsStep,
  regenerateHPStep,
  processAIStep,
  syncArmyGroupsStep,
  applyArmyGroupActionsStep,
  applyMissionsStep,
  reconcilePlayerArmyGroupsStep,
];

/**
 * Runs the simulation pipeline from an initial context.
 * Returns the final EngineSimulationState.
 */
export function runPipeline(
  initialContext: SimulationContext,
  deps: SimulationDeps,
  logger: SimulationLogger,
): EngineSimulationState {
  let context = initialContext;
  for (const step of simulationPipeline) {
    context = step(context, deps, logger);
  }
  return context.state;
}

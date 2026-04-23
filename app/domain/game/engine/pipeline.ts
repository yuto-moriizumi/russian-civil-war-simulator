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
 *
 * If `wrapStep` is provided, each step is wrapped with it for instrumentation.
 * The wrapper receives the step function and its display name, and must return
 * a function with the same signature.
 */
export function runPipeline(
  initialContext: SimulationContext,
  deps: SimulationDeps,
  logger: SimulationLogger,
  options?: {
    wrapStep?: (step: SimulationStep, name: string) => SimulationStep;
  },
): EngineSimulationState {
  let context = initialContext;
  for (const step of simulationPipeline) {
    const wrapped = options?.wrapStep ? options.wrapStep(step, step.name) : step;
    context = wrapped(context, deps, logger);
  }
  return context.state;
}

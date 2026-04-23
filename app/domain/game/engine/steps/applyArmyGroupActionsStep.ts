import { applyArmyGroupActions } from '../postTick';
import type { SimulationContext, SimulationDeps, SimulationLogger } from '../types';

export function applyArmyGroupActionsStep(
  context: SimulationContext,
  _deps: SimulationDeps,
  logger: SimulationLogger,
): SimulationContext {
  const { state } = context;
  const nextState = applyArmyGroupActions(state, logger);
  return { ...context, state: nextState };
}

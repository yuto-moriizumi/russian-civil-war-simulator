import type { SimulationContext, SimulationDeps, SimulationLogger, EngineSimulationState } from '../types';
import { reconcilePlayerArmyGroupsToTheaters } from '../postTick';

export function reconcilePlayerArmyGroupsStep(
  context: SimulationContext,
  _deps: SimulationDeps,
  _logger: SimulationLogger,
): SimulationContext {
  const { state, nextTheaters } = context;
  if (!nextTheaters) return context;

  const reconciled = reconcilePlayerArmyGroupsToTheaters(
    { ...state, theaters: nextTheaters },
    state.theaters,
  );

  const nextState: EngineSimulationState = {
    ...state,
    armyGroups: reconciled.armyGroups,
    theaters: nextTheaters,
  };

  return { ...context, state: nextState };
}

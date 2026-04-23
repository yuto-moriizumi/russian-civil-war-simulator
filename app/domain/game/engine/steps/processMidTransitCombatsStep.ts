import type { ActiveCombat } from '../../../../types/game';
import type { SimulationContext, SimulationDeps, SimulationLogger } from '../types';

export function processMidTransitCombatsStep(
  context: SimulationContext,
  _deps: SimulationDeps,
  _logger: SimulationLogger,
): SimulationContext {
  const { state, newMidTransitCombats = [] } = context;
  const { activeCombats } = state;

  const mergedCombats: ActiveCombat[] =
    newMidTransitCombats.length > 0
      ? [...activeCombats, ...(newMidTransitCombats as ActiveCombat[])]
      : activeCombats;

  return {
    ...context,
    state: { ...state, activeCombats: mergedCombats },
  };
}

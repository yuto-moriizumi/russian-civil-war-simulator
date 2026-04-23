import { processCombats } from '../../logic';
import type { SimulationContext, SimulationDeps, SimulationLogger } from '../types';

export function processCombatsStep(
  context: SimulationContext,
  _deps: SimulationDeps,
  logger: SimulationLogger,
): SimulationContext {
  const { state, newDate } = context;
  const {
    activeCombats,
    regions,
    adjacency,
    regionCentroids,
    divisions,
  } = state;

  const {
    updatedCombats,
    finishedCombats,
    newCombatEvents,
    newCombatNotifications,
    retreatMovements,
    updatedDivisions: divisionsAfterCombats,
  } = processCombats(
    activeCombats,
    newDate,
    regions,
    adjacency,
    regionCentroids,
    divisions,
    logger,
  );

  return {
    ...context,
    state: { ...state, divisions: divisionsAfterCombats },
    updatedCombats,
    finishedCombats,
    newCombatEvents,
    newCombatNotifications,
    retreatMovements,
  };
}

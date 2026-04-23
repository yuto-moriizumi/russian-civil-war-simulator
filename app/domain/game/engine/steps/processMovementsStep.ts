import { processMovements } from '../../tickHelpers';
import type { SimulationContext, SimulationDeps, SimulationLogger } from '../types';

export function processMovementsStep(
  context: SimulationContext,
  _deps: SimulationDeps,
  logger: SimulationLogger,
): SimulationContext {
  const { state, newDate } = context;
  const {
    movingUnits,
    activeCombats,
    regions,
    relationships,
    divisions,
  } = state;

  const {
    remainingMovements,
    completedMovements,
    newMidTransitCombats,
    updatedDivisions: divisionsAfterMovements,
  } = processMovements(
    movingUnits,
    newDate,
    activeCombats,
    regions,
    relationships,
    divisions,
    logger,
  );

  return {
    ...context,
    state: { ...state, divisions: divisionsAfterMovements },
    remainingMovements,
    completedMovements,
    newMidTransitCombats,
  };
}

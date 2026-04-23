import { SimulationContext, SimulationDeps, SimulationLogger } from '../types';
import { validateDivisions, detectDivisionDuplicates, logDivisionDuplicates } from '../../tickHelpers';

export function validateDivisionsStep(
  context: SimulationContext,
  _deps: SimulationDeps,
  _logger: SimulationLogger,
): SimulationContext {
  const { state, tickNum } = context;
  const { regions, movingUnits, armyGroups, divisions } = state;

  const preCheck = detectDivisionDuplicates(regions, movingUnits, state.activeCombats);
  if (preCheck.hasDuplicates) {
    logDivisionDuplicates(preCheck.reports, tickNum, console);
    console.error('  [DUPLICATE] detected at TICK START — leftovers from previous tick');
  }

  const { updatedRegions, updatedMovingUnits, updatedDivisions } =
    validateDivisions(regions, movingUnits, armyGroups, divisions);

  return {
    ...context,
    state: {
      ...state,
      regions: updatedRegions,
      movingUnits: updatedMovingUnits,
      divisions: updatedDivisions,
    },
  };
}

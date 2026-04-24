import { SimulationContext, SimulationDeps, SimulationLogger } from '../types';
import { validateDivisions } from '../../logic';

export function validateDivisionsStep(
  context: SimulationContext,
  _deps: SimulationDeps,
  _logger: SimulationLogger,
): SimulationContext {
  const { state } = context;
  const { regions, movingUnits, armyGroups, divisions } = state;

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

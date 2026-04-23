import { regenerateDivisionHP } from '../../logic';
import type { SimulationContext, SimulationDeps, SimulationLogger } from '../types';

export function regenerateHPStep(
  context: SimulationContext,
  _deps: SimulationDeps,
  _logger: SimulationLogger,
): SimulationContext {
  const { state } = context;
  const nextDivisions = regenerateDivisionHP(state.divisions);
  return {
    ...context,
    state: { ...state, divisions: nextDivisions },
  };
}

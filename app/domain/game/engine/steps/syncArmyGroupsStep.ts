import { syncArmyGroupTerritories } from '../../tickHelpers';
import type { SimulationContext, SimulationDeps, SimulationLogger } from '../types';

export function syncArmyGroupsStep(
  context: SimulationContext,
  _deps: SimulationDeps,
  _logger: SimulationLogger,
): SimulationContext {
  const { state } = context;
  const { armyGroups, regions, movingUnits, divisions } = state;

  const nextArmyGroups = syncArmyGroupTerritories(
    armyGroups,
    regions,
    movingUnits,
    divisions,
  );

  return {
    ...context,
    state: { ...state, armyGroups: nextArmyGroups },
  };
}

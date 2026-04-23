import { attackArmyGroup as attackArmyGroupPure } from '../../domain/game/armyGroupAttack';
import { ActionsState } from './types';
import {
  buildSimulationPatchFromEngineState,
  toEngineState,
} from './services/engineStateAdapter';

/**
 * Store adapter for attackArmyGroup.
 * Converts SimulationStore -> EngineSimulationState, calls the pure domain function,
 * then applies the resulting patch via setState.
 */
export function attackArmyGroup(
  groupId: string,
  state: ActionsState,
  setState: (partial: Partial<ActionsState>) => void
): void {
  const engineState = toEngineState(state);
  const patch = attackArmyGroupPure(groupId, engineState);
  if (patch) {
    setState(buildSimulationPatchFromEngineState({ ...engineState, ...patch }));
  }
}

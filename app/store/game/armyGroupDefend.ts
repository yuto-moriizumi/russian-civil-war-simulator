import { defendArmyGroup as defendArmyGroupPure } from '../../domain/game/armyGroupDefend';
import { GameStore } from './types';
import {
  buildSimulationPatchFromEngineState,
  toEngineState,
} from './services/engineStateAdapter';

/**
 * Store adapter for defendArmyGroup.
 * Converts GameStore -> EngineSimulationState, calls the pure domain function,
 * then applies the resulting patch via setState.
 */
export function defendArmyGroup(
  groupId: string,
  state: GameStore,
  setState: (partial: Partial<GameStore>) => void
): void {
  const engineState = toEngineState(state);
  const patch = defendArmyGroupPure(groupId, engineState);
  if (patch) {
    setState(buildSimulationPatchFromEngineState({ ...engineState, ...patch }));
  }
}

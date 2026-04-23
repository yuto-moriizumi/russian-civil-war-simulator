import { applyGameCommand } from '../../../domain/game/commands';
import type { ActionsState } from '../types';
import {
  buildSimulationPatchFromEngineState,
  toEngineState,
} from './engineStateAdapter';

export function buildMoveUnitsPatch(
  state: Partial<ActionsState>,
  fromRegion: string,
  toRegion: string,
  count: number,
  divisionIds?: string[],
): Partial<ActionsState> | null {
  const result = applyGameCommand(toEngineState(state), {
    type: 'MOVE_UNITS',
    fromRegion,
    toRegion,
    count,
    divisionIds,
  });

  if (!result.applied) {
    return null;
  }

  return buildSimulationPatchFromEngineState(result.state);
}

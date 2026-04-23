import { applyGameCommand } from '../../../domain/game/commands';
import type { ActionsState } from '../types';
import {
  buildSimulationPatchFromEngineState,
  toEngineState,
} from './engineStateAdapter';

export function buildClaimMissionPatch(state: ActionsState, missionId: string): Partial<ActionsState> | null {
  const result = applyGameCommand(toEngineState(state), {
    type: 'CLAIM_MISSION',
    missionId,
  });

  if (!result.applied) {
    return null;
  }

  return buildSimulationPatchFromEngineState(result.state);
}

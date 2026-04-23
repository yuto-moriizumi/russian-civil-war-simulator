import { applyClaimMissionCommand } from './claimMission';
import { GameCommand, GameCommandResult } from './types';
import { EngineSimulationState } from '../engine/types';

export function applyGameCommand(
  state: EngineSimulationState,
  command: GameCommand,
): GameCommandResult {
  if (command.type === 'CLAIM_MISSION') {
    return applyClaimMissionCommand(state, command.missionId);
  }

  return { state, applied: false };
}

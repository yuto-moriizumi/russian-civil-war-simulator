import { applyClaimMissionCommand } from './claimMission';
import { applyMoveUnitsCommand } from './moveUnits';
import { GameCommand, GameCommandResult } from './types';
import { EngineSimulationState } from '../engine/types';

export function applyGameCommand(
  state: EngineSimulationState,
  command: GameCommand,
): GameCommandResult {
  if (command.type === 'CLAIM_MISSION') {
    return applyClaimMissionCommand(state, command.missionId);
  }

  if (command.type === 'MOVE_UNITS') {
    return applyMoveUnitsCommand(
      state,
      command.fromRegion,
      command.toRegion,
      command.count,
      command.divisionIds,
    );
  }

  return { state, applied: false };
}

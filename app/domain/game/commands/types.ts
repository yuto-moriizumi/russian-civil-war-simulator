import { EngineSimulationState } from '../engine/types';

export type GameCommand = {
  type: 'CLAIM_MISSION';
  missionId: string;
};

export interface GameCommandResult {
  state: EngineSimulationState;
  applied: boolean;
}

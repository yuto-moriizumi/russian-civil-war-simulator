import { EngineSimulationState } from '../engine/types';

export type GameCommand = {
  type: 'CLAIM_MISSION';
  missionId: string;
} | {
  type: 'MOVE_UNITS';
  fromRegion: string;
  toRegion: string;
  count: number;
  divisionIds?: string[];
};

export interface GameCommandResult {
  state: EngineSimulationState;
  applied: boolean;
}

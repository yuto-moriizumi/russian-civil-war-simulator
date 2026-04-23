import { GAME_CONFIG } from '../../constants/gameConfig';
import { GameStore } from './types';
import { StoreApi } from 'zustand';
import { countries } from '../../data/gameData';
import { TickPerf } from './tickPerformance';
import { advanceSimulation } from '../../domain/game/engine/advanceSimulation';
import {
  buildSimulationPatchFromEngineState,
  toEngineState,
} from './services/engineStateAdapter';

export { getEffectiveAIStates } from './tickHelpers/aiTick';

export const createTickActions = (
  set: StoreApi<GameStore>['setState'],
  get: StoreApi<GameStore>['getState']
) => ({
  tick: () => {
    const state = get();
    if (!state.isPlaying) return;

    TickPerf.tickStart();
    TickPerf.start('[tick] total');

    const engineState = toEngineState(state);
    const { state: next } = advanceSimulation(engineState, { countries, gameConfig: GAME_CONFIG });

    set(buildSimulationPatchFromEngineState(next));

    TickPerf.start('[tick] 13-theaters');
    get().detectAndUpdateTheaters();
    TickPerf.end('[tick] 13-theaters');
    TickPerf.end('[tick] total');
    TickPerf.logIfNeeded();
  },
});

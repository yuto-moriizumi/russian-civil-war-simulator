import { GAME_CONFIG } from '../../constants/gameConfig';
import { ActionsState } from './types';
import { StoreApi } from 'zustand';
import { countries } from '../../data/gameData';
import { TickPerf } from './tickPerformance';
import { advanceSimulation } from '../../domain/game/engine/advanceSimulation';
import { SimulationLogger } from '../../domain/game/engine/types';
import {
  buildSimulationPatchFromEngineState,
  toEngineState,
} from './services/engineStateAdapter';
import { SimulationStep } from '../../domain/game/engine/types';

export { getEffectiveAIStates } from '../../domain/game/logic/aiTick';

export const createTickActions = (
  set: StoreApi<ActionsState>['setState'],
  get: StoreApi<ActionsState>['getState']
) => ({
  tick: () => {
    const state = get();
    if (!state.isPlaying) return;

    TickPerf.tickStart();
    TickPerf.start('[tick] total');

    const engineState = toEngineState(state);
    const simLogger: SimulationLogger = {
      debug: (...a) => console.debug(...a),
      warn: (...a) => console.warn(...a),
      error: (...a) => console.error(...a),
    };

    const wrapStep = (step: SimulationStep, name: string): SimulationStep => {
      return (ctx, deps, logger) => {
        TickPerf.start(`[tick] ${name}`);
        const result = step(ctx, deps, logger);
        TickPerf.end(`[tick] ${name}`);
        return result;
      };
    };

    const { state: next } = advanceSimulation(engineState, { countries, gameConfig: GAME_CONFIG }, simLogger, { wrapStep });

    set(buildSimulationPatchFromEngineState(next));

    TickPerf.end('[tick] total');
    TickPerf.logIfNeeded();
  },
});

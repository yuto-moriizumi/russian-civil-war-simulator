import { GAME_CONFIG } from '../../constants/gameConfig';
import { GameStore } from './types';
import { StoreApi } from 'zustand';
import { countries } from '../../data/gameData';
import { TickPerf } from './tickPerformance';
import { buildRegionUpdate, extractRegionOwners } from '../../utils/regionState';
import { advanceSimulation } from '../../domain/game/engine/advanceSimulation';
import { EngineSimulationState } from '../../domain/game/engine/types';

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

    const engineState: EngineSimulationState = {
      dateTime: state.dateTime,
      selectedCountry: state.selectedCountry,
      isPlayerAIEnabled: state.isPlayerAIEnabled,
      regions: state.regions,
      regionDefinitions: state.regionDefinitions,
      adjacency: state.adjacency,
      regionCentroids: state.regionCentroids,
      divisions: state.divisions,
      movingUnits: state.movingUnits,
      activeCombats: state.activeCombats,
      armyGroups: state.armyGroups,
      theaters: state.theaters,
      productionQueues: state.productionQueues,
      relationships: state.relationships,
      scheduledEvents: state.scheduledEvents,
      countryBonuses: state.countryBonuses,
      aiStates: state.aiStates,
      missions: state.missions,
      gameEvents: state.gameEvents,
      notifications: state.notifications,
    };

    const { state: next } = advanceSimulation(engineState, { countries, gameConfig: GAME_CONFIG });

    set({
      dateTime: next.dateTime,
      movingUnits: next.movingUnits,
      activeCombats: next.activeCombats,
      ...buildRegionUpdate(next.regionDefinitions, extractRegionOwners(next.regions)),
      divisions: next.divisions,
      gameEvents: next.gameEvents,
      notifications: next.notifications,
      aiStates: next.aiStates,
      armyGroups: next.armyGroups,
      theaters: next.theaters,
      productionQueues: next.productionQueues,
      scheduledEvents: next.scheduledEvents,
      relationships: next.relationships,
      missions: next.missions,
      countryBonuses: next.countryBonuses,
    });

    TickPerf.start('[tick] 13-theaters');
    get().detectAndUpdateTheaters();
    TickPerf.end('[tick] 13-theaters');
    TickPerf.end('[tick] total');
    TickPerf.logIfNeeded();
  },
});

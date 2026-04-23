import type { EngineSimulationState } from '../../../domain/game/engine/types';
import { initialGameState } from '../initialState';
import type { GameStore } from '../types';
import {
  buildRegionUpdate,
  extractRegionDefinitions,
  extractRegionOwners,
} from '../../../utils/regionState';

function deriveRegionDefinitions(state: Partial<GameStore>) {
  if (state.regionDefinitions && Object.keys(state.regionDefinitions).length > 0) {
    return state.regionDefinitions;
  }

  return extractRegionDefinitions(state.regions ?? {});
}

export function toEngineState(state: Partial<GameStore>): EngineSimulationState {
  return {
    dateTime: state.dateTime ?? new Date(),
    selectedCountry: state.selectedCountry ?? null,
    isPlayerAIEnabled: state.isPlayerAIEnabled ?? false,
    regions: state.regions ?? {},
    regionDefinitions: deriveRegionDefinitions(state),
    adjacency: state.adjacency ?? {},
    regionCentroids: state.regionCentroids ?? {},
    divisions: state.divisions ?? {},
    movingUnits: state.movingUnits ?? [],
    activeCombats: state.activeCombats ?? [],
    armyGroups: state.armyGroups ?? [],
    theaters: state.theaters ?? [],
    productionQueues: state.productionQueues ?? initialGameState.productionQueues,
    relationships: state.relationships ?? [],
    scheduledEvents: state.scheduledEvents ?? [],
    countryBonuses: state.countryBonuses ?? initialGameState.countryBonuses,
    aiStates: state.aiStates ?? [],
    missions: state.missions ?? [],
    gameEvents: state.gameEvents ?? [],
    notifications: state.notifications ?? [],
  };
}

export function buildSimulationPatchFromEngineState(
  state: EngineSimulationState,
): Partial<GameStore> {
  return {
    selectedCountry: state.selectedCountry,
    dateTime: state.dateTime,
    isPlayerAIEnabled: state.isPlayerAIEnabled,
    regionDefinitions: state.regionDefinitions,
    ...buildRegionUpdate(state.regionDefinitions, extractRegionOwners(state.regions)),
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
}

import { applyGameCommand } from '../../../domain/game/commands';
import { EngineSimulationState } from '../../../domain/game/engine/types';
import { buildRegionUpdate, extractRegionOwners } from '../../../utils/regionState';
import type { GameStore } from '../types';

export function buildClaimMissionPatch(state: GameStore, missionId: string): Partial<GameStore> | null {
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

  const result = applyGameCommand(engineState, {
    type: 'CLAIM_MISSION',
    missionId,
  });

  if (!result.applied) {
    return null;
  }

  const nextState = result.state;

  return {
    missions: nextState.missions,
    countryBonuses: nextState.countryBonuses,
    ...buildRegionUpdate(nextState.regionDefinitions, extractRegionOwners(nextState.regions)),
    divisions: nextState.divisions,
    movingUnits: nextState.movingUnits,
    relationships: nextState.relationships,
    armyGroups: nextState.armyGroups,
    aiStates: nextState.aiStates,
    gameEvents: nextState.gameEvents,
    notifications: nextState.notifications,
  };
}

import { RegionOwnershipState, RegionState } from '../../../types/game';
import { initialGameState } from '../initialState';
import { initialRegionOwnership } from '../../../data/map';
import { buildRegionUpdate } from '../../../utils/regionState';
import type { GameStore } from '../types';

export interface StartNewGamePatch {
  regions: RegionState;
  regionDefinitions: GameStore['regionDefinitions'];
  regionOwners: RegionOwnershipState;
  divisions: GameStore['divisions'];
  adjacency: GameStore['adjacency'];
  mapDataLoaded: boolean;
  regionCentroids: GameStore['regionCentroids'];
  borderMidpoints: GameStore['borderMidpoints'];
  currentScreen: 'countrySelect';
}

export function buildStartNewGamePatch(currentState: Pick<
  GameStore,
  'regionDefinitions' | 'regions' | 'adjacency' | 'mapDataLoaded' | 'regionCentroids' | 'borderMidpoints'
>): typeof initialGameState & StartNewGamePatch {
  const regionIds = new Set([
    ...Object.keys(currentState.regionDefinitions),
    ...Object.keys(currentState.regions),
  ]);
  const resetRegionOwners: RegionOwnershipState = {};
  for (const regionId of regionIds) {
    resetRegionOwners[regionId] = initialRegionOwnership[regionId] ?? 'neutral';
  }
  return {
    ...initialGameState,
    ...buildRegionUpdate(currentState.regionDefinitions, resetRegionOwners),
    regionDefinitions: currentState.regionDefinitions,
    divisions: {},
    adjacency: currentState.adjacency,
    mapDataLoaded: currentState.mapDataLoaded,
    regionCentroids: currentState.regionCentroids,
    borderMidpoints: currentState.borderMidpoints,
    currentScreen: 'countrySelect',
  };
}

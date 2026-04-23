import { GameState, RegionState, AIState } from '../../types/game';
import { ActionsState } from './types';
import { StoreApi } from 'zustand';
import { mergeMissionsWithInitial } from '../../utils/missionUtils';
import {
  buildRegionUpdate,
  extractRegionDefinitions,
  extractRegionOwners,
} from '../../utils/regionState';

/**
 * Compatibility path for save files created before the divisionIds migration.
 * Old saves may have Movement objects with a `divisions` array instead of `divisionIds`.
 * This function reconstructs a valid DivisionState from those legacy saves.
 */
export function rehydrateDivisions(gameState: GameState): ActionsState['divisions'] {
  const base: ActionsState['divisions'] = { ...gameState.divisions };

  for (const movement of gameState.movingUnits) {
    const legacyMovement = movement as unknown as { divisions?: import('../../types/game').Division[] };
    if (legacyMovement.divisions && legacyMovement.divisions.length > 0) {
      for (const div of legacyMovement.divisions) {
        if (!base[div.id]) {
          base[div.id] = { ...div, regionId: null };
        }
      }
    }
  }

  return base;
}

import { buildStartNewGamePatch } from './services/startNewGame';

export const createSaveLoadActions = (
  set: StoreApi<ActionsState>['setState'],
  get: StoreApi<ActionsState>['getState'],
) => ({
  startNewGame: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('russian-civil-war-save');
    }
    set(buildStartNewGamePatch(get()));
  },

  saveGame: () => {
    set({ lastSaveTime: new Date() });
  },

  loadGame: (savedData: { gameState: GameState; regions: RegionState; aiStates: AIState[] }) => {
    const currentState = get();
    const savedRegionOwners = Object.keys(savedData.gameState.regionOwners ?? {}).length > 0
      ? savedData.gameState.regionOwners
      : extractRegionOwners(savedData.regions);
    const regionDefinitions = Object.keys(currentState.regionDefinitions).length > 0
      ? currentState.regionDefinitions
      : extractRegionDefinitions(savedData.regions);
    set({
      ...savedData.gameState,
      missions: mergeMissionsWithInitial(savedData.gameState.missions),
      ...buildRegionUpdate(regionDefinitions, savedRegionOwners),
      regionDefinitions,
      divisions: rehydrateDivisions(savedData.gameState),
      aiStates: savedData.aiStates,
      isPlaying: false,
      currentScreen: 'main',
    });
  },
});

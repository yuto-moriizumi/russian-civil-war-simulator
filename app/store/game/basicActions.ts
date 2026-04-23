import { StoreApi } from 'zustand';
import { ActionsState } from './types';
import { createMapDataActions } from './mapDataActions';
import { createSelectionActions } from './selectionActions';
import { createUIStateActions } from './uiStateActions';
import { createNavigationActions } from './navigationActions';
import { createGameControlActions } from './gameControlActions';
import { createCountrySelectionActions, getAIControlledCountries } from './countrySelectionActions';
import { createSaveLoadActions, rehydrateDivisions } from './saveLoadActions';
import { createMissionActions } from './missionActions';
import { applyLiberatePuppet } from './missionRewards';

export { applyLiberatePuppet, getAIControlledCountries, rehydrateDivisions };

/**
 * Defines basic state management actions, composed from split modules.
 */
export const createBasicActions = (
  set: StoreApi<ActionsState>['setState'],
  get: StoreApi<ActionsState>['getState'],
) => ({
  ...createMapDataActions(set),
  ...createSelectionActions(set, get),
  ...createUIStateActions(set, get),
  ...createNavigationActions(set),
  ...createGameControlActions(set, get),
  ...createCountrySelectionActions(set, get),
  ...createSaveLoadActions(set, get),
  ...createMissionActions(set, get),
});

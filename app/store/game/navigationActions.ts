import { Screen } from '../../types/game';
import { ActionsState } from './types';
import { StoreApi } from 'zustand';

export const createNavigationActions = (
  set: StoreApi<ActionsState>['setState'],
) => ({
  navigateToScreen: (screen: Screen) => set({ currentScreen: screen }),

  openMissions: () => {
    set({ currentScreen: 'mission' });
  },
});

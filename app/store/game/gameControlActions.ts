import { GameSpeed } from '../../types/game';
import { ActionsState } from './types';
import { StoreApi } from 'zustand';

export const createGameControlActions = (
  set: StoreApi<ActionsState>['setState'],
  get: StoreApi<ActionsState>['getState'],
) => ({
  togglePlay: () => set((state: ActionsState) => ({ isPlaying: !state.isPlaying })),

  setGameSpeed: (speed: GameSpeed) => set({ gameSpeed: speed }),

  setPlayerAIEnabled: (enabled: boolean) => {
    const { selectedCountry, armyGroups } = get();
    if (!selectedCountry) {
      set({ isPlayerAIEnabled: enabled });
      return;
    }

    set({
      isPlayerAIEnabled: enabled,
      armyGroups: armyGroups.map(group =>
        group.owner === selectedCountry.id
          ? { ...group, mode: enabled ? 'advance' : 'none' }
          : group
      ),
    });
  },
});

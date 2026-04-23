import { ActionsState } from './types';
import { StoreApi } from 'zustand';
import { buildClaimMissionPatch } from './services/claimMission';

export const createMissionActions = (
  set: StoreApi<ActionsState>['setState'],
  get: StoreApi<ActionsState>['getState'],
) => ({
  claimMission: (missionId: string) => {
    const patch = buildClaimMissionPatch(get(), missionId);
    if (patch) set(patch);
  },

  openMissions: () => {
    set({ currentScreen: 'mission' });
  },
});

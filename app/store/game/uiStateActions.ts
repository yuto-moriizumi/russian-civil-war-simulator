import { CountryId, MapMode } from '../../types/game';
import { ActionsState } from './types';
import { StoreApi } from 'zustand';

export const createUIStateActions = (
  set: StoreApi<ActionsState>['setState'],
  get: StoreApi<ActionsState>['getState'],
) => ({
  setIsProductionModalOpen: (isOpen: boolean) => set({ isProductionModalOpen: isOpen }),

  setSelectedCountryId: (countryId: CountryId | null) => set({ selectedCountryId: countryId }),

  setIsCountrySidebarOpen: (isOpen: boolean) => set({ isCountrySidebarOpen: isOpen }),

  setSwitchModeActive: (active: boolean) => set({ isSwitchModeActive: active }),

  dismissNotification: (notificationId: string) => {
    const { notifications } = get();
    set({
      notifications: notifications.filter(n => n.id !== notificationId),
    });
  },

  setMapMode: (mode: MapMode) => set({ mapMode: mode }),
});

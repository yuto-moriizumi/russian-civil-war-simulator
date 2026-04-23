import { ActionsState } from './types';
import { StoreApi } from 'zustand';
import { createDivisionSelectionActions } from './divisionSelectionActions';
import { getDivisionsInRegion } from '../../domain/game/divisionState';

export const createSelectionActions = (
  set: StoreApi<ActionsState>['setState'],
  get: StoreApi<ActionsState>['getState'],
) => ({
  setSelectedRegion: (regionId: string | null) => {
    const { regions, selectedCountry } = get();
    set({ selectedRegion: regionId, selectedDivisionIds: [] });

    if (regionId && regions[regionId]) {
      const region = regions[regionId];
      const isOwnRegion = region.owner === selectedCountry?.id;
      const { divisions } = get();
      const regionDivisions = getDivisionsInRegion(divisions, regionId);
      const hasOwnDivisions = selectedCountry
        ? regionDivisions.some(d => d.owner === selectedCountry.id)
        : false;
      if ((isOwnRegion || hasOwnDivisions) && regionDivisions.length > 0) {
        set({ selectedUnitRegion: regionId });
      } else {
        set({ selectedUnitRegion: null });
      }
    } else {
      set({ selectedUnitRegion: null });
    }
  },

  setSelectedUnitRegion: (regionId: string | null) => set({ selectedUnitRegion: regionId }),

  ...createDivisionSelectionActions(set, get),

  selectDivisionsInArmyGroup: (groupId: string) => {
    const { armyGroups, divisions } = get();
    const group = armyGroups.find(g => g.id === groupId);
    if (!group) return;
    const divisionIds = Object.values(divisions)
      .filter(d => d.armyGroupId === groupId)
      .map(d => d.id);
    set({
      selectedDivisionIds: divisionIds,
      selectedUnitRegion: null,
      selectedRegion: null,
    });
  },

  setSelectedCombatId: (combatId: string | null) => set({ selectedCombatId: combatId }),

  setSelectedMovementId: (movementId: string | null) => {
    if (movementId === null) {
      set({ selectedMovementId: null });
      return;
    }
    const { movingUnits } = get();
    const movement = movingUnits.find(m => m.id === movementId);
    const divisionIds = movement ? movement.divisionIds : [];
    set({
      selectedMovementId: movementId,
      selectedDivisionIds: divisionIds,
      selectedRegion: null,
      selectedUnitRegion: null,
    });
  },
});

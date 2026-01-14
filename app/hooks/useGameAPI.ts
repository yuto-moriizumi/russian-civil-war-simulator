import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

export function useGameAPI() {
  const state = useGameStore();

  useEffect(() => {
    window.gameAPI = {
      selectRegion: (regionId) => {
        state.setSelectedRegion(regionId);
      },
      getSelectedRegion: () => state.selectedRegion,
      getRegions: () => state.regions,

      selectUnits: (regionId) => {
        if (regionId === null) {
          state.setSelectedUnitRegion(null);
          return;
        }
        const region = state.regions[regionId];
        if (region && region.owner === state.selectedCountry?.id && region.divisions.length > 0) {
          state.setSelectedUnitRegion(regionId);
          state.setSelectedRegion(regionId);
        } else {
          console.warn(`[gameAPI] Cannot select units in region "${regionId}" - not found, not owned by player, or has no units`);
        }
      },

      getSelectedUnitRegion: () => state.selectedUnitRegion,

      moveSelectedUnits: (toRegionId, count) => {
        const fromRegion = state.selectedUnitRegion;
        if (!fromRegion) {
          console.warn('[gameAPI] No units selected');
          return false;
        }
        
        const unitsToMove = count ?? state.regions[fromRegion]?.divisions.length ?? 0;
        if (unitsToMove <= 0) return false;

        state.moveUnits(fromRegion, toRegionId, unitsToMove);
        state.setSelectedUnitRegion(null);
        return true;
      },

      getAdjacentRegions: (regionId) => state.adjacency[regionId] ?? [],
      getMovingUnits: () => state.movingUnits,
      getActiveCombats: () => state.activeCombats,

      // Army Group API methods
      createArmyGroup: (name, regionIds, theaterId) => state.createArmyGroup(name, regionIds, theaterId),
      getArmyGroups: () => state.armyGroups,
      advanceArmyGroup: (groupId) => state.advanceArmyGroup(groupId),
      defendArmyGroup: (groupId) => state.defendArmyGroup(groupId),
      setArmyGroupMode: (groupId, mode) => state.setArmyGroupMode(groupId, mode),
      deployToArmyGroup: (groupId) => state.deployToArmyGroup(groupId),
      deleteArmyGroup: (groupId) => state.deleteArmyGroup(groupId),

      // Theater API methods
      getTheaters: () => state.theaters,
      selectTheater: (theaterId) => state.selectTheater(theaterId),
    };

    return () => {
      delete window.gameAPI;
    };
  }, [state]);
}

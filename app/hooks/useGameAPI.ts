import { useEffect } from "react";
import { useGameStore } from "../store/useGameStore";
import { CountryId } from "../types/game";
import { getDivisionsInRegion } from "../utils/divisionState";

/** CLI tool for browser console, mainly for Playwright(MCP) based testing, used by AI */
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
        if (!region || !state.selectedCountry) {
          console.warn(
            `[gameAPI] Cannot select units in region "${regionId}" - not found`,
          );
          return;
        }
        const divsInRegion = getDivisionsInRegion(state.divisions, regionId);
        // Allow selection from owned regions OR ally regions where the player
        // has their own divisions (military access / autonomy scenario)
        const hasOwnDivisions = divsInRegion.some(
          (d) => d.owner === state.selectedCountry!.id,
        );
        const isOwnRegion = region.owner === state.selectedCountry.id;
        if ((isOwnRegion || hasOwnDivisions) && divsInRegion.length > 0) {
          state.setSelectedUnitRegion(regionId);
          state.setSelectedRegion(regionId);
        } else {
          console.warn(
            `[gameAPI] Cannot select units in region "${regionId}" - not found, not owned by player, or has no units`,
          );
        }
      },

      getSelectedUnitRegion: () => state.selectedUnitRegion,

      moveSelectedUnits: (toRegionId, count) => {
        const fromRegion = state.selectedUnitRegion;
        if (!fromRegion) {
          console.warn("[gameAPI] No units selected");
          return false;
        }

        const selectedIds = state.selectedDivisionIds;
        const idsToMove =
          !count && selectedIds.length > 0 ? selectedIds : undefined;
        const unitsToMove =
          count ??
          (selectedIds.length > 0
            ? selectedIds.length
            : getDivisionsInRegion(state.divisions, fromRegion).length);
        if (unitsToMove <= 0) return false;

        state.moveUnits(fromRegion, toRegionId, unitsToMove, idsToMove);
        state.setSelectedUnitRegion(null);
        return true;
      },

      getAdjacentRegions: (regionId) => state.adjacency[regionId] ?? [],
      getMovingUnits: () => state.movingUnits,
      getActiveCombats: () => state.activeCombats,

      // In-transit unit selection
      selectMovement: (movementId) => {
        if (movementId === null) {
          state.setSelectedMovementId(null);
          return;
        }
        const movement = state.movingUnits.find((m) => m.id === movementId);
        if (!movement) {
          console.warn(
            `[gameAPI] Cannot select movement "${movementId}" - not found`,
          );
          return;
        }
        if (
          !state.selectedCountry ||
          movement.owner !== state.selectedCountry.id
        ) {
          console.warn(
            `[gameAPI] Cannot select movement "${movementId}" - not owned by player`,
          );
          return;
        }
        state.setSelectedMovementId(movementId);
      },
      getSelectedMovementId: () => state.selectedMovementId,
      redirectMovement: (movementId, newDestinationRegionId) =>
        state.redirectMovement(movementId, newDestinationRegionId),

      // Army Group API methods
      createArmyGroup: (name, regionIds, theaterId) =>
        state.createArmyGroup(name, regionIds, theaterId),
      getArmyGroups: () => state.armyGroups,
      advanceArmyGroup: (groupId) => state.advanceArmyGroup(groupId),
      defendArmyGroup: (groupId) => state.defendArmyGroup(groupId),
      setArmyGroupMode: (groupId, mode) =>
        state.setArmyGroupMode(groupId, mode),
      deployToArmyGroup: (groupId) => state.deployToArmyGroup(groupId),
      deleteArmyGroup: (groupId) => state.deleteArmyGroup(groupId),

      // Theater API methods
      getTheaters: () => state.theaters,
      selectTheater: (theaterId) => state.selectTheater(theaterId),

      // Production Queue API methods
      addToProductionQueue: (armyGroupId) => {
        state.addToProductionQueue(armyGroupId);
        return true;
      },
      getProductionQueue: (countryId?: CountryId) => {
        if (countryId) {
          return state.productionQueues[countryId] || [];
        }
        // Return all queues flattened for backward compatibility
        return Object.values(state.productionQueues).flat();
      },
      cancelProduction: (productionId) => {
        state.cancelProduction(productionId);
        return true;
      },

      // Relationship API methods
      getRelationships: () => state.relationships,
      setRelationship: (fromCountry, toCountry, type) =>
        state.setRelationship(fromCountry, toCountry, type),
      getRelationship: (fromCountry, toCountry) =>
        state.getRelationship(fromCountry, toCountry),

      // Country sidebar
      openCountrySidebar: (countryId) => {
        state.setSelectedCountryId(countryId);
        state.setIsCountrySidebarOpen(countryId !== null);
      },

      // Map mode
      setMapMode: (mode) => state.setMapMode(mode),
      getMapMode: () => state.mapMode,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      __setRegions: (regions: any) => state.setRegions(regions),
    };

    return () => {
      delete window.gameAPI;
    };
  }, [state]);
}

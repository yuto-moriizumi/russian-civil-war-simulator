import { COUNTRY_METADATA } from '../data/countryMetadata';
import { useSimulationStore } from '../store/useSimulationStore';
import { useGameUiStore } from '../store/useGameUiStore';
import type {
  Country,
  CountryId,
  GameAPI,
  MapMode,
  RegionState,
} from '../types/game';
import { getDivisionsInRegion } from '../utils/divisionState';

function getSimulationState() {
  return useSimulationStore.getState();
}

function getUiState() {
  return useGameUiStore.getState();
}

function buildCountryFromId(countryId: CountryId): Country | null {
  const metadata = COUNTRY_METADATA[countryId];
  if (!metadata) return null;

  return {
    id: countryId,
    name: metadata.name,
    flag: metadata.flag,
    color: metadata.color,
    coreRegions: metadata.coreRegions ?? [],
  };
}

export function getGameSnapshot() {
  return {
    ...getSimulationState(),
    ...getUiState(),
  };
}

export function selectRegion(regionId: string | null) {
  getUiState().setSelectedRegion(regionId);
}

export function selectUnits(regionId: string | null) {
  const simulation = getSimulationState();
  const ui = getUiState();

  if (regionId === null) {
    ui.setSelectedUnitRegion(null);
    return;
  }

  const region = simulation.regions[regionId];
  if (!region || !simulation.selectedCountry) {
    console.warn(
      `[gameAPI] Cannot select units in region "${regionId}" - not found`,
    );
    return;
  }

  const divisionsInRegion = getDivisionsInRegion(simulation.divisions, regionId);
  const hasOwnDivisions = divisionsInRegion.some(
    division => division.owner === simulation.selectedCountry!.id,
  );
  const isOwnRegion = region.owner === simulation.selectedCountry.id;

  if ((isOwnRegion || hasOwnDivisions) && divisionsInRegion.length > 0) {
    ui.setSelectedUnitRegion(regionId);
    ui.setSelectedRegion(regionId);
    return;
  }

  console.warn(
    `[gameAPI] Cannot select units in region "${regionId}" - not found, not owned by player, or has no units`,
  );
}

export function moveSelectedUnits(toRegionId: string, count?: number) {
  const simulation = getSimulationState();
  const ui = getUiState();
  const fromRegion = ui.selectedUnitRegion;

  if (!fromRegion) {
    console.warn('[gameAPI] No units selected');
    return false;
  }

  const selectedIds = ui.selectedDivisionIds;
  const idsToMove = !count && selectedIds.length > 0 ? selectedIds : undefined;
  const unitsToMove =
    count ??
    (selectedIds.length > 0
      ? selectedIds.length
      : getDivisionsInRegion(simulation.divisions, fromRegion).length);

  if (unitsToMove <= 0) return false;

  simulation.moveUnits(fromRegion, toRegionId, unitsToMove, idsToMove);
  ui.setSelectedUnitRegion(null);
  return true;
}

export function selectMovement(movementId: string | null) {
  const simulation = getSimulationState();
  const ui = getUiState();

  if (movementId === null) {
    ui.setSelectedMovementId(null);
    return;
  }

  const movement = simulation.movingUnits.find(item => item.id === movementId);
  if (!movement) {
    console.warn(
      `[gameAPI] Cannot select movement "${movementId}" - not found`,
    );
    return;
  }

  if (
    !simulation.selectedCountry ||
    movement.owner !== simulation.selectedCountry.id
  ) {
    console.warn(
      `[gameAPI] Cannot select movement "${movementId}" - not owned by player`,
    );
    return;
  }

  ui.setSelectedMovementId(movementId);
}

export function openCountrySidebar(countryId: CountryId | null) {
  const ui = getUiState();
  ui.setSelectedCountryId(countryId);
  ui.setIsCountrySidebarOpen(countryId !== null);
}

export function setMapMode(mode: MapMode) {
  getUiState().setMapMode(mode);
}

export function getMapMode() {
  return getUiState().mapMode;
}

export function switchPlayerCountryToRegionOwner(regionId: string) {
  const simulation = getSimulationState();
  const ui = getUiState();
  const region = simulation.regions[regionId];
  if (!region) return;

  const country = buildCountryFromId(region.owner);
  if (country) {
    simulation.selectCountry(country);
  }

  ui.setSwitchModeActive(false);
}

export function handleMapRegionClick(regionId: string) {
  const simulation = getSimulationState();
  const ui = getUiState();

  if (ui.isSwitchModeActive) {
    switchPlayerCountryToRegionOwner(regionId);
    return;
  }

  if (regionId === ui.selectedRegion) {
    ui.setSelectedRegion(null);
    ui.setSelectedUnitRegion(null);
    ui.setSelectedMovementId(null);
    return;
  }

  ui.setSelectedRegion(regionId);
  ui.setSelectedMovementId(null);

  const region = simulation.regions[regionId];
  const playerCountry = simulation.selectedCountry?.id;

  if (
    region &&
    region.owner === playerCountry &&
    getDivisionsInRegion(simulation.divisions, regionId).length > 0
  ) {
    ui.setSelectedUnitRegion(regionId);
    return;
  }

  ui.setSelectedUnitRegion(null);
}

export function handleMapRegionContextMenu(targetRegionId: string) {
  const simulation = getSimulationState();
  const ui = getUiState();

  const currentSelectedMovement = ui.selectedMovementId;
  const currentSelectedUnit = ui.selectedUnitRegion;
  let handled = false;

  if (currentSelectedMovement) {
    const movement = simulation.movingUnits.find(
      item => item.id === currentSelectedMovement,
    );
    if (movement && targetRegionId === movement.fromRegion) {
      simulation.cancelMovement(currentSelectedMovement);
    } else {
      simulation.redirectMovement(currentSelectedMovement, targetRegionId);
    }
    ui.setSelectedMovementId(null);
    handled = true;
  }

  if (
    !handled &&
    currentSelectedUnit &&
    targetRegionId !== currentSelectedUnit
  ) {
    const sourceRegion = simulation.regions[currentSelectedUnit];
    const sourceDivisions = sourceRegion
      ? getDivisionsInRegion(simulation.divisions, currentSelectedUnit)
      : [];

    if (sourceDivisions.length > 0) {
      const count =
        ui.selectedDivisionIds.length > 0
          ? ui.selectedDivisionIds.length
          : sourceDivisions.length;
      simulation.moveUnits(currentSelectedUnit, targetRegionId, count);
      ui.clearSelectedDivisions();
      handled = true;
    }
  }

  if (!handled) {
    const region = simulation.regions[targetRegionId];
    if (region) {
      openCountrySidebar(region.owner);
    }
  }
}

export function setRegionsForTesting(regions: RegionState) {
  getSimulationState().setRegions(regions);
}

export function createGameAPI(): GameAPI {
  return {
    selectRegion,
    getSelectedRegion: () => getUiState().selectedRegion,
    getRegions: () => getSimulationState().regions,
    selectUnits,
    getSelectedUnitRegion: () => getUiState().selectedUnitRegion,
    moveSelectedUnits,
    selectMovement,
    getSelectedMovementId: () => getUiState().selectedMovementId,
    redirectMovement: (movementId, newDestinationRegionId) =>
      getSimulationState().redirectMovement(movementId, newDestinationRegionId),
    getAdjacentRegions: regionId => getSimulationState().adjacency[regionId] ?? [],
    getMovingUnits: () => getSimulationState().movingUnits,
    getActiveCombats: () => getSimulationState().activeCombats,
    createArmyGroup: (name, regionIds, theaterId) =>
      getSimulationState().createArmyGroup(name, regionIds, theaterId),
    getArmyGroups: () => getSimulationState().armyGroups,
    advanceArmyGroup: groupId => getSimulationState().advanceArmyGroup(groupId),
    defendArmyGroup: groupId => getSimulationState().defendArmyGroup(groupId),
    setArmyGroupMode: (groupId, mode) =>
      getSimulationState().setArmyGroupMode(groupId, mode),
    deployToArmyGroup: (groupId, count) =>
      getSimulationState().deployToArmyGroup(groupId, count),
    deleteArmyGroup: groupId => getSimulationState().deleteArmyGroup(groupId),
    getTheaters: () => getSimulationState().theaters,
    selectTheater: theaterId => getUiState().selectTheater(theaterId),
    addToProductionQueue: (armyGroupId, count) => {
      getSimulationState().addToProductionQueue(armyGroupId, count);
      return true;
    },
    getProductionQueue: (countryId?: CountryId) => {
      if (countryId) {
        return getSimulationState().productionQueues[countryId] || [];
      }
      return Object.values(getSimulationState().productionQueues).flat();
    },
    cancelProduction: productionId => {
      getSimulationState().cancelProduction(productionId);
      return true;
    },
    getRelationships: () => getSimulationState().relationships,
    setRelationship: (fromCountry, toCountry, type) =>
      getSimulationState().setRelationship(fromCountry, toCountry, type),
    getRelationship: (fromCountry, toCountry) =>
      getSimulationState().getRelationship(fromCountry, toCountry),
    openCountrySidebar,
    setMapMode,
    getMapMode,
    __setRegions: setRegionsForTesting,
  };
}

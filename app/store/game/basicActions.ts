import { CountryId, Screen, Region, Adjacency, Country, GameSpeed, GameState, RegionState, AIState, MapMode, Relationship, DivisionState } from '../../types/game';
import { GameStore } from './types';
import { StoreApi } from 'zustand';
import * as turf from '@turf/turf';
import { createDivisionSelectionActions } from './divisionSelectionActions';
import { applyLiberatePuppet } from './missionRewards';
import { getDivisionsInRegion } from '../../utils/divisionState';
import { mergeMissionsWithInitial } from '../../utils/missionUtils';
import {
  buildRegionUpdate,
  createRegionStatePatch,
  extractRegionDefinitions,
  extractRegionOwners,
} from '../../utils/regionState';
import { buildStartNewGamePatch } from './services/startNewGame';
import { buildSelectCountryPatch } from './services/selectCountry';
import { buildClaimMissionPatch } from './services/claimMission';

export { applyLiberatePuppet };

/**
 * Compatibility path for save files created before the divisionIds migration.
 * Old saves may have Movement objects with a `divisions` array instead of `divisionIds`.
 * This function reconstructs a valid DivisionState from those legacy saves.
 */
function rehydrateDivisions(gameState: GameState): DivisionState {
  const base: DivisionState = { ...gameState.divisions };

  // Legacy compat: if movements have old `divisions` array, ensure those divisions
  // are in DivisionState and have divisionIds populated.
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

const DEFAULT_AI_COUNTRIES: CountryId[] = [
  'soviet',
  'white',
  'finland',
  'ukraine',
  'don',
  'fswr',
  'iskolat',
  'germany',
  'bulgaria',
  'poland',
  'austriahungary',
  'romania',
  'ottoman',
  'serbia',
];

export function getAIControlledCountries(
  playerCountryId: CountryId,
  regions: RegionState,
  productionQueues: GameState['productionQueues'],
  relationships: Relationship[]
): CountryId[] {
  const countryIds = new Set<CountryId>(DEFAULT_AI_COUNTRIES);

  Object.values(regions).forEach(region => {
    countryIds.add(region.owner);
  });

  Object.entries(productionQueues).forEach(([countryId, queue]) => {
    if (queue.length > 0) {
      countryIds.add(countryId as CountryId);
    }
  });

  relationships.forEach(relationship => {
    if (relationship.type === 'autonomy') {
      countryIds.add(relationship.toCountry);
    }
  });

  countryIds.delete(playerCountryId);
  countryIds.delete('neutral');
  countryIds.delete('foreign');

  return Array.from(countryIds);
}

/**
 * Defines basic state management actions:
 * - Setting regions, adjacency, map data
 * - Selecting regions and units
 * - Navigation between screens
 * - Country selection
 * - Game controls (play/pause, speed)
 * - Notification management
 * - Mission management
 * - Save/load functionality
 */
export const createBasicActions = (
  set: StoreApi<GameStore>['setState'],
  get: StoreApi<GameStore>['getState']
) => ({
  setRegions: (regions: Record<string, Region>) => set(createRegionStatePatch(regions)),
  
  setAdjacency: (adjacency: Adjacency) => set({ adjacency }),

  setBorderMidpoints: (midpoints: Record<string, [number, number]>) => set({ borderMidpoints: midpoints }),
  
  setMapDataLoaded: (loaded: boolean) => set({ mapDataLoaded: loaded }),
  
  setSelectedRegion: (regionId: string | null) => {
    const { regions, selectedCountry } = get();
    // Selecting a region clears any division selection (mutual exclusivity)
    set({ selectedRegion: regionId, selectedDivisionIds: [] });
    
    if (regionId && regions[regionId]) {
      const region = regions[regionId];
      // Allow selecting units in owned regions OR ally regions where the
      // player has their own divisions (military access / autonomy)
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

  // Division selection actions (HOI4-style multi-select)
  ...createDivisionSelectionActions(set, get),

  /**
   * Select all divisions across every region belonging to an army group.
   * Clears selectedRegion (mutual exclusivity with the region info panel).
   * selectedUnitRegion is set to null because divisions span multiple regions.
   */
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
  
  setIsProductionModalOpen: (isOpen: boolean) => set({ isProductionModalOpen: isOpen }),

  setSelectedCountryId: (countryId: CountryId | null) => set({ selectedCountryId: countryId }),

  setIsCountrySidebarOpen: (isOpen: boolean) => set({ isCountrySidebarOpen: isOpen }),

  setSwitchModeActive: (active: boolean) => set({ isSwitchModeActive: active }),

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

  dismissNotification: (notificationId: string) => {
    const { notifications } = get();
    set({ 
      notifications: notifications.filter(n => n.id !== notificationId) 
    });
  },

  navigateToScreen: (screen: Screen) => set({ currentScreen: screen }),

  startNewGame: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('russian-civil-war-save');
    }
    set(buildStartNewGamePatch(get()));
  },

  selectCountry: (country: Country, isInitial = false) => {
    const currentState = get();
    const aiCountries = getAIControlledCountries(
      country.id,
      currentState.regions,
      currentState.productionQueues,
      currentState.relationships
    );
    set(buildSelectCountryPatch(currentState, country, isInitial, aiCountries));
    get().detectAndUpdateTheaters();
  },

  togglePlay: () => set((state: GameStore) => ({ isPlaying: !state.isPlaying })),

  setGameSpeed: (speed: GameSpeed) => set({ gameSpeed: speed }),

  claimMission: (missionId: string) => {
    const patch = buildClaimMissionPatch(get(), missionId);
    if (patch) set(patch);
  },

  openMissions: () => {
    set({ currentScreen: 'mission' });
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

  setMapMode: (mode: MapMode) => set({ mapMode: mode }),

  initializeCentroids: async () => {
    try {
      const response = await fetch('/map/regions.geojson');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geojson = await response.json() as any;
      
      const centroids: Record<string, [number, number]> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      geojson.features.forEach((feature: any) => {
        // Use feature.id set by build scripts
        const id = feature.id as string;
        const centroid = turf.centroid(feature);
        const coords = centroid.geometry.coordinates;
        centroids[id] = [coords[0], coords[1]];
      });
      
      set({ regionCentroids: centroids });
      console.log(`Loaded ${Object.keys(centroids).length} region centroids`);
    } catch (error) {
      console.error('Failed to load region centroids:', error);
    }
  },
});

/* eslint-disable max-lines */
import { CountryId, Screen, Region, Adjacency, Country, GameSpeed, GameState, RegionState, AIState, MapMode, ArmyGroup, Relationship, Mission, DivisionState, RegionOwnershipState } from '../../types/game';
import { initialMissions } from '../../data/gameData';
import { createInitialAIState, createInitialAIArmyGroup } from '../../ai/cpuPlayer';
import { createGameEvent, createNotification } from '../../utils/eventUtils';
import { initialGameState } from './initialState';
import { GameStore } from './types';
import { StoreApi } from 'zustand';
import * as turf from '@turf/turf';
import { initialRegionOwnership } from '../../data/map';
import { initialUnitPlacement, initialArmyGroupDefs } from '../../data/map/initialUnitPlacement';
import { createDivision } from '../../utils/combat';
import { getDivisionPrefix } from '../../data/countries';
import { createDivisionSelectionActions } from './divisionSelectionActions';
import { applyClaimedMissionRewards, applyLiberatePuppet, buildMissionRewardDescription } from './missionRewards';
import { getDivisionsInRegion } from '../../utils/divisionState';
import {
  buildRegionUpdate,
  createRegionStatePatch,
  extractRegionDefinitions,
  extractRegionOwners,
} from '../../utils/regionState';

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

export function mergeMissionsWithInitial(currentMissions: Mission[]): Mission[] {
  const currentById = new Map(currentMissions.map(mission => [mission.id, mission]));
  return initialMissions.map(initialMission => currentById.get(initialMission.id) ?? { ...initialMission });
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
    // Clear the Zustand-persisted save from localStorage so that the
    // upcoming selectCountry call reads a blank slate, not the old session.
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('russian-civil-war-save');
    }
    // Reset in-memory store to initial state while preserving non-persisted
    // map data that was loaded asynchronously (regions, adjacency, centroids).
    const currentState = get();
    const regionIds = new Set([
      ...Object.keys(currentState.regionDefinitions),
      ...Object.keys(currentState.regions),
    ]);
    const resetRegionOwners: RegionOwnershipState = {};
    for (const regionId of regionIds) {
      resetRegionOwners[regionId] = initialRegionOwnership[regionId] ?? 'neutral';
    }
    set({
      ...initialGameState,
      // Keep the loaded map geometry so the game doesn't need to re-fetch it.
      ...buildRegionUpdate(currentState.regionDefinitions, resetRegionOwners),
      regionDefinitions: currentState.regionDefinitions,
      divisions: {},
      adjacency: currentState.adjacency,
      mapDataLoaded: currentState.mapDataLoaded,
      regionCentroids: currentState.regionCentroids,
      borderMidpoints: currentState.borderMidpoints,
      // Navigate to country selection for a fresh start.
      currentScreen: 'countrySelect',
    });
  },

  selectCountry: (country: Country, isInitial = false) => {
    // Determine which countries become AI-controlled (all non-player countries)
    const currentRegions = get().regions;
    const currentState = get();
    const playerArmyGroupMode = currentState.isPlayerAIEnabled ? 'advance' : 'none';
    const aiCountries = getAIControlledCountries(
      country.id,
      currentRegions,
      currentState.productionQueues,
      currentState.relationships
    );

    // Create initial AI states for all AI countries
    const aiStates = aiCountries.map(countryId => createInitialAIState(countryId));

    // ── Initial game start: build army groups and place divisions from map-tool placement data ──
    // On mid-game country switch (isInitial=false), skip placement entirely so live
    // unit positions, army groups, and regions are not reset.
    let placementArmyGroups: ArmyGroup[] = currentState.placementArmyGroups ?? [];
    let regionsForState = currentRegions;
    let divisionsForState = currentState.divisions;
    let armyGroupsForState = currentState.armyGroups;

    if (isInitial) {
      // Map: countryId → (armyGroupName → ArmyGroup)
      const placementGroupsByCountry: Record<string, Record<string, ArmyGroup>> = {};

      for (const [countryId, defs] of Object.entries(initialArmyGroupDefs)) {
        if (!defs || defs.length === 0) continue;
        placementGroupsByCountry[countryId] = {};
        for (const def of defs) {
          const groupId = `placement-${countryId}-${def.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          placementGroupsByCountry[countryId][def.name] = {
            id: groupId,
            name: def.name,
            regionIds: [],
            color: def.color,
            owner: countryId as CountryId,
            theaterId: null,
            mode: country.id === countryId ? playerArmyGroupMode : 'advance',
          };
        }
      }

      const regionsWithUnits: RegionState = {};
      for (const [regionId, region] of Object.entries(currentRegions)) {
        regionsWithUnits[regionId] = { ...region };
      }

      const divCounters: Record<string, number> = {};
      const initialDivisions: DivisionState = {};

      for (const [regionId, entries] of Object.entries(initialUnitPlacement)) {
        if (!regionsWithUnits[regionId]) continue;
        for (const entry of entries) {
          const { owner, armyGroupName, count } = entry;
          const countryGroups = placementGroupsByCountry[owner];
          let armyGroup = countryGroups?.[armyGroupName];

          if (!armyGroup) {
            if (!placementGroupsByCountry[owner]) placementGroupsByCountry[owner] = {};
            const groupId = `placement-${owner}-${armyGroupName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            armyGroup = {
              id: groupId,
              name: armyGroupName,
              regionIds: [],
              color: '#6B7280',
              owner: owner as CountryId,
              theaterId: null,
              mode: country.id === owner ? playerArmyGroupMode : 'advance',
            };
            placementGroupsByCountry[owner][armyGroupName] = armyGroup;
          }

          if (!armyGroup.regionIds.includes(regionId)) {
            armyGroup.regionIds.push(regionId);
          }

          const initialBonuses = get().countryBonuses?.[owner as CountryId] ??
            { attackBonus: 0, defenceBonus: 0, hpBonus: 0, commandPowerBonus: 0, productionSpeedMultiplier: 1 };
          const prefix = getDivisionPrefix(owner as CountryId);
          for (let i = 0; i < count; i++) {
            divCounters[owner] = (divCounters[owner] ?? 0) + 1;
            const n = divCounters[owner];
            const suffix = n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
            const name = `${suffix} ${prefix}`;
            const division = createDivision(owner as CountryId, name, armyGroup.id, initialBonuses);
            initialDivisions[division.id] = { ...division, regionId };
          }
        }
      }

      placementArmyGroups = Object.values(placementGroupsByCountry)
        .flatMap(groupMap => Object.values(groupMap));

      // For countries with no placement data, generate auto groups
      const countriesWithPlacement = new Set(Object.keys(placementGroupsByCountry));
      const allCountries = [country.id, ...aiCountries];
      const autoGroups = allCountries
        .filter(countryId => !countriesWithPlacement.has(countryId))
        .map(countryId => {
          const g = createInitialAIArmyGroup(countryId, regionsWithUnits);
          if (countryId === country.id) g.mode = playerArmyGroupMode;
          return g;
        });

      regionsForState = regionsWithUnits;
      divisionsForState = initialDivisions;
      armyGroupsForState = [...autoGroups, ...placementArmyGroups];
    } else {
      // Mid-game switch: preserve all army groups; only create ones for countries with none.
      const allCountries = [country.id, ...aiCountries];
      const countriesWithGroups = new Set(currentState.armyGroups.map((g: ArmyGroup) => g.owner));
      const missingGroups = allCountries
        .filter(countryId => !countriesWithGroups.has(countryId))
        .map(countryId => {
          const g = createInitialAIArmyGroup(countryId, currentRegions);
          if (countryId === country.id) g.mode = playerArmyGroupMode;
          return g;
        });
      armyGroupsForState = [...currentState.armyGroups, ...missingGroups];
      divisionsForState = currentState.divisions;
    }

    // Reset all game state for a fresh start, but preserve live game state that
    // should survive a country switch: production queues, date/time, game events,
    // notifications, active combats, moving units, country bonuses, relationships,
    // scheduled events, and theaters.
    set({
      ...initialGameState,
      selectedCountry: country,
      currentScreen: 'main',
      missions: mergeMissionsWithInitial(currentState.missions),
      aiStates: aiStates,
      armyGroups: armyGroupsForState,
      placementArmyGroups,
      ...buildRegionUpdate(currentState.regionDefinitions, extractRegionOwners(regionsForState)),
      regionDefinitions: currentState.regionDefinitions,
      divisions: divisionsForState,
      adjacency: currentState.adjacency,
      mapDataLoaded: currentState.mapDataLoaded,
      regionCentroids: currentState.regionCentroids,
      borderMidpoints: currentState.borderMidpoints,
      // Preserve live game state across country switch
      productionQueues: currentState.productionQueues,
      dateTime: currentState.dateTime,
      isPlaying: currentState.isPlaying,
      gameSpeed: currentState.gameSpeed,
      gameEvents: currentState.gameEvents,
      notifications: currentState.notifications,
      activeCombats: currentState.activeCombats,
      movingUnits: currentState.movingUnits,
      countryBonuses: currentState.countryBonuses,
      relationships: currentState.relationships,
      scheduledEvents: currentState.scheduledEvents,
      theaters: currentState.theaters,
      isPlayerAIEnabled: currentState.isPlayerAIEnabled,
    });
    
    // Detect theaters when game starts (synchronous so the select is populated immediately)
    get().detectAndUpdateTheaters();
  },

  togglePlay: () => set((state: GameStore) => ({ isPlaying: !state.isPlaying })),

  setGameSpeed: (speed: GameSpeed) => set({ gameSpeed: speed }),

  claimMission: (missionId: string) => {
    set((state: GameStore) => {
      const mission = state.missions.find(m => m.id === missionId);
      if (mission && mission.completed && !mission.claimed && state.selectedCountry && mission.country === state.selectedCountry.id) {
        const countryId = mission.country;
        const events = [...state.gameEvents];
        const notifs = [...state.notifications];
        const rewardDescription = buildMissionRewardDescription(mission.rewards);
        
        const claimEvent = createGameEvent(
          'mission_claimed',
          `Mission Completed: ${mission.name}`,
          `Mission "${mission.name}" completed! Bonuses gained: ${rewardDescription}.`,
          state.dateTime,
          countryId
        );
        events.push(claimEvent);
        notifs.push(createNotification(claimEvent, state.dateTime));
        
        if (mission.rewards.gameVictory) {
          const victoryEvent = createGameEvent(
            'game_victory',
            'Victory!',
            `${state.selectedCountry.name} has achieved total victory in the Russian Civil War!`,
            state.dateTime,
            countryId
          );
          events.push(victoryEvent);
          notifs.push(createNotification(victoryEvent, state.dateTime));
        }

        // Mark mission as claimed
        const updatedMissions = state.missions.map(m =>
          m.id === missionId ? { ...m, claimed: true } : m
        );

        const rewards = applyClaimedMissionRewards(state, mission, countryId, updatedMissions);

        console.log(`[MISSION CLAIMED] ${mission.name} - Applied bonuses to ${countryId} divisions`);
        console.log(`[BONUSES] Attack: +${rewards.updatedCountryBonuses.attackBonus}, Defence: +${rewards.updatedCountryBonuses.defenceBonus}, HP: +${rewards.updatedCountryBonuses.hpBonus}, Command Power: +${rewards.updatedCountryBonuses.commandPowerBonus}, Prod Speed: ${rewards.updatedCountryBonuses.productionSpeedMultiplier.toFixed(2)}x`);

        rewards.rewardEvents.forEach(e => {
          events.push(e);
          notifs.push(createNotification(e, state.dateTime));
        });

        return {
          missions: updatedMissions,
          countryBonuses: {
            ...state.countryBonuses,
            [countryId]: rewards.updatedCountryBonuses,
          },
          ...buildRegionUpdate(state.regionDefinitions, extractRegionOwners(rewards.updatedRegions)),
          divisions: rewards.updatedDivisions,
          movingUnits: rewards.updatedMovingUnits,
          relationships: rewards.updatedRelationships,
          armyGroups: rewards.updatedArmyGroups,
          aiStates: rewards.updatedAIStates,
          gameEvents: events,
          notifications: notifs,
        };
      }
      return state;
    });
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

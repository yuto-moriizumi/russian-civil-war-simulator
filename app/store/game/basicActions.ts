import { CountryId, Screen, Region, Adjacency, Country, GameSpeed, GameState, RegionState, AIState, MapMode, ArmyGroup } from '../../types/game';
import { initialMissions } from '../../data/gameData';
import { createInitialAIState, createInitialAIArmyGroup } from '../../ai/cpuPlayer';
import { createGameEvent, createNotification } from '../../utils/eventUtils';
import { calculateCountryBonuses, getDivisionStats } from '../../utils/bonusCalculator';
import { initialGameState } from './initialState';
import { GameStore } from './types';
import { StoreApi } from 'zustand';
import * as turf from '@turf/turf';
import { initialUnitPlacement, initialArmyGroupDefs } from '../../data/map/initialUnitPlacement';
import { createDivision } from '../../utils/combat';
import { getDivisionPrefix } from '../../data/countries';

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
  setRegions: (regions: Record<string, Region>) => set({ regions }),
  
  setAdjacency: (adjacency: Adjacency) => set({ adjacency }),
  
  setMapDataLoaded: (loaded: boolean) => set({ mapDataLoaded: loaded }),
  
  setSelectedRegion: (regionId: string | null) => {
    const { regions, selectedCountry } = get();
    set({ selectedRegion: regionId });
    
    if (regionId && regions[regionId]) {
      const region = regions[regionId];
      // Allow selecting units in owned regions OR ally regions where the
      // player has their own divisions (military access / autonomy)
      const isOwnRegion = region.owner === selectedCountry?.id;
      const hasOwnDivisions = selectedCountry
        ? region.divisions.some(d => d.owner === selectedCountry.id)
        : false;
      if ((isOwnRegion || hasOwnDivisions) && region.divisions.length > 0) {
        set({ selectedUnitRegion: regionId });
      } else {
        set({ selectedUnitRegion: null });
      }
    } else {
      set({ selectedUnitRegion: null });
    }
  },
  
  setSelectedUnitRegion: (regionId: string | null) => set({ selectedUnitRegion: regionId }),
  
  setIsEventsModalOpen: (isOpen: boolean) => set({ isEventsModalOpen: isOpen }),
  
  setSelectedCombatId: (combatId: string | null) => set({ selectedCombatId: combatId }),
  
  setIsProductionModalOpen: (isOpen: boolean) => set({ isProductionModalOpen: isOpen }),

  setSelectedCountryId: (countryId: CountryId | null) => set({ selectedCountryId: countryId }),

  setIsCountrySidebarOpen: (isOpen: boolean) => set({ isCountrySidebarOpen: isOpen }),

  setSwitchModeActive: (active: boolean) => set({ isSwitchModeActive: active }),

  dismissNotification: (notificationId: string) => {
    const { notifications } = get();
    set({ 
      notifications: notifications.filter(n => n.id !== notificationId) 
    });
  },

  navigateToScreen: (screen: Screen) => set({ currentScreen: screen }),
  
  selectCountry: (country: Country) => {
    // Determine which countries become AI-controlled (all non-player countries)
    const allCountries: CountryId[] = [
      'soviet', 'white', 'finland', 'ukraine', 'don', 'fswr', 
      'iskolat', 'germany', 'bulgaria', 'poland', 'austriahungary', 'romania', 'ottoman', 'serbia'
    ];
    const aiCountries = allCountries.filter(countryId => countryId !== country.id);

    
    const countryMissions = initialMissions.filter(m => m.country === country.id);
    const currentRegions = get().regions;
    
    // Create initial AI states for all AI countries
    const aiStates = aiCountries.map(countryId => createInitialAIState(countryId));

    // ── Build army groups and place divisions from map-tool placement data ──
    //
    // For each country that has placement data, create ArmyGroup objects keyed
    // by the name defined in initialArmyGroupDefs, then populate region divisions
    // from initialUnitPlacement.  Countries that have no placement data fall back
    // to the auto-generated army group created by createInitialAIArmyGroup.

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
          regionIds: [], // will be populated below
          color: def.color,
          owner: countryId as CountryId,
          theaterId: null,
          mode: country.id === countryId ? 'none' : 'advance',
        };
      }
    }

    // Deep-copy current regions, clearing divisions ONLY in regions that appear
    // in initialUnitPlacement.  Those regions will be re-populated from static
    // data below, so we must wipe them first to prevent double-stacking on
    // repeat country switches (A → B → A scenario).
    //
    // Regions that are NOT in initialUnitPlacement keep their current divisions
    // so that units created dynamically during the game (production, manual
    // creation, combat survivors) are preserved when the player switches country.
    const initialPlacementRegions = new Set(Object.keys(initialUnitPlacement));
    const regionsWithUnits: RegionState = {};
    for (const [regionId, region] of Object.entries(currentRegions)) {
      regionsWithUnits[regionId] = initialPlacementRegions.has(regionId)
        ? { ...region, divisions: [] }
        : { ...region };
    }

    // Division name counters per country
    const divCounters: Record<string, number> = {};

    // Place divisions from initialUnitPlacement
    for (const [regionId, entries] of Object.entries(initialUnitPlacement)) {
      if (!regionsWithUnits[regionId]) continue;
      for (const entry of entries) {
        const { owner, armyGroupName, count } = entry;
        const countryGroups = placementGroupsByCountry[owner];
        let armyGroup = countryGroups?.[armyGroupName];

        // Fallback: if no matching group defined, create one on-the-fly
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
            mode: country.id === owner ? 'none' : 'advance',
          };
          placementGroupsByCountry[owner][armyGroupName] = armyGroup;
        }

        // Track which regions this group covers
        if (!armyGroup.regionIds.includes(regionId)) {
          armyGroup.regionIds.push(regionId);
        }

        // Create divisions and push to region
        const initialBonuses = get().countryBonuses?.[owner as CountryId] ?? 
          { attackBonus: 0, defenceBonus: 0, hpBonus: 0, commandPowerBonus: 0, productionSpeedMultiplier: 1 };
        const prefix = getDivisionPrefix(owner as CountryId);
        for (let i = 0; i < count; i++) {
          divCounters[owner] = (divCounters[owner] ?? 0) + 1;
          const n = divCounters[owner];
          const suffix = n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
          const name = `${suffix} ${prefix}`;
          const division = createDivision(owner as CountryId, name, armyGroup.id, initialBonuses);
          regionsWithUnits[regionId].divisions.push(division);
        }
      }
    }

    // Collect all placement-derived army groups
    const placementArmyGroups: ArmyGroup[] = Object.values(placementGroupsByCountry)
      .flatMap(groupMap => Object.values(groupMap));

    // Set of countries that already have placement groups
    const countriesWithPlacement = new Set(Object.keys(placementGroupsByCountry));

    // For AI countries WITHOUT placement data, generate auto groups
    const aiArmyGroups = aiCountries
      .filter(countryId => !countriesWithPlacement.has(countryId))
      .map(countryId => createInitialAIArmyGroup(countryId, regionsWithUnits));
    
    // Player army group (only if the player country has no placement data)
    const playerArmyGroups: ArmyGroup[] = [];
    if (!countriesWithPlacement.has(country.id)) {
      const playerArmyGroup = createInitialAIArmyGroup(country.id, regionsWithUnits);
      playerArmyGroup.id = `player-army-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      playerArmyGroups.push(playerArmyGroup);
    }
    
    // Reset all game state for a fresh start
    set({
      ...initialGameState,
      selectedCountry: country,
      currentScreen: 'main',
      missions: countryMissions,
      aiStates: aiStates,
      armyGroups: [...playerArmyGroups, ...aiArmyGroups, ...placementArmyGroups],
      placementArmyGroups,
      // Keep the regions and adjacency from map data (these are static), but
      // overlay any divisions from unit placement
      regions: Object.keys(regionsWithUnits).length > 0 ? regionsWithUnits : get().regions,
      adjacency: get().adjacency,
      mapDataLoaded: get().mapDataLoaded,
      regionCentroids: get().regionCentroids, // Preserve loaded centroids
    });
    
    // Detect theaters when game starts
    setTimeout(() => get().detectAndUpdateTheaters(), 100);
  },

  togglePlay: () => set((state: GameStore) => ({ isPlaying: !state.isPlaying })),
  
  setGameSpeed: (speed: GameSpeed) => set({ gameSpeed: speed }),

  claimMission: (missionId: string) => {
    set((state: GameStore) => {
      const mission = state.missions.find(m => m.id === missionId);
      if (mission && mission.completed && !mission.claimed && state.selectedCountry) {
        const countryId = state.selectedCountry.id;
        const events = [...state.gameEvents];
        const notifs = [...state.notifications];
        
        // Build reward description
        const rewardParts: string[] = [];
        if (mission.rewards.attackBonus) rewardParts.push(`+${mission.rewards.attackBonus} Attack`);
        if (mission.rewards.defenceBonus) rewardParts.push(`+${mission.rewards.defenceBonus} Defence`);
        if (mission.rewards.hpBonus) rewardParts.push(`+${mission.rewards.hpBonus} HP`);
        if (mission.rewards.commandPowerBonus) rewardParts.push(`+${mission.rewards.commandPowerBonus} Command Power`);
        if (mission.rewards.productionSpeedBonus) {
          const percentReduction = Math.round(mission.rewards.productionSpeedBonus * 100);
          rewardParts.push(`+${percentReduction}% Production Speed`);
        }
        const rewardDescription = rewardParts.length > 0 ? rewardParts.join(', ') : 'No bonuses';
        
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
        
        // Recalculate country bonuses
        const newCountryBonuses = calculateCountryBonuses(updatedMissions, countryId);
        const newDivisionStats = getDivisionStats(countryId, newCountryBonuses);
        
        // Apply bonuses retroactively to ALL existing divisions
        const updatedRegions: RegionState = {};
        Object.keys(state.regions).forEach(regionId => {
          const region = state.regions[regionId];
          const updatedDivisions = region.divisions.map(div => {
            if (div.owner === countryId) {
              // Apply new stats to this country's divisions
              return {
                ...div,
                attack: newDivisionStats.attack,
                defence: newDivisionStats.defence,
                maxHp: newDivisionStats.maxHp,
                // Keep current HP, but cap it at new maxHp
                hp: Math.min(div.hp, newDivisionStats.maxHp),
              };
            }
            return div;
          });
          
          updatedRegions[regionId] = {
            ...region,
            divisions: updatedDivisions,
          };
        });
        
        // Also apply bonuses to divisions in transit
        const updatedMovingUnits = state.movingUnits.map(movement => {
          if (movement.owner === countryId) {
            const updatedDivisions = movement.divisions.map(div => ({
              ...div,
              attack: newDivisionStats.attack,
              defence: newDivisionStats.defence,
              maxHp: newDivisionStats.maxHp,
              hp: Math.min(div.hp, newDivisionStats.maxHp),
            }));
            return {
              ...movement,
              divisions: updatedDivisions,
            };
          }
          return movement;
        });
        
        console.log(`[MISSION CLAIMED] ${mission.name} - Applied bonuses to ${countryId} divisions`);
        console.log(`[BONUSES] Attack: +${newCountryBonuses.attackBonus}, Defence: +${newCountryBonuses.defenceBonus}, HP: +${newCountryBonuses.hpBonus}, Command Power: +${newCountryBonuses.commandPowerBonus}, Prod Speed: ${newCountryBonuses.productionSpeedMultiplier.toFixed(2)}x`);
        
        return {
          missions: updatedMissions,
          countryBonuses: {
            ...state.countryBonuses,
            [countryId]: newCountryBonuses,
          },
          regions: updatedRegions,
          movingUnits: updatedMovingUnits,
          gameEvents: events,
          notifications: notifs,
        };
      }
      return state;
    });
  },

  openMissions: () => {
    set((state: GameStore) => ({
      currentScreen: 'mission',
      missions: state.missions.map((m, index) => 
        index === 0 ? { ...m, completed: true } : m
      ),
    }));
  },

  saveGame: () => {
    set({ lastSaveTime: new Date() });
  },

  loadGame: (savedData: { gameState: GameState; regions: RegionState; aiStates: AIState[] }) => {
    set({
      ...savedData.gameState,
      regions: savedData.regions,
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
        // Use consistent ID logic: shapeISO || regionId || shapeID
        const id = feature.properties.shapeISO || feature.properties.regionId || feature.properties.shapeID || feature.properties.id;
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

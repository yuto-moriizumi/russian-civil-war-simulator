import { CountryId, Screen, Region, Adjacency, Country, GameSpeed, GameState, RegionState, AIState, MapMode } from '../../types/game';
import { initialMissions } from '../../data/gameData';
import { createInitialAIState, createInitialAIArmyGroup } from '../../ai/cpuPlayer';
import { createGameEvent, createNotification } from '../../utils/eventUtils';
import { calculateCountryBonuses, getDivisionStats } from '../../utils/bonusCalculator';
import { initialGameState } from './initialState';
import { GameStore } from './types';
import { StoreApi } from 'zustand';
import * as turf from '@turf/turf';

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
      if (region.owner === selectedCountry?.id && region.divisions.length > 0) {
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

  dismissNotification: (notificationId: string) => {
    const { notifications } = get();
    set({ 
      notifications: notifications.filter(n => n.id !== notificationId) 
    });
  },

  navigateToScreen: (screen: Screen) => set({ currentScreen: screen }),
  
  selectCountry: (country: Country) => {
    // Determine which countries become AI-controlled (all non-player countries)
    const allCountries: CountryId[] = ['soviet', 'white', 'finland', 'ukraine', 'don', 'fswr', 'romania'];
    const aiCountries = allCountries.filter(countryId => countryId !== country.id);
    
    const countryMissions = initialMissions.filter(m => m.country === country.id);
    const currentRegions = get().regions;
    
    // Create initial AI states for all AI countries
    const aiStates = aiCountries.map(countryId => createInitialAIState(countryId));
    
    // Create initial army groups for all AI countries
    const aiArmyGroups = aiCountries.map(countryId => 
      createInitialAIArmyGroup(countryId, currentRegions)
    );
    
    // Create initial player army group
    const playerArmyGroup = createInitialAIArmyGroup(country.id, currentRegions);
    playerArmyGroup.id = `player-army-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Reset all game state for a fresh start
    set({
      ...initialGameState,
      selectedCountry: country,
      currentScreen: 'main',
      missions: countryMissions,
      aiStates: aiStates, // Multiple AI states
      armyGroups: [playerArmyGroup, ...aiArmyGroups], // Player + all AI army groups
      // Keep the regions and adjacency from map data (these are static)
      regions: get().regions,
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
        const id = feature.properties.regionId || feature.properties.shapeISO || feature.properties.id;
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

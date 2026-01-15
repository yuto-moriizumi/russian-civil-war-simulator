import { FactionId, Screen, Region, Adjacency, Country, GameSpeed, GameState, RegionState, AIState, MapMode } from '../../types/game';
import { initialMissions } from '../../data/gameData';
import { createInitialAIState, createInitialAIArmyGroup } from '../../ai/cpuPlayer';
import { createGameEvent, createNotification } from '../../utils/eventUtils';
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

  setSelectedCountryId: (countryId: FactionId | null) => set({ selectedCountryId: countryId }),

  setIsCountrySidebarOpen: (isOpen: boolean) => set({ isCountrySidebarOpen: isOpen }),

  dismissNotification: (notificationId: string) => {
    const { notifications } = get();
    set({ 
      notifications: notifications.filter(n => n.id !== notificationId) 
    });
  },

  navigateToScreen: (screen: Screen) => set({ currentScreen: screen }),
  
  selectCountry: (country: Country) => {
    // Determine which factions become AI-controlled (all non-player factions)
    const allFactions: FactionId[] = ['soviet', 'white', 'finland', 'ukraine'];
    const aiFactions = allFactions.filter(faction => faction !== country.id);
    
    const factionMissions = initialMissions.filter(m => m.faction === country.id);
    const currentRegions = get().regions;
    
    // Create initial AI states for all AI factions
    const aiStates = aiFactions.map(faction => createInitialAIState(faction));
    
    // Create initial army groups for all AI factions
    const aiArmyGroups = aiFactions.map(faction => 
      createInitialAIArmyGroup(faction, currentRegions)
    );
    
    // Create initial player army group
    const playerArmyGroup = createInitialAIArmyGroup(country.id, currentRegions);
    playerArmyGroup.id = `player-army-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Reset all game state for a fresh start
    set({
      ...initialGameState,
      selectedCountry: country,
      currentScreen: 'main',
      missions: factionMissions,
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
      if (mission && mission.completed && !mission.claimed) {
        const events = [...state.gameEvents];
        const notifs = [...state.notifications];
        
        const claimEvent = createGameEvent(
          'mission_claimed',
          `Mission Completed: ${mission.name}`,
          `Reward of $${mission.rewards.money} claimed for completing "${mission.name}".`,
          state.dateTime,
          state.selectedCountry?.id
        );
        events.push(claimEvent);
        notifs.push(createNotification(claimEvent, state.dateTime));
        
        if (mission.rewards.gameVictory) {
          const victoryEvent = createGameEvent(
            'game_victory',
            'Victory!',
            `${state.selectedCountry?.name} has achieved total victory in the Russian Civil War!`,
            state.dateTime,
            state.selectedCountry?.id
          );
          events.push(victoryEvent);
          notifs.push(createNotification(victoryEvent, state.dateTime));
        }
        
        return {
          money: state.money + mission.rewards.money,
          missions: state.missions.map(m =>
            m.id === missionId ? { ...m, claimed: true } : m
          ),
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
        const id = feature.properties.shapeISO;
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

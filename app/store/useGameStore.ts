import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Movement, ActiveCombat, GameEvent, ProductionQueueItem } from '../types/game';

// Internal imports
import { GameStore } from './game/types';
import { initialGameState } from './game/initialState';

// Action creators
import { createBasicActions } from './game/basicActions';
import { createTickActions } from './game/tickActions';
import { createUnitActions } from './game/unitActions';
import { createArmyGroupActions } from './game/armyGroupActions';
import { createProductionActions } from './game/productionActions';
import { createRelationshipActions } from './game/relationshipActions';

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialGameState,
      regions: {},
      adjacency: {},
      selectedRegion: null,
      selectedUnitRegion: null,
      mapDataLoaded: false,
      aiStates: [], // Initialize with empty array for multiple AI states
      isEventsModalOpen: false,
      selectedCombatId: null,
      lastSaveTime: null,
      selectedGroupId: null,
      selectedTheaterId: null,
      isProductionModalOpen: false,
      selectedCountryId: null,
      isCountrySidebarOpen: false,

      // Compose all actions from separate modules
      ...createBasicActions(set, get),
      ...createTickActions(set, get),
      ...createUnitActions(set, get),
      ...createArmyGroupActions(set, get),
      ...createProductionActions(set, get),
      ...createRelationshipActions(set, get),
    }),
    {
      name: 'russian-civil-war-save',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // We only persist the necessary game data
        currentScreen: state.currentScreen,
        selectedCountry: state.selectedCountry,
        dateTime: state.dateTime,
        money: state.money,
        missions: state.missions,
        movingUnits: state.movingUnits,
        gameEvents: state.gameEvents,
        activeCombats: state.activeCombats,
        regions: state.regions,
        aiStates: state.aiStates, // Persist AI states
        lastSaveTime: state.lastSaveTime,
        theaters: state.theaters,
        armyGroups: state.armyGroups,
        productionQueue: state.productionQueue,
        relationships: state.relationships, // Persist relationships
        mapMode: state.mapMode, // Persist map mode
      }),
      onRehydrateStorage: () => (state) => {
        // Convert date strings back to Date objects after rehydration
        if (state) {
          if (state.dateTime && typeof state.dateTime === 'string') {
            state.dateTime = new Date(state.dateTime);
          }
          if (state.lastSaveTime && typeof state.lastSaveTime === 'string') {
            state.lastSaveTime = new Date(state.lastSaveTime);
          }
          // Convert dates in movingUnits
          if (state.movingUnits) {
            state.movingUnits = state.movingUnits.map((m: Movement) => ({
              ...m,
              departureTime: new Date(m.departureTime),
              arrivalTime: new Date(m.arrivalTime),
            }));
          }
          // Convert dates in activeCombats
          if (state.activeCombats) {
            state.activeCombats = state.activeCombats.map((c: ActiveCombat) => ({
              ...c,
              startTime: new Date(c.startTime),
              lastRoundTime: new Date(c.lastRoundTime),
            }));
          }
          // Convert dates in gameEvents
          if (state.gameEvents) {
            state.gameEvents = state.gameEvents.map((e: GameEvent) => ({
              ...e,
              timestamp: new Date(e.timestamp),
            }));
          }
          // Convert dates in productionQueue
          if (state.productionQueue) {
            state.productionQueue = state.productionQueue.map((p: ProductionQueueItem) => ({
              ...p,
              startTime: new Date(p.startTime),
              completionTime: new Date(p.completionTime),
            }));
          }
          
          // ALWAYS reset to title screen on rehydration so save data doesn't skip it
          state.currentScreen = 'title';
          // Pause the game when loading
          state.isPlaying = false;
        }
      },
    }
  )
);

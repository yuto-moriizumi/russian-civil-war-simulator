import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Movement, ActiveCombat, GameEvent, ProductionQueueItem, CountryId } from '../types/game';

// Internal imports
import { GameStore } from './game/types';
import { initialGameState } from './game/initialState';
import { buildDivisionState } from '../utils/divisionState';

// Action creators
import { createBasicActions, mergeMissionsWithInitial } from './game/basicActions';
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
      selectedDivisionIds: [],
      mapDataLoaded: false,
      aiStates: [], // Initialize with empty array for multiple AI states
      selectedCombatId: null,
      selectedMovementId: null,
      lastSaveTime: null,
      selectedGroupId: null,
      selectedTheaterId: null,
      isProductionModalOpen: false,
      selectedCountryId: null,
      isCountrySidebarOpen: false,
      placementArmyGroups: [],
      isSwitchModeActive: false,

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
        divisions: state.divisions,
        missions: state.missions,
        movingUnits: state.movingUnits,
        gameEvents: state.gameEvents,
        activeCombats: state.activeCombats,
        regions: state.regions,
        aiStates: state.aiStates, // Persist AI states
        lastSaveTime: state.lastSaveTime,
        theaters: state.theaters,
        armyGroups: state.armyGroups,
        productionQueues: state.productionQueues,
        relationships: state.relationships, // Persist relationships
        mapMode: state.mapMode, // Persist map mode
        isPlayerAIEnabled: state.isPlayerAIEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        // Convert date strings back to Date objects after rehydration
        if (state) {
          state.isPlayerAIEnabled = state.isPlayerAIEnabled ?? false;
          state.missions = mergeMissionsWithInitial(state.missions ?? initialGameState.missions);
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
          // Convert dates in productionQueues
          if (state.productionQueues) {
            const countryIds = Object.keys(state.productionQueues) as CountryId[];
            for (const countryId of countryIds) {
              if (state.productionQueues[countryId]) {
                state.productionQueues[countryId] = state.productionQueues[countryId].map((p: ProductionQueueItem) => ({
                  ...p,
                  startTime: new Date(p.startTime),
                  completionTime: new Date(p.completionTime),
                }));
              }
            }
          }
          state.divisions = buildDivisionState(
            state.movingUnits ?? [],
            state.activeCombats ?? [],
            state.divisions ?? {}
          );
          
          // ALWAYS reset to title screen on rehydration so save data doesn't skip it
          state.currentScreen = 'title';
          // Pause the game when loading
          state.isPlaying = false;
        }
      },
    }
  )
);

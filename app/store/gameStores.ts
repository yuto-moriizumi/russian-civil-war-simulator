import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  Movement,
  ActiveCombat,
  GameEvent,
  ProductionQueueItem,
  CountryId,
} from '../types/game';
import {
  GameStore,
  GameUiStore,
  SimulationStore,
} from './game/types';
import { initialGameState } from './game/initialState';
import { buildDivisionState } from '../utils/divisionState';
import { buildRegionUpdate, extractRegionOwners } from '../utils/regionState';
import { createBasicActions, mergeMissionsWithInitial } from './game/basicActions';
import { createTickActions } from './game/tickActions';
import { createUnitActions } from './game/unitActions';
import { createArmyGroupActions } from './game/armyGroupActions';
import { createProductionActions } from './game/productionActions';
import { createRelationshipActions } from './game/relationshipActions';

type RehydratableSimulationStore = SimulationStore & {
  dateTime?: Date | string;
  lastSaveTime?: Date | string | null;
};

const UI_STATE_KEYS = new Set<keyof GameUiStore>([
  'currentScreen',
  'selectedRegion',
  'selectedUnitRegion',
  'selectedDivisionIds',
  'selectedCombatId',
  'selectedMovementId',
  'selectedGroupId',
  'selectedTheaterId',
  'isProductionModalOpen',
  'selectedCountryId',
  'isCountrySidebarOpen',
  'isSwitchModeActive',
  'mapMode',
]);

const initialSimulationStoreState: Omit<SimulationStore, keyof SimulationActions> = {
  selectedCountry: initialGameState.selectedCountry,
  dateTime: initialGameState.dateTime,
  isPlaying: initialGameState.isPlaying,
  gameSpeed: initialGameState.gameSpeed,
  isPlayerAIEnabled: initialGameState.isPlayerAIEnabled,
  regionOwners: initialGameState.regionOwners,
  divisions: initialGameState.divisions,
  missions: initialGameState.missions,
  movingUnits: initialGameState.movingUnits,
  gameEvents: initialGameState.gameEvents,
  notifications: initialGameState.notifications,
  activeCombats: initialGameState.activeCombats,
  theaters: initialGameState.theaters,
  armyGroups: initialGameState.armyGroups,
  productionQueues: initialGameState.productionQueues,
  relationships: initialGameState.relationships,
  scheduledEvents: initialGameState.scheduledEvents,
  countryBonuses: initialGameState.countryBonuses,
  regions: {},
  regionDefinitions: {},
  adjacency: {},
  mapDataLoaded: false,
  regionCentroids: initialGameState.regionCentroids,
  borderMidpoints: initialGameState.borderMidpoints,
  aiStates: [],
  lastSaveTime: null,
  placementArmyGroups: [],
};

const initialGameUiState: Omit<GameUiStore, keyof UiActions> = {
  currentScreen: initialGameState.currentScreen,
  selectedRegion: null,
  selectedUnitRegion: null,
  selectedDivisionIds: [],
  selectedCombatId: null,
  selectedMovementId: null,
  selectedGroupId: null,
  selectedTheaterId: null,
  isProductionModalOpen: false,
  selectedCountryId: null,
  isCountrySidebarOpen: false,
  isSwitchModeActive: false,
  mapMode: initialGameState.mapMode,
};

type SimulationActions = Pick<
  SimulationStore,
  | 'setRegions'
  | 'setAdjacency'
  | 'setBorderMidpoints'
  | 'setMapDataLoaded'
  | 'setPlayerAIEnabled'
  | 'dismissNotification'
  | 'startNewGame'
  | 'selectCountry'
  | 'togglePlay'
  | 'setGameSpeed'
  | 'tick'
  | 'createInfantry'
  | 'deployUnit'
  | 'moveUnits'
  | 'cancelMovement'
  | 'redirectMovement'
  | 'claimMission'
  | 'openMissions'
  | 'addToProductionQueue'
  | 'cancelProduction'
  | 'detectAndUpdateTheaters'
  | 'createArmyGroup'
  | 'deleteArmyGroup'
  | 'renameArmyGroup'
  | 'assignTheaterToGroup'
  | 'advanceArmyGroup'
  | 'attackArmyGroup'
  | 'defendArmyGroup'
  | 'setArmyGroupMode'
  | 'deployToArmyGroup'
  | 'addDivisionsToArmyGroup'
  | 'setRelationship'
  | 'getRelationship'
  | 'initializeCentroids'
  | 'saveGame'
  | 'loadGame'
>;

type UiActions = Pick<
  GameUiStore,
  | 'setSelectedRegion'
  | 'setSelectedUnitRegion'
  | 'selectDivisionsInRegion'
  | 'addDivisionsInRegion'
  | 'toggleDivisionInSelection'
  | 'selectDivisionsInArmyGroup'
  | 'selectSingleDivision'
  | 'clearSelectedDivisions'
  | 'setSelectedCombatId'
  | 'setSelectedMovementId'
  | 'setIsProductionModalOpen'
  | 'setSelectedCountryId'
  | 'setIsCountrySidebarOpen'
  | 'setSwitchModeActive'
  | 'navigateToScreen'
  | 'selectTheater'
  | 'selectArmyGroup'
  | 'setMapMode'
>;

function splitGameStorePatch(patch: Partial<GameStore>) {
  const simulationPatch: Partial<SimulationStore> = {};
  const uiPatch: Partial<GameUiStore> = {};

  for (const [key, value] of Object.entries(patch) as [keyof GameStore, unknown][]) {
    if (UI_STATE_KEYS.has(key as keyof GameUiStore)) {
      (uiPatch as Record<string, unknown>)[key] = value;
    } else {
      (simulationPatch as Record<string, unknown>)[key] = value;
    }
  }

  return { simulationPatch, uiPatch };
}

function getCombinedState(): GameStore {
  return {
    ...useSimulationStore.getState(),
    ...useGameUiStore.getState(),
  } as GameStore;
}

function setCombinedState(
  patch:
    | Partial<GameStore>
    | ((state: GameStore) => Partial<GameStore> | GameStore)
) {
  const currentState = getCombinedState();
  const nextPatch = typeof patch === 'function' ? patch(currentState) : patch;
  if (!nextPatch) return;

  const { simulationPatch, uiPatch } = splitGameStorePatch(nextPatch);

  if (Object.keys(simulationPatch).length > 0) {
    useSimulationStore.setState(simulationPatch);
  }
  if (Object.keys(uiPatch).length > 0) {
    useGameUiStore.setState(uiPatch);
  }
}

export function toPersistedGameState(state: SimulationStore) {
  return {
    selectedCountry: state.selectedCountry,
    dateTime: state.dateTime,
    divisions: state.divisions,
    missions: state.missions,
    movingUnits: state.movingUnits,
    gameEvents: state.gameEvents,
    activeCombats: state.activeCombats,
    regionOwners: state.regionOwners,
    aiStates: state.aiStates,
    lastSaveTime: state.lastSaveTime,
    theaters: state.theaters,
    armyGroups: state.armyGroups,
    productionQueues: state.productionQueues,
    relationships: state.relationships,
    isPlayerAIEnabled: state.isPlayerAIEnabled,
  };
}

export function rehydratePersistedGameState(state?: RehydratableSimulationStore | null) {
  if (!state) return;

  state.isPlayerAIEnabled = state.isPlayerAIEnabled ?? false;
  state.regionOwners = Object.keys(state.regionOwners ?? {}).length > 0
    ? state.regionOwners
    : extractRegionOwners(state.regions ?? {});
  const { regions } = buildRegionUpdate(state.regionDefinitions ?? {}, state.regionOwners);
  state.regions = regions;
  state.missions = mergeMissionsWithInitial(state.missions ?? initialGameState.missions);
  if (state.dateTime && typeof state.dateTime === 'string') {
    state.dateTime = new Date(state.dateTime);
  }
  if (state.lastSaveTime && typeof state.lastSaveTime === 'string') {
    state.lastSaveTime = new Date(state.lastSaveTime);
  }
  if (state.movingUnits) {
    state.movingUnits = state.movingUnits.map((movement: Movement) => ({
      ...movement,
      departureTime: new Date(movement.departureTime),
      arrivalTime: new Date(movement.arrivalTime),
    }));
  }
  if (state.activeCombats) {
    state.activeCombats = state.activeCombats.map((combat: ActiveCombat) => ({
      ...combat,
      startTime: new Date(combat.startTime),
      lastRoundTime: new Date(combat.lastRoundTime),
    }));
  }
  if (state.gameEvents) {
    state.gameEvents = state.gameEvents.map((event: GameEvent) => ({
      ...event,
      timestamp: new Date(event.timestamp),
    }));
  }
  if (state.productionQueues) {
    const countryIds = Object.keys(state.productionQueues) as CountryId[];
    for (const countryId of countryIds) {
      if (state.productionQueues[countryId]) {
        state.productionQueues[countryId] = state.productionQueues[countryId].map(
          (production: ProductionQueueItem) => ({
            ...production,
            startTime: new Date(production.startTime),
            completionTime: new Date(production.completionTime),
          })
        );
      }
    }
  }

  state.divisions = buildDivisionState(
    state.movingUnits ?? [],
    state.activeCombats ?? [],
    state.divisions ?? {}
  );
  state.isPlaying = false;
}

export const useSimulationStore = create<SimulationStore>()(
  persist(
    immer((set, get) => {
      const basicActions = createBasicActions(
        setCombinedState as never,
        getCombinedState as never
      );
      const tickActions = createTickActions(
        setCombinedState as never,
        getCombinedState as never
      );
      const unitActions = createUnitActions(
        setCombinedState as never,
        getCombinedState as never
      );
      const armyGroupActions = createArmyGroupActions(
        setCombinedState as never,
        getCombinedState as never
      );
      const productionActions = createProductionActions(
        setCombinedState as never,
        getCombinedState as never
      );
      const relationshipActions = createRelationshipActions(
        setCombinedState as never,
        getCombinedState as never
      );

      return {
        ...initialSimulationStoreState,
        setRegions: basicActions.setRegions,
        setAdjacency: basicActions.setAdjacency,
        setBorderMidpoints: basicActions.setBorderMidpoints,
        setMapDataLoaded: basicActions.setMapDataLoaded,
        setPlayerAIEnabled: basicActions.setPlayerAIEnabled,
        dismissNotification: basicActions.dismissNotification,
        startNewGame: basicActions.startNewGame,
        selectCountry: basicActions.selectCountry,
        togglePlay: basicActions.togglePlay,
        setGameSpeed: basicActions.setGameSpeed,
        claimMission: basicActions.claimMission,
        openMissions: basicActions.openMissions,
        saveGame: basicActions.saveGame,
        loadGame: basicActions.loadGame,
        initializeCentroids: basicActions.initializeCentroids,
        tick: tickActions.tick,
        createInfantry: unitActions.createInfantry,
        deployUnit: unitActions.deployUnit,
        moveUnits: unitActions.moveUnits,
        cancelMovement: unitActions.cancelMovement,
        redirectMovement: unitActions.redirectMovement,
        deployToArmyGroup: unitActions.deployToArmyGroup,
        detectAndUpdateTheaters: armyGroupActions.detectAndUpdateTheaters,
        createArmyGroup: armyGroupActions.createArmyGroup,
        deleteArmyGroup: armyGroupActions.deleteArmyGroup,
        renameArmyGroup: armyGroupActions.renameArmyGroup,
        assignTheaterToGroup: armyGroupActions.assignTheaterToGroup,
        advanceArmyGroup: armyGroupActions.advanceArmyGroup,
        attackArmyGroup: armyGroupActions.attackArmyGroup,
        defendArmyGroup: armyGroupActions.defendArmyGroup,
        setArmyGroupMode: armyGroupActions.setArmyGroupMode,
        addDivisionsToArmyGroup: armyGroupActions.addDivisionsToArmyGroup,
        addToProductionQueue: productionActions.addToProductionQueue,
        cancelProduction: productionActions.cancelProduction,
        setRelationship: relationshipActions.setRelationship,
        getRelationship: relationshipActions.getRelationship,
      };
    }),
    {
      name: 'russian-civil-war-save',
      storage: createJSONStorage(() => localStorage),
      partialize: toPersistedGameState,
      onRehydrateStorage: () => rehydratePersistedGameState,
    }
  )
);

export const useGameUiStore = create<GameUiStore>()(
  persist(
    immer((set, get) => {
      const basicActions = createBasicActions(
        setCombinedState as never,
        getCombinedState as never
      );
      const armyGroupActions = createArmyGroupActions(
        setCombinedState as never,
        getCombinedState as never
      );

      return {
        ...initialGameUiState,
        setSelectedRegion: basicActions.setSelectedRegion,
        setSelectedUnitRegion: basicActions.setSelectedUnitRegion,
        selectDivisionsInRegion: basicActions.selectDivisionsInRegion,
        addDivisionsInRegion: basicActions.addDivisionsInRegion,
        toggleDivisionInSelection: basicActions.toggleDivisionInSelection,
        selectDivisionsInArmyGroup: basicActions.selectDivisionsInArmyGroup,
        selectSingleDivision: basicActions.selectSingleDivision,
        clearSelectedDivisions: basicActions.clearSelectedDivisions,
        setSelectedCombatId: basicActions.setSelectedCombatId,
        setSelectedMovementId: basicActions.setSelectedMovementId,
        setIsProductionModalOpen: basicActions.setIsProductionModalOpen,
        setSelectedCountryId: basicActions.setSelectedCountryId,
        setIsCountrySidebarOpen: basicActions.setIsCountrySidebarOpen,
        setSwitchModeActive: basicActions.setSwitchModeActive,
        navigateToScreen: basicActions.navigateToScreen,
        selectTheater: armyGroupActions.selectTheater,
        selectArmyGroup: armyGroupActions.selectArmyGroup,
        setMapMode: basicActions.setMapMode,
      };
    }),
    {
      name: 'russian-civil-war-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ mapMode: state.mapMode }),
    }
  )
);

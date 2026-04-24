import { 
  GameState, 
  RegionState, 
  Adjacency, 
  AIState, 
  Screen, 
  Country, 
  GameSpeed,
  ArmyGroupMode,
  CountryId,
  RelationshipType,
  MapMode
} from '../../types/game';
import {
  ClientPreferencesState,
  GameUiState,
  SimulationState,
} from './stateTypes';

// ============================================================================
// SimulationStore — standalone interface
// ============================================================================

export interface SimulationStore extends SimulationState {
  // Runtime map data
  regions: RegionState;
  regionDefinitions: import('./stateTypes').MapRuntimeState['regionDefinitions'];
  adjacency: Adjacency;
  mapDataLoaded: boolean;
  regionCentroids: Record<string, [number, number]>;
  borderMidpoints: Record<string, [number, number]>;
  aiStates: AIState[];
  lastSaveTime: Date | null;
  /** Army groups derived from the map tool's unit placement editor; merged into armyGroups at game start */
  placementArmyGroups: import('../../types/game').ArmyGroup[];
  modifiers: Record<import('../../types/game').CountryId, import('../../types/game').Modifier[]>;

  // Actions
  setRegions: (regions: RegionState) => void;
  setAdjacency: (adjacency: Adjacency) => void;
  setBorderMidpoints: (midpoints: Record<string, [number, number]>) => void;
  setMapDataLoaded: (loaded: boolean) => void;
  setPlayerAIEnabled: (enabled: boolean) => void;
  dismissNotification: (notificationId: string) => void;
  startNewGame: () => void;
  selectCountry: (country: Country, isInitial?: boolean) => void;
  togglePlay: () => void;
  setGameSpeed: (speed: GameSpeed) => void;
  tick: () => void;
  createInfantry: () => void;
  deployUnit: () => void;
  moveUnits: (fromRegion: string, toRegion: string, count: number, divisionIds?: string[]) => void;
  cancelMovement: (movementId: string) => void;
  redirectMovement: (movementId: string, newDestinationRegionId: string) => void;
  claimMission: (missionId: string) => void;
  openMissions: () => void;
  addToProductionQueue: (armyGroupId: string, count?: number) => void;
  cancelProduction: (productionId: string) => void;
  createArmyGroup: (name: string, regionIds: string[], theaterId?: string | null) => void;
  deleteArmyGroup: (groupId: string) => void;
  renameArmyGroup: (groupId: string, name: string) => void;
  assignTheaterToGroup: (groupId: string, theaterId: string | null) => void;
  advanceArmyGroup: (groupId: string) => void;
  attackArmyGroup: (groupId: string) => void;
  defendArmyGroup: (groupId: string) => void;
  setArmyGroupMode: (groupId: string, mode: ArmyGroupMode) => void;
  deployToArmyGroup: (groupId: string, count?: number) => void;
  addDivisionsToArmyGroup: (groupId: string, divisionIds: string[]) => void;
  setRelationship: (fromCountry: CountryId, toCountry: CountryId, type: RelationshipType) => void;
  getRelationship: (fromCountry: CountryId, toCountry: CountryId) => RelationshipType;
  initializeCentroids: () => Promise<void>;
  saveGame: () => void;
  loadGame: (savedData: { gameState: GameState; regions: RegionState; aiStates: AIState[] }) => void;
}

// ============================================================================
// GameUiStore — standalone interface
// ============================================================================

export interface GameUiStore extends GameUiState, ClientPreferencesState {
  setSelectedRegion: (regionId: string | null) => void;
  setSelectedUnitRegion: (regionId: string | null) => void;
  selectDivisionsInRegion: (regionId: string) => void;
  addDivisionsInRegion: (regionId: string) => void;
  toggleDivisionInSelection: (divisionId: string) => void;
  selectDivisionsInArmyGroup: (groupId: string) => void;
  selectSingleDivision: (divisionId: string) => void;
  clearSelectedDivisions: () => void;
  setSelectedCombatId: (combatId: string | null) => void;
  setSelectedMovementId: (movementId: string | null) => void;
  setIsProductionModalOpen: (isOpen: boolean) => void;
  setSelectedCountryId: (countryId: CountryId | null) => void;
  setIsCountrySidebarOpen: (isOpen: boolean) => void;
  setSwitchModeActive: (active: boolean) => void;
  navigateToScreen: (screen: Screen) => void;
  selectTheater: (theaterId: string | null) => void;
  selectArmyGroup: (groupId: string | null) => void;
  setMapMode: (mode: MapMode) => void;
}

// ============================================================================
// GameStore — alias for backward compatibility
// ============================================================================

export type GameStore = SimulationStore & GameUiStore;

/**
 * The union of all state properties that simulation action creators may read/write.
 * Action creators in store/game/ are typed against this interface so they can
 * update both simulation and UI properties — splitGameStorePatch in gameStores.ts
 * routes UI keys to useGameUiStore at runtime.
 */
export type ActionsState = SimulationStore & Pick<GameUiStore,
  | 'selectedRegion'
  | 'selectedUnitRegion'
  | 'selectedDivisionIds'
  | 'selectedCombatId'
  | 'selectedMovementId'
  | 'selectedGroupId'
  | 'selectedTheaterId'
  | 'isProductionModalOpen'
  | 'selectedCountryId'
  | 'isCountrySidebarOpen'
  | 'isSwitchModeActive'
  | 'currentScreen'
  | 'mapMode'
>;

export type GameUiStateKey = keyof GameUiState | keyof ClientPreferencesState;

export type GameUiActionKey =
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
  | 'setMapMode';

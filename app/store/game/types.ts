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

export interface GameStore extends GameState {
  // Additional UI State
  regions: RegionState;
  adjacency: Adjacency;
  selectedRegion: string | null;
  selectedUnitRegion: string | null;
  /** IDs of divisions currently selected in the Division Selection Window */
  selectedDivisionIds: string[];
  mapDataLoaded: boolean;
  aiStates: AIState[]; // Multiple AI states for different countries
  isEventsModalOpen: boolean;
  selectedCombatId: string | null;
  selectedMovementId: string | null;
  lastSaveTime: Date | null;
  selectedGroupId: string | null; // Currently selected army group
  selectedTheaterId: string | null; // Currently selected theater
  isProductionModalOpen: boolean; // Production queue modal state
  selectedCountryId: CountryId | null; // Country for the country sidebar
  isCountrySidebarOpen: boolean; // Country sidebar state
  /** Army groups derived from the map tool's unit placement editor; merged into armyGroups at game start */
  placementArmyGroups: import('../../types/game').ArmyGroup[];
  /** When true, left-clicking a region switches the player to that region's controlling country */
  isSwitchModeActive: boolean;

  // Actions
  setRegions: (regions: RegionState) => void;
  setAdjacency: (adjacency: Adjacency) => void;
  setMapDataLoaded: (loaded: boolean) => void;
  setSelectedRegion: (regionId: string | null) => void;
  setSelectedUnitRegion: (regionId: string | null) => void;
  /** Select divisions by region; clears selectedRegion (mutual exclusivity) */
  selectDivisionsInRegion: (regionId: string) => void;
  /** Narrow the selection to a single division by ID (keeps selectedUnitRegion) */
  selectSingleDivision: (divisionId: string) => void;
  /** Clear all selected divisions */
  clearSelectedDivisions: () => void;
  setIsEventsModalOpen: (isOpen: boolean) => void;
  setSelectedCombatId: (combatId: string | null) => void;
  setSelectedMovementId: (movementId: string | null) => void;
  setIsProductionModalOpen: (isOpen: boolean) => void;
  setSelectedCountryId: (countryId: CountryId | null) => void;
  setIsCountrySidebarOpen: (isOpen: boolean) => void;
  setSwitchModeActive: (active: boolean) => void;
  
  // Notification Actions
  dismissNotification: (notificationId: string) => void;
  
  // Game Control Actions
  navigateToScreen: (screen: Screen) => void;
  /** Reset all game state and clear persistence, then navigate to country select. */
  startNewGame: () => void;
  selectCountry: (country: Country) => void;
  togglePlay: () => void;
  setGameSpeed: (speed: GameSpeed) => void;
  
  // Game Logic Actions
  tick: () => void;
  createInfantry: () => void;
  deployUnit: () => void;
  moveUnits: (fromRegion: string, toRegion: string, count: number) => void;
  redirectMovement: (movementId: string, newDestinationRegionId: string) => void;
  claimMission: (missionId: string) => void;
  openMissions: () => void;
  
  // Production Queue Actions
  addToProductionQueue: (armyGroupId: string, count?: number) => void;
  cancelProduction: (productionId: string) => void;
  
  // Theater Actions
  detectAndUpdateTheaters: () => void;
  selectTheater: (theaterId: string | null) => void;
  
  // Army Group Actions
  createArmyGroup: (name: string, regionIds: string[], theaterId?: string | null) => void;
  deleteArmyGroup: (groupId: string) => void;
  renameArmyGroup: (groupId: string, name: string) => void;
  assignTheaterToGroup: (groupId: string, theaterId: string | null) => void;
  selectArmyGroup: (groupId: string | null) => void;
  advanceArmyGroup: (groupId: string) => void;
  attackArmyGroup: (groupId: string) => void;
  defendArmyGroup: (groupId: string) => void;
  setArmyGroupMode: (groupId: string, mode: ArmyGroupMode) => void;
  deployToArmyGroup: (groupId: string, count?: number) => void;
  
  // Relationship Actions
  setRelationship: (fromCountry: CountryId, toCountry: CountryId, type: RelationshipType) => void;
  getRelationship: (fromCountry: CountryId, toCountry: CountryId) => RelationshipType;
  
  // Map Mode Actions
  setMapMode: (mode: MapMode) => void;
  
  // Centroid Initialization
  initializeCentroids: () => Promise<void>;
  
  // Persistence Actions
  saveGame: () => void;
  loadGame: (savedData: { gameState: GameState; regions: RegionState; aiStates: AIState[] }) => void;
}

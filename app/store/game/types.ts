import { 
  GameState, 
  RegionState, 
  Adjacency, 
  AIState, 
  Screen, 
  Country, 
  GameSpeed,
  ArmyGroupMode,
  FactionId,
  RelationshipType
} from '../../types/game';

export interface GameStore extends GameState {
  // Additional UI State
  regions: RegionState;
  adjacency: Adjacency;
  selectedRegion: string | null;
  selectedUnitRegion: string | null;
  mapDataLoaded: boolean;
  aiStates: AIState[]; // Multiple AI states for different factions
  isEventsModalOpen: boolean;
  selectedCombatId: string | null;
  lastSaveTime: Date | null;
  selectedGroupId: string | null; // Currently selected army group
  selectedTheaterId: string | null; // Currently selected theater
  isProductionModalOpen: boolean; // Production queue modal state
  selectedCountryId: FactionId | null; // Country for the country sidebar
  isCountrySidebarOpen: boolean; // Country sidebar state

  // Actions
  setRegions: (regions: RegionState) => void;
  setAdjacency: (adjacency: Adjacency) => void;
  setMapDataLoaded: (loaded: boolean) => void;
  setSelectedRegion: (regionId: string | null) => void;
  setSelectedUnitRegion: (regionId: string | null) => void;
  setIsEventsModalOpen: (isOpen: boolean) => void;
  setSelectedCombatId: (combatId: string | null) => void;
  setIsProductionModalOpen: (isOpen: boolean) => void;
  setSelectedCountryId: (countryId: FactionId | null) => void;
  setIsCountrySidebarOpen: (isOpen: boolean) => void;
  
  // Notification Actions
  dismissNotification: (notificationId: string) => void;
  
  // Game Control Actions
  navigateToScreen: (screen: Screen) => void;
  selectCountry: (country: Country) => void;
  togglePlay: () => void;
  setGameSpeed: (speed: GameSpeed) => void;
  
  // Game Logic Actions
  tick: () => void;
  createInfantry: () => void;
  deployUnit: () => void;
  moveUnits: (fromRegion: string, toRegion: string, count: number) => void;
  claimMission: (missionId: string) => void;
  openMissions: () => void;
  
  // Production Queue Actions
  addToProductionQueue: (armyGroupId: string) => void;
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
  defendArmyGroup: (groupId: string) => void;
  setArmyGroupMode: (groupId: string, mode: ArmyGroupMode) => void;
  deployToArmyGroup: (groupId: string) => void;
  
  // Relationship Actions
  setRelationship: (fromFaction: FactionId, toFaction: FactionId, type: RelationshipType) => void;
  getRelationship: (fromFaction: FactionId, toFaction: FactionId) => RelationshipType;
  
  // Persistence Actions
  saveGame: () => void;
  loadGame: (savedData: { gameState: GameState; regions: RegionState; aiStates: AIState[] }) => void;
}

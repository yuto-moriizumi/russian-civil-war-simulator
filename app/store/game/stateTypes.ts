import {
  ActiveCombat,
  AIState,
  ArmyGroup,
  Country,
  CountryBonuses,
  CountryId,
  DivisionState,
  GameEvent,
  GameSpeed,
  MapMode,
  Mission,
  Modifier,
  Movement,
  NotificationItem,
  ProductionQueueItem,
  RegionDefinitions,
  RegionOwnershipState,
  Relationship,
  ScheduledEvent,
  Screen,
  Theater,
  Adjacency,
} from '../../types/game';

export interface SimulationState {
  selectedCountry: Country | null;
  dateTime: Date;
  isPlaying: boolean;
  gameSpeed: GameSpeed;
  isPlayerAIEnabled: boolean;
  regionOwners: RegionOwnershipState;
  divisions: DivisionState;
  missions: Mission[];
  movingUnits: Movement[];
  gameEvents: GameEvent[];
  notifications: NotificationItem[];
  activeCombats: ActiveCombat[];
  theaters: Theater[];
  armyGroups: ArmyGroup[];
  productionQueues: Record<CountryId, ProductionQueueItem[]>;
  relationships: Relationship[];
  scheduledEvents: ScheduledEvent[];
  countryBonuses: Record<CountryId, CountryBonuses>;
  modifiers: Record<CountryId, Modifier[]>;
  aiStates: AIState[];
}

export interface GameUiState {
  currentScreen: Screen;
  selectedRegion: string | null;
  selectedUnitRegion: string | null;
  selectedDivisionIds: string[];
  selectedCombatId: string | null;
  selectedMovementId: string | null;
  selectedGroupId: string | null;
  selectedTheaterId: string | null;
  isProductionModalOpen: boolean;
  selectedCountryId: CountryId | null;
  isCountrySidebarOpen: boolean;
  isSwitchModeActive: boolean;
}

export interface ClientPreferencesState {
  mapMode: MapMode;
}

export interface MapRuntimeState {
  regionDefinitions: RegionDefinitions;
  adjacency: Adjacency;
  mapDataLoaded: boolean;
  regionCentroids: Record<string, [number, number]>;
  borderMidpoints: Record<string, [number, number]>;
}

export interface ClientRuntimeState
  extends GameUiState,
    ClientPreferencesState,
    MapRuntimeState {}

export interface PersistedGameState extends SimulationState, ClientPreferencesState {
  lastSaveTime: Date | null;
}

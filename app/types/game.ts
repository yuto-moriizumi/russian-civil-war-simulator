export type Screen = 'title' | 'countrySelect' | 'main' | 'mission';

// All countries in the game - automatically derived from COUNTRY_METADATA keys
// This eliminates merge conflicts when adding new countries
export type CountryId = keyof typeof import('../data/countryMetadata').COUNTRY_METADATA;

export interface Country {
  id: CountryId;
  name: string;
  flag: string;
  color: string;
  selectable?: boolean;
  coreRegions?: string[]; // List of core region IDs - controlling these doubles their command power contribution (x2)
}

// Division represents a military unit with combat stats
export interface Division {
  id: string;           // Unique identifier for this division
  name: string;         // Display name (e.g., "1st Infantry Division")
  owner: CountryId;     // Which country owns this division
  armyGroupId: string;  // Army group this division belongs to
  hp: number;           // Current hit points (0-100)
  maxHp: number;        // Maximum hit points
  attack: number;       // Attack power (damage dealt)
  defence: number;      // Defence power (damage reduction)
  regionId: string; // Current region of the division; while moving, stays as source region until arrival
}

// Normalized division state. Division objects are keyed by their stable ID.
// This is the single source of truth for all division data.
export type DivisionState = Record<string, Division>;

// Map region types
export interface Region {
  id: string;           // "RU-ALT", "UA-74" etc. (ISO format)
  name: string;         // "Altai Krai"
  countryIso3: string;  // "RUS", "UKR"
  owner: CountryId;     // Which country controls this region
}

export type RegionDefinition = Omit<Region, 'owner'>;

export type RegionDefinitions = Record<string, RegionDefinition>;

export type RegionOwnershipState = Record<string, CountryId>;

export interface Adjacency {
  [regionId: string]: string[];
}

export interface RegionState {
  [regionId: string]: Region;
}

export type GameSpeed = 1 | 2 | 8 | 32 | 1000;

// Mission availability conditions - all conditions in the array must be met (AND)
export type MissionCondition =
  | { type: 'controlRegion'; regionId: string }                    // Control a specific region
  | { type: 'controlRegions'; regionIds: string[] }                // Control all listed regions
  | { type: 'controlRegionCount'; count: number }                  // Control at least N regions
  | { type: 'controlCoreRegionCountByOverlord'; country: CountryId; count: number } // Control at least N core regions of a country directly or via puppets
  | { type: 'hasUnits'; count: number }                            // Have at least N divisions
  | { type: 'dateAfter'; date: string }                            // Date is after specified (YYYY-MM-DD)
  | { type: 'combatVictories'; count: number }                     // Win at least N combats
  | { type: 'enemyRegionCount'; country: CountryId; maxCount: number } // Enemy controls at most N regions
  | { type: 'allRegionsControlled'; regionIds: string[] }          // Control all listed regions (replaces countryIso3)
  | { type: 'theaterExists'; enemyCountry: CountryId }             // Have at least one theater facing enemy
  | { type: 'armyGroupCount'; count: number }                      // Have at least N army groups
  | { type: 'controlRegionByOverlord'; regionId: string };         // Region controlled by this country or any of its puppets

// Mission rewards interface
export interface MissionRewards {
  attackBonus?: number;           // +2, +3, +5 attack bonus
  defenceBonus?: number;           // +1, +2, +3 defence bonus
  hpBonus?: number;                // +10, +20, +30 HP bonus
  commandPowerBonus?: number;      // +3 flat command power increase
  productionSpeedBonus?: number;   // 0.15, 0.20 (15%, 20% production time reduction)
  gameVictory?: boolean;           // Triggers victory condition
  declareWar?: {                   // Declares war from the mission country
    target: CountryId;             // Country to declare war on
  };
  liberatePuppet?: {               // Liberates a country as a puppet (autonomy) state
    country: CountryId;            // Country to liberate
    spawnRegionId: string;         // Region where initial divisions spawn
    divisions: number;             // Number of divisions to spawn
  };
}

export interface Mission {
  id: string;
  country: CountryId;
  name: string;
  description: string;
  completed: boolean;
  claimed: boolean;
  rewards: MissionRewards;
  prerequisites: string[];
  available?: MissionCondition[]; // All conditions must be met (AND) for mission to auto-complete
  // position removed - computed automatically by dagre layout
}

export interface Movement {
  id: string;
  fromRegion: string;
  toRegion: string;
  /** IDs of divisions being moved. Division data lives in DivisionState. */
  divisionIds: string[];
  departureTime: Date;
  arrivalTime: Date;
  owner: CountryId;
  /** Retreat movements must only land in still-friendly territory. */
  isRetreat?: boolean;
  /**
   * When set, this movement initiated a combat at the destination region.
   * The movement's progress is paused while the referenced combat is active.
   * Once the combat completes the movement is unpaused and arrives normally.
   */
  pendingCombatId?: string;
  /**
   * For multi-step movement: the remaining hops after the current one completes.
   * Each entry is a region ID. When the movement arrives at `toRegion` and this
   * array is non-empty, a new movement is automatically dispatched for the next
   * hop rather than landing the divisions in the intermediate region.
   * The array should NOT include `toRegion` itself — it starts from the hop after.
   */
  remainingPath?: string[];
  /**
   * The ultimate destination region for a multi-step movement (the last hop).
   * Used for display purposes so the player can see where divisions are ultimately headed.
   */
  finalDestination?: string;
}

// Production queue item - represents a division being produced
export interface ProductionQueueItem {
  id: string;                       // Unique identifier
  divisionName: string;             // Name of the division being produced
  owner: CountryId;                 // Which country is producing this
  startTime: Date;                  // When production started
  completionTime: Date;             // When production will complete (24 game hours)
  targetRegionId: string | null;    // Where the division will deploy (null = reserves)
  armyGroupId: string;              // Which army group requested this division
}

export type GameEventType = 
  | 'combat_victory'
  | 'combat_defeat'
  | 'region_captured'
  | 'region_lost'
  | 'unit_created'
  | 'unit_deployed'
  | 'division_destroyed'
  | 'production_started'
  | 'production_completed'
  | 'mission_completed'
  | 'mission_claimed'
  | 'war_declared'
  | 'game_victory';

export interface GameEvent {
  id: string;
  type: GameEventType;
  timestamp: Date;
  title: string;
  description: string;
  country?: CountryId;
  regionId?: string;
}

export interface NotificationItem extends GameEvent {
  expiresAt: Date; // Game time when this notification should be dismissed
}

// Map mode types for different map visualizations
export type MapMode = 'country' | 'diplomacy' | 'value';

// Relationship types between countries
export type RelationshipType = 'neutral' | 'military_access' | 'war' | 'autonomy';

// Represents a diplomatic/military relationship between two countries
export interface Relationship {
  fromCountry: CountryId;  // The country granting access/declaring war
  toCountry: CountryId;    // The country receiving access/being declared war on
  type: RelationshipType;  // Type of relationship
}

// Scheduled events that trigger on specific dates
export interface ScheduledEventAction {
  type:
    | 'transferRegion'
    | 'transferRegionIfOwnedByOrPuppetOf'
    | 'declareWar'
    | 'spawnDivision'
    | 'setRelationship'
    | 'removeRelationship'
    | 'endWarWithCountryAndPuppets'
    | 'transferCoreRegionsFromCountry'
    | 'transferCoreRegionsIfOwnedByOrPuppetOf'
    | 'transferAllRegionsFromCountry'
    | 'mergeCountry';
  // For transferRegion / transferRegionIfOwnedByOrPuppetOf / transferCoreRegionsFromCountry
  // / transferCoreRegionsIfOwnedByOrPuppetOf / transferAllRegionsFromCountry / mergeCountry
  regionId?: string;
  newOwner?: CountryId;
  // For transferRegionIfOwnedByOrPuppetOf: only transfer if current owner is this country or its puppet
  // For transferCoreRegionsFromCountry: transfer all core regions of newOwner owned by fromCountry
  // For transferCoreRegionsIfOwnedByOrPuppetOf: transfer all core regions of newOwner owned by overlordCountry or its puppets
  // For transferAllRegionsFromCountry: transfer all regions currently owned by fromCountry to newOwner
  // For mergeCountry: transfer all regions and divisions from fromCountry to newOwner
  // For declareWar: country declaring war
  fromCountry?: CountryId;
  // For transferRegionIfOwnedByOrPuppetOf / transferCoreRegionsIfOwnedByOrPuppetOf
  overlordCountry?: CountryId;
  // For declareWar / setRelationship: target country
  toCountry?: CountryId;
  // For setRelationship
  relationshipType?: RelationshipType;
  // For endWarWithCountryAndPuppets
  masterCountry?: CountryId;
  enemyCountry?: CountryId;
  // For spawnDivision
  owner?: CountryId;
  armyGroupName?: string;
  count?: number;
}

export type ScheduledEventCondition =
  | {
    type: 'atLeastOneRegionOwnedByOrPuppetOf' | 'atLeastOneRegionNotOwnedByOrPuppetOf' | 'eventTriggered';
    regions?: string[];   // region IDs to check
    country?: CountryId;  // overlord country
    eventId?: string;     // event ID to check (for eventTriggered type)
  }
  | {
    type: 'date';
    date: string;         // Trigger only on this date (YYYY-MM-DD)
  }
  | {
    type: 'dateReached';
    date: string;         // Trigger on or after this date (YYYY-MM-DD)
  }
  | {
    type: 'and' | 'or';
    conditions: ScheduledEventCondition[];
  };

export interface ScheduledEvent {
  id: string;
  title: string;
  description: string;
  conditions?: ScheduledEventCondition[]; // Conditions to check; supports nested AND/OR groups
  actions: ScheduledEventAction[];
  triggered: boolean; // Track if event has already been triggered
}

// Country bonuses from completed missions
export interface CountryBonuses {
  attackBonus: number;               // Total attack bonus from missions
  defenceBonus: number;              // Total defence bonus from missions
  hpBonus: number;                   // Total HP bonus from missions
  maxHpBonus: number;                // Total max HP bonus from missions
  commandPowerBonus: number;         // Total command power bonus from missions
  productionSpeedMultiplier: number; // Production speed multiplier (1.0 = normal, 0.8 = 20% faster)
}

// Modifier item types — each item within a modifier
export type ModifierItemType = 'cp_modify';

export interface ModifierItem {
  kind: ModifierItemType;
  factor: number; // Multiplier applied to the relevant calculation
}

// A modifier groups one or more modifier items under a display title
export interface Modifier {
  title: string;
  items: ModifierItem[];
}

export interface GameState {
  currentScreen: Screen;
  selectedCountry: Country | null;
  dateTime: Date;
  isPlaying: boolean;
  gameSpeed: GameSpeed;
  isPlayerAIEnabled: boolean;
  regionOwners: RegionOwnershipState; // Canonical dynamic region ownership, keyed by region ID
  divisions: DivisionState; // Canonical division state, keyed by division ID
  missions: Mission[];
  movingUnits: Movement[];
  gameEvents: GameEvent[];
  notifications: NotificationItem[]; // Active notifications (auto-dismiss after 6 game hours)
  activeCombats: ActiveCombat[]; // Ongoing battles
  theaters: Theater[]; // Auto-detected theaters for the player
  armyGroups: ArmyGroup[]; // Player's army groups for bulk movement
  productionQueues: Record<CountryId, ProductionQueueItem[]>; // Per-country production queues
  relationships: Relationship[]; // Diplomatic/military relationships between countries
  mapMode: MapMode; // Current map visualization mode
  regionCentroids: Record<string, [number, number]>; // Region centroids for distance calculations [longitude, latitude]
  borderMidpoints: Record<string, [number, number]>; // Pre-computed midpoints of shared borders between adjacent regions [longitude, latitude]
  scheduledEvents: ScheduledEvent[]; // Scheduled historical events
  countryBonuses: Record<CountryId, CountryBonuses>; // Per-country bonuses from claimed missions
  modifiers: Record<CountryId, Modifier[]>; // Per-country modifiers (like HOI4 ideas)
}

// AI State for CPU-controlled countries
export interface AIState {
  countryId: CountryId;
}

// Combat result for battle resolution
export interface CombatResult {
  attackerDivisions: Division[];    // Surviving attacker divisions
  defenderDivisions: Division[];    // Surviving defender divisions
  attackerCasualties: number;       // Number of attacker divisions destroyed
  defenderCasualties: number;       // Number of defender divisions destroyed
  regionCaptured: boolean;          // Whether the attacker captured the region
}

// Active combat - represents an ongoing battle that resolves over time
// Combat occurs on the border between attackerRegionId and defenderRegionId
export interface ActiveCombat {
  id: string;                       // Unique combat ID
  attackerRegionId: string;         // Region the attacker is coming FROM
  defenderRegionId: string;         // Region being defended (the attacked tile)
  attackerRegionName: string;       // Display name of attacker's region
  defenderRegionName: string;       // Display name of defender's region
  attackerCountry: CountryId;       // Who is attacking
  defenderCountry: CountryId;       // Who is defending
  /** IDs of current attacker divisions. HP and stats live in DivisionState. */
  attackerDivisionIds: string[];
  /** IDs of current defender divisions. HP and stats live in DivisionState. */
  defenderDivisionIds: string[];
  initialAttackerCount: number;     // Starting attacker division count
  initialDefenderCount: number;     // Starting defender division count
  initialAttackerHp: number;        // Starting total HP of attackers
  initialDefenderHp: number;        // Starting total HP of defenders
  currentRound: number;             // Current combat round
  startTime: Date;                  // When combat started
  lastRoundTime: Date;              // When the last round was resolved
  roundIntervalHours: number;       // Hours between rounds
  isComplete: boolean;              // Whether combat has concluded
  victor: CountryId | null;         // Who won (null if ongoing)
}

// Story/Narrative Event for master data (introduction, victory screens, etc.)
export interface StoryEvent {
  id: string;
  title: string;
  text: string;
}

// Theater - automatically detected collection of frontline regions facing an enemy
export interface Theater {
  id: string;                      // Unique identifier
  name: string;                    // Auto-generated name (e.g., "Western Theater", "Finnish Front")
  frontlineRegions: string[];      // Player-owned regions adjacent to enemies
  enemyCountry: CountryId;         // Primary enemy country this theater faces
  owner: CountryId;                // Which country owns this theater
}

// Army Group operational mode for automatic unit control
export type ArmyGroupMode = 'none' | 'advance' | 'defend';

// Army Group for coordinated unit movement (now assigned to a theater)
export interface ArmyGroup {
  id: string;                      // Unique identifier
  name: string;                    // Display name (e.g., "Northern Front")
  regionIds: string[];             // Regions assigned to this group
  color: string;                   // Visual identifier (#hex color)
  owner: CountryId;                // Which country owns this group
  theaterId: string | null;        // Theater this group belongs to (if any)
  mode: ArmyGroupMode;             // Operational mode: none, advance (auto-attack), or defend (auto-defend)
}

// Game API interface for programmatic control (useful for AI agents and testing)
export interface GameAPI {
  // Region selection
  selectRegion: (regionId: string | null) => void;
  getSelectedRegion: () => string | null;
  getRegions: () => RegionState;
  // Unit selection and movement
  selectUnits: (regionId: string | null) => void;
  getSelectedUnitRegion: () => string | null;
  moveSelectedUnits: (toRegionId: string, count?: number) => boolean;
  // In-transit (moving) unit selection
  selectMovement: (movementId: string | null) => void;
  getSelectedMovementId: () => string | null;
  redirectMovement: (movementId: string, newDestinationRegionId: string) => void;
  // Helper methods
  getAdjacentRegions: (regionId: string) => string[];
  getMovingUnits: () => Movement[];
  getActiveCombats: () => ActiveCombat[];
  // Army Group methods
  createArmyGroup: (name: string, regionIds: string[], theaterId?: string | null) => void;
  getArmyGroups: () => ArmyGroup[];
  advanceArmyGroup: (groupId: string) => void;
  defendArmyGroup: (groupId: string) => void;
  setArmyGroupMode: (groupId: string, mode: ArmyGroupMode) => void;
  deployToArmyGroup: (groupId: string, count?: number) => void;
  deleteArmyGroup: (groupId: string) => void;
  // Theater methods
  getTheaters: () => Theater[];
  selectTheater: (theaterId: string) => void;
  // Production queue methods
  addToProductionQueue: (armyGroupId: string, count?: number) => boolean;
  getProductionQueue: (countryId?: CountryId) => ProductionQueueItem[];
  cancelProduction: (productionId: string) => boolean;
  // Relationship methods
  getRelationships: () => Relationship[];
  setRelationship: (fromCountry: CountryId, toCountry: CountryId, type: RelationshipType) => void;
  getRelationship: (fromCountry: CountryId, toCountry: CountryId) => RelationshipType;
  // Country sidebar
  openCountrySidebar: (countryId: CountryId | null) => void;
  // Map mode
  setMapMode: (mode: MapMode) => void;
  getMapMode: () => MapMode;
  // Development / testing helper – directly replaces the regions state
  __setRegions: (regions: RegionState) => void;
}

// Declare global window.gameAPI
declare global {
  interface Window {
    gameAPI?: GameAPI;
  }
}

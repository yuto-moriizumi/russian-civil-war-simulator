export type Screen = 'title' | 'countrySelect' | 'main' | 'mission';

// Player-selectable factions (subset of FactionId)
export type CountryId = 'soviet' | 'white' | 'finland' | 'ukraine' | 'don';

// Faction types for map control
export type FactionId = 'soviet' | 'white' | 'finland' | 'ukraine' | 'don' | 'neutral' | 'foreign';

export interface Country {
  id: CountryId;
  name: string;
  flag: string;
  color: string;
}

// Division represents a military unit with combat stats
export interface Division {
  id: string;           // Unique identifier for this division
  name: string;         // Display name (e.g., "1st Infantry Division")
  owner: FactionId;     // Which faction owns this division
  armyGroupId: string;  // Army group this division belongs to
  hp: number;           // Current hit points (0-100)
  maxHp: number;        // Maximum hit points
  attack: number;       // Attack power (damage dealt)
  defence: number;      // Defence power (damage reduction)
}

// Map region types
export interface Region {
  id: string;           // "RU-ALT", "UA-74" etc. (ISO format)
  name: string;         // "Altai Krai"
  countryIso3: string;  // "RUS", "UKR"
  owner: FactionId;     // Which faction controls this region
  divisions: Division[]; // Divisions stationed in this region
  value: number;        // Economic value/weight for income (default 1, capitals higher)
}

export interface Adjacency {
  [regionId: string]: string[];
}

export interface RegionState {
  [regionId: string]: Region;
}

export type GameSpeed = 1 | 2 | 4 | 16 | 64;

// Mission availability conditions - all conditions in the array must be met (AND)
export type MissionCondition =
  | { type: 'controlRegion'; regionId: string }                    // Control a specific region
  | { type: 'controlRegions'; regionIds: string[] }                // Control all listed regions
  | { type: 'controlRegionCount'; count: number }                  // Control at least N regions
  | { type: 'hasUnits'; count: number }                            // Have at least N divisions
  | { type: 'dateAfter'; date: string }                            // Date is after specified (YYYY-MM-DD)
  | { type: 'combatVictories'; count: number }                     // Win at least N combats
  | { type: 'enemyRegionCount'; faction: FactionId; maxCount: number } // Enemy controls at most N regions
  | { type: 'allRegionsControlled'; countryIso3: string }          // Control all regions in a country
  | { type: 'theaterExists'; enemyFaction: FactionId }             // Have at least one theater facing enemy
  | { type: 'armyGroupCount'; count: number };                     // Have at least N army groups

// Mission rewards interface
export interface MissionRewards {
  attackBonus?: number;           // +2, +3, +5 attack bonus
  defenceBonus?: number;           // +1, +2, +3 defence bonus
  hpBonus?: number;                // +10, +20, +30 HP bonus
  commandPowerBonus?: number;      // +3 flat command power increase
  productionSpeedBonus?: number;   // 0.15, 0.20 (15%, 20% production time reduction)
  gameVictory?: boolean;           // Triggers victory condition
}

export interface Mission {
  id: string;
  faction: CountryId;
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
  divisions: Division[]; // Divisions being moved
  departureTime: Date;
  arrivalTime: Date;
  owner: FactionId;
}

// Production queue item - represents a division being produced
export interface ProductionQueueItem {
  id: string;                       // Unique identifier
  divisionName: string;             // Name of the division being produced
  owner: FactionId;                 // Which faction is producing this
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
  faction?: FactionId;
  regionId?: string;
}

export interface NotificationItem extends GameEvent {
  expiresAt: Date; // Game time when this notification should be dismissed
}

// Map mode types for different map visualizations
export type MapMode = 'country' | 'diplomacy' | 'value';

// Relationship types between countries
export type RelationshipType = 'neutral' | 'military_access' | 'war' | 'autonomy';

// Represents a diplomatic/military relationship between two factions
export interface Relationship {
  fromFaction: FactionId;  // The faction granting access/declaring war
  toFaction: FactionId;    // The faction receiving access/being declared war on
  type: RelationshipType;  // Type of relationship
}

// Scheduled events that trigger on specific dates
export interface ScheduledEventAction {
  type: 'transferRegion' | 'declareWar';
  // For transferRegion
  regionId?: string;
  newOwner?: FactionId;
  // For declareWar
  fromFaction?: FactionId;
  toFaction?: FactionId;
}

export interface ScheduledEvent {
  id: string;
  date: string; // YYYY-MM-DD format
  title: string;
  description: string;
  actions: ScheduledEventAction[];
  triggered: boolean; // Track if event has already been triggered
}

// Faction bonuses from completed missions
export interface FactionBonuses {
  attackBonus: number;               // Total attack bonus from missions
  defenceBonus: number;              // Total defence bonus from missions
  hpBonus: number;                   // Total HP bonus from missions
  maxHpBonus: number;                // Total max HP bonus from missions
  commandPowerBonus: number;         // Total command power bonus from missions
  productionSpeedMultiplier: number; // Production speed multiplier (1.0 = normal, 0.8 = 20% faster)
}

export interface GameState {
  currentScreen: Screen;
  selectedCountry: Country | null;
  dateTime: Date;
  isPlaying: boolean;
  gameSpeed: GameSpeed;
  missions: Mission[];
  movingUnits: Movement[];
  gameEvents: GameEvent[];
  notifications: NotificationItem[]; // Active notifications (auto-dismiss after 6 game hours)
  activeCombats: ActiveCombat[]; // Ongoing battles
  theaters: Theater[]; // Auto-detected theaters for the player
  armyGroups: ArmyGroup[]; // Player's army groups for bulk movement
  productionQueues: Record<FactionId, ProductionQueueItem[]>; // Per-faction production queues
  relationships: Relationship[]; // Diplomatic/military relationships between factions
  mapMode: MapMode; // Current map visualization mode
  regionCentroids: Record<string, [number, number]>; // Region centroids for distance calculations [longitude, latitude]
  scheduledEvents: ScheduledEvent[]; // Scheduled historical events
  factionBonuses: Record<FactionId, FactionBonuses>; // Per-faction bonuses from claimed missions
}

// AI State for CPU-controlled factions
export interface AIState {
  factionId: FactionId;
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
export interface ActiveCombat {
  id: string;                       // Unique combat ID
  regionId: string;                 // Where the combat is taking place
  regionName: string;               // Display name of the region
  attackerFaction: FactionId;       // Who is attacking
  defenderFaction: FactionId;       // Who is defending
  attackerDivisions: Division[];    // Current attacker divisions
  defenderDivisions: Division[];    // Current defender divisions
  initialAttackerCount: number;     // Starting attacker division count
  initialDefenderCount: number;     // Starting defender division count
  initialAttackerHp: number;        // Starting total HP of attackers
  initialDefenderHp: number;        // Starting total HP of defenders
  currentRound: number;             // Current combat round
  startTime: Date;                  // When combat started
  lastRoundTime: Date;              // When the last round was resolved
  roundIntervalHours: number;       // Hours between rounds
  isComplete: boolean;              // Whether combat has concluded
  victor: FactionId | null;         // Who won (null if ongoing)
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
  enemyFaction: FactionId;         // Primary enemy faction this theater faces
  owner: FactionId;                // Which faction owns this theater
}

// Army Group operational mode for automatic unit control
export type ArmyGroupMode = 'none' | 'advance' | 'defend';

// Army Group for coordinated unit movement (now assigned to a theater)
export interface ArmyGroup {
  id: string;                      // Unique identifier
  name: string;                    // Display name (e.g., "Northern Front")
  regionIds: string[];             // Regions assigned to this group
  color: string;                   // Visual identifier (#hex color)
  owner: FactionId;                // Which faction owns this group
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
  getProductionQueue: (factionId?: FactionId) => ProductionQueueItem[];
  cancelProduction: (productionId: string) => boolean;
  // Relationship methods
  getRelationships: () => Relationship[];
  setRelationship: (fromFaction: FactionId, toFaction: FactionId, type: RelationshipType) => void;
  getRelationship: (fromFaction: FactionId, toFaction: FactionId) => RelationshipType;
  // Country sidebar
  openCountrySidebar: (factionId: FactionId | null) => void;
  // Map mode
  setMapMode: (mode: MapMode) => void;
  getMapMode: () => MapMode;
}

// Declare global window.gameAPI
declare global {
  interface Window {
    gameAPI?: GameAPI;
  }
}

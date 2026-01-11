export type Screen = 'title' | 'countrySelect' | 'main' | 'mission';

// Player-selectable factions (subset of FactionId)
export type CountryId = 'soviet' | 'white';

// Faction types for map control
export type FactionId = 'soviet' | 'white' | 'neutral' | 'foreign';

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

export type GameSpeed = 1 | 2 | 3 | 4 | 5;

export interface Mission {
  id: string;
  faction: CountryId;
  name: string;
  description: string;
  completed: boolean;
  claimed: boolean;
  rewards: {
    money: number;
    gameVictory?: boolean;
  };
  prerequisites: string[];
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

export type GameEventType = 
  | 'combat_victory'
  | 'combat_defeat'
  | 'region_captured'
  | 'region_lost'
  | 'unit_created'
  | 'unit_deployed'
  | 'mission_completed'
  | 'mission_claimed'
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

export interface GameState {
  currentScreen: Screen;
  selectedCountry: Country | null;
  dateTime: Date;
  isPlaying: boolean;
  gameSpeed: GameSpeed;
  money: number;
  income: number;
  reserveDivisions: Division[]; // Divisions in reserve (not yet deployed)
  missions: Mission[];
  movingUnits: Movement[];
  gameEvents: GameEvent[];
  activeCombats: ActiveCombat[]; // Ongoing battles
}

// AI State for CPU-controlled factions
export interface AIState {
  factionId: FactionId;
  money: number;
  income: number;
  reserveDivisions: Division[]; // Divisions in reserve (not deployed)
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
  currentRound: number;             // Current combat round (1-10)
  maxRounds: number;                // Maximum rounds before stalemate
  startTime: Date;                  // When combat started
  lastRoundTime: Date;              // When the last round was resolved
  roundIntervalHours: number;       // Hours between rounds
  isComplete: boolean;              // Whether combat has concluded
  victor: FactionId | null;         // Who won (null if ongoing or stalemate)
}

// Story/Narrative Event for master data (introduction, victory screens, etc.)
export interface StoryEvent {
  id: string;
  title: string;
  text: string;
}

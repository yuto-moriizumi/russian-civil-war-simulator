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

// Map region types
export interface Region {
  id: string;           // "RU-ALT", "UA-74" etc. (ISO format)
  name: string;         // "Altai Krai"
  countryIso3: string;  // "RUS", "UKR"
  owner: FactionId;     // Which faction controls this region
  units: number;        // Number of units stationed
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
  name: string;
  description: string;
  completed: boolean;
  claimed: boolean;
  rewards: {
    money: number;
  };
  prerequisites: string[];
  position: { x: number; y: number };
}

export interface Movement {
  id: string;
  fromRegion: string;
  toRegion: string;
  count: number;
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
  | 'mission_claimed';

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
  infantryUnits: number;
  missions: Mission[];
  movingUnits: Movement[];
  gameEvents: GameEvent[];
}

// AI State for CPU-controlled factions
export interface AIState {
  factionId: FactionId;
  money: number;
  income: number;
  infantryUnits: number; // Units in reserve (not deployed)
}

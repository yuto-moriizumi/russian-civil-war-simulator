import {
  GameState,
  RegionState,
  AIState,
  Movement,
  GameEvent,
  Screen,
  Country,
  GameSpeed,
  Mission,
  FactionId,
  GameEventType,
} from '../types/game';

const STORAGE_KEY = 'rcw-save';
const SAVE_VERSION = 1;

// Serialized types (Date objects converted to ISO strings)
interface SerializedMovement {
  id: string;
  fromRegion: string;
  toRegion: string;
  count: number;
  departureTime: string;
  arrivalTime: string;
  owner: FactionId;
}

interface SerializedGameEvent {
  id: string;
  type: GameEventType;
  timestamp: string;
  title: string;
  description: string;
  faction?: FactionId;
  regionId?: string;
}

interface SerializedGameState {
  currentScreen: Screen;
  selectedCountry: Country | null;
  dateTime: string;
  isPlaying: boolean;
  gameSpeed: GameSpeed;
  money: number;
  income: number;
  infantryUnits: number;
  missions: Mission[];
  movingUnits: SerializedMovement[];
  gameEvents: SerializedGameEvent[];
}

interface SaveData {
  version: number;
  savedAt: string;
  gameState: SerializedGameState;
  regions: RegionState;
  aiState: AIState | null;
}

// Serialize GameState (convert Date objects to ISO strings)
function serializeGameState(state: GameState): SerializedGameState {
  return {
    ...state,
    dateTime: state.dateTime.toISOString(),
    movingUnits: state.movingUnits.map((m) => ({
      ...m,
      departureTime: m.departureTime.toISOString(),
      arrivalTime: m.arrivalTime.toISOString(),
    })),
    gameEvents: state.gameEvents.map((e) => ({
      ...e,
      timestamp: e.timestamp.toISOString(),
    })),
  };
}

// Deserialize GameState (convert ISO strings back to Date objects)
function deserializeGameState(data: SerializedGameState): GameState {
  return {
    ...data,
    dateTime: new Date(data.dateTime),
    movingUnits: data.movingUnits.map((m) => ({
      ...m,
      departureTime: new Date(m.departureTime),
      arrivalTime: new Date(m.arrivalTime),
    })),
    gameEvents: data.gameEvents.map((e) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    })),
  };
}

// Save game to localStorage
export function saveGame(
  gameState: GameState,
  regions: RegionState,
  aiState: AIState | null
): boolean {
  try {
    const saveData: SaveData = {
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      gameState: serializeGameState(gameState),
      regions,
      aiState,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    return true;
  } catch (error) {
    console.error('Failed to save game:', error);
    return false;
  }
}

// Load game from localStorage
export function loadGame(): {
  gameState: GameState;
  regions: RegionState;
  aiState: AIState | null;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data: SaveData = JSON.parse(raw);

    // Version check (for future migrations)
    if (data.version !== SAVE_VERSION) {
      console.warn(`Save version mismatch: expected ${SAVE_VERSION}, got ${data.version}`);
      // For now, just try to load anyway
    }

    // Validate required fields
    if (!data.gameState || !data.regions) {
      console.error('Invalid save data structure');
      return null;
    }

    return {
      gameState: deserializeGameState(data.gameState),
      regions: data.regions,
      aiState: data.aiState,
    };
  } catch (error) {
    console.error('Failed to load game:', error);
    return null;
  }
}

// Check if a save game exists
export function hasSaveGame(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

// Delete saved game
export function deleteSaveGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to delete save:', error);
  }
}

// Get save info for display (without loading full state)
export function getSaveInfo(): { savedAt: Date; gameDate: Date } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data: SaveData = JSON.parse(raw);
    return {
      savedAt: new Date(data.savedAt),
      gameDate: new Date(data.gameState.dateTime),
    };
  } catch {
    return null;
  }
}

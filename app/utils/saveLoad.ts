import {
  GameState,
  RegionState,
  AIState,
  Screen,
  Country,
  GameSpeed,
  Mission,
  FactionId,
  GameEventType,
  Division,
  ArmyGroup,
  Theater,
  Relationship,
  MapMode,
} from '../types/game';

const STORAGE_KEY = 'rcw-save';
const SAVE_VERSION = 4; // Bumped version for army group assignment (divisions now require armyGroupId)

// Serialized types (Date objects converted to ISO strings)
interface SerializedMovement {
  id: string;
  fromRegion: string;
  toRegion: string;
  divisions: Division[];
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

interface SerializedNotificationItem {
  id: string;
  type: GameEventType;
  timestamp: string;
  title: string;
  description: string;
  faction?: FactionId;
  regionId?: string;
  expiresAt: string;
}

interface SerializedActiveCombat {
  id: string;
  regionId: string;
  regionName: string;
  attackerFaction: FactionId;
  defenderFaction: FactionId;
  attackerDivisions: Division[];
  defenderDivisions: Division[];
  initialAttackerCount: number;
  initialDefenderCount: number;
  initialAttackerHp: number;
  initialDefenderHp: number;
  currentRound: number;
  startTime: string;
  lastRoundTime: string;
  roundIntervalHours: number;
  isComplete: boolean;
  victor: FactionId | null;
}

interface SerializedProductionQueueItem {
  id: string;
  divisionName: string;
  owner: FactionId;
  startTime: string;
  completionTime: string;
  targetRegionId: string | null;
  armyGroupId: string;
}

interface SerializedGameState {
  currentScreen: Screen;
  selectedCountry: Country | null;
  dateTime: string;
  isPlaying: boolean;
  gameSpeed: GameSpeed;
  money: number;
  income: number;
  missions: Mission[];
  movingUnits: SerializedMovement[];
  gameEvents: SerializedGameEvent[];
  notifications: SerializedNotificationItem[];
  activeCombats: SerializedActiveCombat[];
  armyGroups: ArmyGroup[];
  theaters: Theater[];
  productionQueue: SerializedProductionQueueItem[];
  relationships: Relationship[];
  mapMode: MapMode;
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
    notifications: state.notifications.map((n) => ({
      ...n,
      timestamp: n.timestamp.toISOString(),
      expiresAt: n.expiresAt.toISOString(),
    })),
    activeCombats: state.activeCombats.map((c) => ({
      ...c,
      startTime: c.startTime.toISOString(),
      lastRoundTime: c.lastRoundTime.toISOString(),
    })),
    productionQueue: state.productionQueue.map((p) => ({
      ...p,
      startTime: p.startTime.toISOString(),
      completionTime: p.completionTime.toISOString(),
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
    notifications: (data.notifications || []).map((n) => ({
      ...n,
      timestamp: new Date(n.timestamp),
      expiresAt: new Date(n.expiresAt),
    })),
    activeCombats: (data.activeCombats || []).map((c) => ({
      ...c,
      startTime: new Date(c.startTime),
      lastRoundTime: new Date(c.lastRoundTime),
    })),
    productionQueue: (data.productionQueue || []).map((p) => ({
      id: p.id,
      divisionName: p.divisionName,
      owner: p.owner,
      startTime: new Date(p.startTime),
      completionTime: new Date(p.completionTime),
      targetRegionId: p.targetRegionId,
      armyGroupId: p.armyGroupId,
    })),
    relationships: data.relationships || [], // Default to empty array if not present
    mapMode: data.mapMode || 'country', // Default to country map mode
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
      // Old saves are incompatible with new system
      if (data.version < 4) {
        console.warn('Old save format detected (pre-army-group-assignment), clearing incompatible save');
        deleteSaveGame();
        return null;
      }
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

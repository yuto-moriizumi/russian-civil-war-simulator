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
  ProductionQueueItem,
  Division,
  ArmyGroup,
  Theater,
  Relationship,
  MapMode,
} from '../types/game';
import { getInitialFactionBonuses } from './bonusCalculator';

const STORAGE_KEY = 'rcw-save';
const SAVE_VERSION = 6; // Bumped version for factionBonuses

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
  productionQueues: Record<FactionId, SerializedProductionQueueItem[]>;
  productionQueue?: SerializedProductionQueueItem[]; // Legacy format for backward compatibility
  relationships: Relationship[];
  mapMode: MapMode;
  factionBonuses?: GameState['factionBonuses']; // Optional for backward compatibility
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
  // Convert per-faction queues to serialized format
  const serializedQueues: Record<FactionId, SerializedProductionQueueItem[]> = {} as Record<FactionId, SerializedProductionQueueItem[]>;
  const factionIds = Object.keys(state.productionQueues) as FactionId[];
  
  for (const factionId of factionIds) {
    serializedQueues[factionId] = (state.productionQueues[factionId] || []).map((p) => ({
      ...p,
      startTime: p.startTime.toISOString(),
      completionTime: p.completionTime.toISOString(),
    }));
  }
  
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
    productionQueues: serializedQueues,
  };
}

// Deserialize GameState (convert ISO strings back to Date objects)
function deserializeGameState(data: SerializedGameState): GameState {
  // Handle backward compatibility: convert old productionQueue to new productionQueues format
  let productionQueues: Record<FactionId, ProductionQueueItem[]>;
  
  if (data.productionQueues) {
    // New format: per-faction queues
    productionQueues = {} as Record<FactionId, ProductionQueueItem[]>;
    const factionIds = Object.keys(data.productionQueues) as FactionId[];
    
    for (const factionId of factionIds) {
      productionQueues[factionId] = (data.productionQueues[factionId] || []).map((p) => ({
        id: p.id,
        divisionName: p.divisionName,
        owner: p.owner,
        startTime: new Date(p.startTime),
        completionTime: new Date(p.completionTime),
        targetRegionId: p.targetRegionId,
        armyGroupId: p.armyGroupId,
      }));
    }
  } else if (data.productionQueue) {
    // Legacy format: migrate from single queue to per-faction queues
    console.log('Migrating legacy production queue format to per-faction queues');
    productionQueues = {
      soviet: [],
      white: [],
      finland: [],
      ukraine: [],
      don: [],
      neutral: [],
      foreign: [],
    };
    
    // Sort legacy queue items into faction-specific queues
    for (const item of data.productionQueue) {
      const deserialized = {
        id: item.id,
        divisionName: item.divisionName,
        owner: item.owner,
        startTime: new Date(item.startTime),
        completionTime: new Date(item.completionTime),
        targetRegionId: item.targetRegionId,
        armyGroupId: item.armyGroupId,
      };
      
      if (!productionQueues[item.owner]) {
        productionQueues[item.owner] = [];
      }
      productionQueues[item.owner].push(deserialized);
    }
  } else {
    // No production queue data, initialize empty
    productionQueues = {
      soviet: [],
      white: [],
      finland: [],
      ukraine: [],
      don: [],
      neutral: [],
      foreign: [],
    };
  }
  
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
    productionQueues,
    relationships: data.relationships || [], // Default to empty array if not present
    mapMode: data.mapMode || 'country', // Default to country map mode
    regionCentroids: {}, // Will be re-loaded from map data
    factionBonuses: data.factionBonuses || {
      soviet: getInitialFactionBonuses(),
      white: getInitialFactionBonuses(),
      finland: getInitialFactionBonuses(),
      ukraine: getInitialFactionBonuses(),
      don: getInitialFactionBonuses(),
      neutral: getInitialFactionBonuses(),
      foreign: getInitialFactionBonuses(),
    },
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
      // Version 4 saves (with single production queue) can be migrated to version 5
      if (data.version < 4) {
        console.warn('Old save format detected (pre-army-group-assignment), clearing incompatible save');
        deleteSaveGame();
        return null;
      }
      // Version 4 to 5 migration is handled in deserializeGameState
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

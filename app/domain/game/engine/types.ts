import {
  ActiveCombat,
  AIState,
  ArmyGroup,
  Adjacency,
  Country,
  CountryBonuses,
  CountryId,
  DivisionState,
  GameEvent,
  Mission,
  Modifier,
  Movement,
  NotificationItem,
  ProductionQueueItem,
  RegionDefinitions,
  RegionState,
  Relationship,
  ScheduledEvent,
  Situation,
  Theater,
} from '../../../types/game';
import { GAME_CONFIG } from '../../../constants/gameConfig';

/** Canonical simulation state consumed and produced by the engine. */
export interface EngineSimulationState {
  dateTime: Date;
  selectedCountry: Country | null;
  isPlayerAIEnabled: boolean;

  // Region state. `regions` is derived from `regionDefinitions + regionOwners` via buildRegionUpdate;
  // the engine receives and returns the full RegionState for convenience.
  regions: RegionState;
  regionDefinitions: RegionDefinitions;
  adjacency: Adjacency;
  regionCentroids: Record<string, [number, number]>;

  divisions: DivisionState;
  movingUnits: Movement[];
  activeCombats: ActiveCombat[];
  armyGroups: ArmyGroup[];
  theaters: Theater[];
  productionQueues: Record<CountryId, ProductionQueueItem[]>;
  relationships: Relationship[];
  scheduledEvents: ScheduledEvent[];
  situations: Situation[];
  countryBonuses: Record<CountryId, CountryBonuses>;
  modifiers: Record<CountryId, Modifier[]>;
  aiStates: AIState[];
  missions: Mission[];
  gameEvents: GameEvent[];
  notifications: NotificationItem[];
}

/** Static dependencies injected into the engine; never mutated by the engine. */
export interface SimulationDeps {
  countries: Country[];
  gameConfig: typeof GAME_CONFIG;
}

/** Output of a single engine tick or command application. */
export interface SimulationResult {
  state: EngineSimulationState;
}

export function noOpLogger(): SimulationLogger {
  return {
    debug: () => {},
    warn: () => {},
    error: () => {},
  };
}

/** Structured logger for engine diagnostics; avoids coupling domain code to console.*. */
export interface SimulationLogger {
  debug: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

/** Shared context threaded through each pipeline step. */
export interface SimulationContext {
  state: EngineSimulationState;
  tickNum: number;
  newDate: Date;

  // Intermediate values passed between steps
  remainingProductions?: Record<CountryId, ProductionQueueItem[]>;
  remainingMovements?: Movement[];
  completedMovements?: Movement[];
  newMidTransitCombats?: ActiveCombat[];
  updatedCombats?: ActiveCombat[];
  finishedCombats?: ActiveCombat[];
  newCombatEvents?: GameEvent[];
  newCombatNotifications?: NotificationItem[];
  retreatMovements?: Movement[];
  interceptedMovementIds?: string[];
  newHopMovements?: Movement[];
  changedOwnershipCountryIds?: Set<CountryId>;
  effectiveAICountryIds?: CountryId[];
  theaterInputsChanged?: boolean;
  nextTheaters?: Theater[];
}

/** A single simulation pipeline step: receives context + deps, returns mutated context. */
export type SimulationStep = (
  context: SimulationContext,
  deps: SimulationDeps,
  logger: SimulationLogger,
) => SimulationContext;

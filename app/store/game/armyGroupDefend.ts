import type { RegionDefinitions, Theater, ArmyGroup, Relationship, ScheduledEvent, CountryBonuses, AIState, Mission, GameEvent, NotificationItem, CountryId, ProductionQueueItem } from '../../types/game';
import { defendArmyGroup as defendArmyGroupPure } from '../../domain/game/armyGroupDefend';
import { GameStore } from './types';

/**
 * Store adapter for defendArmyGroup.
 * Converts GameStore -> EngineSimulationState, calls the pure domain function,
 * then applies the resulting patch via setState.
 */
export function defendArmyGroup(
  groupId: string,
  state: GameStore,
  setState: (partial: Partial<GameStore>) => void
): void {
  const engineState = toEngineState(state);
  const patch = defendArmyGroupPure(groupId, engineState);
  if (patch) {
    setState(patch as Partial<GameStore>);
  }
}

function get<T>(state: GameStore, key: string, fallback: T): T {
  return ((state as unknown as Record<string, unknown>)[key] as T | undefined) ?? fallback;
}

function toEngineState(state: GameStore) {
  return {
    dateTime: state.dateTime ?? new Date(),
    selectedCountry: state.selectedCountry ?? null,
    isPlayerAIEnabled: get(state, 'isPlayerAIEnabled', false),
    regions: state.regions ?? {},
    regionDefinitions: get<RegionDefinitions>(state, 'regionDefinitions', {} as RegionDefinitions),
    adjacency: state.adjacency ?? {},
    regionCentroids: get<Record<string, [number, number]>>(state, 'regionCentroids', {}),
    divisions: get<import('../../types/game').DivisionState>(state, 'divisions', {}),
    movingUnits: state.movingUnits ?? [],
    activeCombats: get<import('../../types/game').ActiveCombat[]>(state, 'activeCombats', []),
    armyGroups: get<ArmyGroup[]>(state, 'armyGroups', []),
    theaters: get<Theater[]>(state, 'theaters', []),
    productionQueues: get(state, 'productionQueues', {} as Record<CountryId, ProductionQueueItem[]>),
    relationships: get<Relationship[]>(state, 'relationships', []),
    scheduledEvents: get<ScheduledEvent[]>(state, 'scheduledEvents', []),
    countryBonuses: get(state, 'countryBonuses', {} as Record<CountryId, CountryBonuses>),
    aiStates: get<AIState[]>(state, 'aiStates', []),
    missions: get<Mission[]>(state, 'missions', []),
    gameEvents: get<GameEvent[]>(state, 'gameEvents', []),
    notifications: get<NotificationItem[]>(state, 'notifications', []),
  };
}

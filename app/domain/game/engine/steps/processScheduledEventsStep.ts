import { processScheduledEvents } from '../../tickHelpers';
import type { SimulationContext, SimulationDeps, SimulationLogger, EngineSimulationState } from '../types';

export function processScheduledEventsStep(
  context: SimulationContext,
  _deps: SimulationDeps,
  _logger: SimulationLogger,
): SimulationContext {
  const { state, newDate } = context;
  const {
    scheduledEvents,
    regions,
    relationships,
    armyGroups,
    divisions,
  } = state;

  const {
    updatedScheduledEvents,
    updatedRegions: regionsAfterEvents,
    updatedRelationships: relationshipsAfterEvents,
    updatedArmyGroups: armyGroupsAfterEvents,
    updatedDivisions: divisionsAfterEvents,
    newEvents: scheduledEventEvents,
    newNotifications: scheduledEventNotifications,
  } = processScheduledEvents(
    scheduledEvents,
    newDate,
    regions,
    relationships,
    armyGroups,
    divisions,
  );

  const nextState: EngineSimulationState = {
    ...state,
    regions: regionsAfterEvents,
    relationships: relationshipsAfterEvents,
    armyGroups: armyGroupsAfterEvents,
    divisions: divisionsAfterEvents,
    scheduledEvents: updatedScheduledEvents,
    gameEvents: [...state.gameEvents, ...scheduledEventEvents],
    notifications: [...state.notifications, ...scheduledEventNotifications],
  };

  return {
    ...context,
    state: nextState,
  };
}

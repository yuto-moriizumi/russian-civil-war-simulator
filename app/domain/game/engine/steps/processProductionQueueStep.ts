import { processProductionQueue } from '../../tickHelpers';
import type { SimulationContext, SimulationDeps, SimulationLogger, EngineSimulationState } from '../types';

export function processProductionQueueStep(
  context: SimulationContext,
  deps: SimulationDeps,
  _logger: SimulationLogger,
): SimulationContext {
  const { state } = context;
  const {
    dateTime,
    selectedCountry,
    regions,
    armyGroups,
    divisions,
    productionQueues,
    notifications,
  } = state;

  const {
    remainingProductions,
    updatedDivisions: divisionsAfterProduction,
    completedProductions,
  } = processProductionQueue(
    productionQueues,
    dateTime,
    regions,
    state.countryBonuses,
    armyGroups,
    divisions,
  );

  const playerProductions = completedProductions.filter(p => p.owner === selectedCountry?.id);
  const productionEvents = playerProductions.map(p => ({
    id: `event-${Date.now()}-${p.id}`,
    type: 'production_completed' as const,
    timestamp: dateTime,
    title: 'Production Complete',
    description: `${p.divisionName} has been produced and deployed.`,
    country: p.owner,
  }));
  const productionNotifications = playerProductions.map(p => ({
    id: `notif-${Date.now()}-${p.id}`,
    type: 'production_completed' as const,
    timestamp: dateTime,
    title: 'Production Complete',
    description: `${p.divisionName} has been produced and deployed.`,
    country: p.owner,
    expiresAt: new Date(dateTime.getTime() + deps.gameConfig.NOTIFICATION.DURATION_HOURS * 60 * 60 * 1000),
  }));

  const nextState: EngineSimulationState = {
    ...state,
    divisions: divisionsAfterProduction,
    gameEvents: [...state.gameEvents, ...productionEvents],
    notifications: [...notifications, ...productionNotifications],
  };

  return {
    ...context,
    state: nextState,
    remainingProductions,
  };
}

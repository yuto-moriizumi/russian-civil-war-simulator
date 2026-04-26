import { applyCompletedMovements, applyFinishedCombats } from '../../logic';
import type { SimulationContext, SimulationDeps, SimulationLogger, EngineSimulationState } from '../types';
import type { CountryId } from '../../../types/game';

export function applyMovementsAndCombatsStep(
  context: SimulationContext,
  deps: SimulationDeps,
  logger: SimulationLogger,
): SimulationContext {
  const { state, newDate } = context;
  const {
    regions,
    divisions,
    activeCombats,
    relationships,
    regionCentroids,
    notifications,
  } = state;

  const completedMovements = context.completedMovements ?? [];
  const allMovements = state.movingUnits;
  const updatedCombats = context.updatedCombats ?? activeCombats;
  const finishedCombats = context.finishedCombats ?? [];
  const newCombatEvents = context.newCombatEvents ?? [];
  const newCombatNotifications = context.newCombatNotifications ?? [];

  const accumulatedEvents = state.gameEvents;
  const accumulatedNotifications = notifications;

  const movementResult = applyCompletedMovements(
    completedMovements,
    allMovements,
    {
      regions,
      divisions,
      combats: updatedCombats,
      finishedCombats,
      events: [...accumulatedEvents, ...newCombatEvents],
      notifications: [...accumulatedNotifications, ...newCombatNotifications],
      relationships,
      countries: deps.countries,
      regionCentroids,
    },
    newDate,
    logger,
  );

  const combatResult = applyFinishedCombats(
    finishedCombats,
    movementResult.nextRegions,
    movementResult.nextDivisions,
    deps.countries,
    relationships,
  );

  const finishedCombatIds = new Set(finishedCombats.map(c => c.id));
  const retreatMovements = context.retreatMovements ?? [];
  const nextMovingUnits = [
    ...(context.remainingMovements ?? []),
    ...retreatMovements,
    ...movementResult.newHopMovements,
  ].filter(
    m =>
      !movementResult.interceptedMovementIds.includes(m.id) &&
      !(m.pendingCombatId && finishedCombatIds.has(m.pendingCombatId)),
  );

  const changedOwnershipCountryIds = new Set<CountryId>();
  for (const [regionId, nextRegion] of Object.entries(combatResult.nextRegions)) {
    const prevOwner = state.regions[regionId]?.owner;
    if (prevOwner !== nextRegion.owner) {
      if (prevOwner) changedOwnershipCountryIds.add(prevOwner as CountryId);
      changedOwnershipCountryIds.add(nextRegion.owner as CountryId);
    }
  }

  const nextState: EngineSimulationState = {
    ...state,
    regions: combatResult.nextRegions,
    movingUnits: nextMovingUnits,
    activeCombats: movementResult.nextCombats,
    divisions: combatResult.nextDivisions,
    gameEvents: movementResult.nextEvents,
    notifications: movementResult.nextNotifications,
  };

  return {
    ...context,
    state: nextState,
    changedOwnershipCountryIds,
    interceptedMovementIds: movementResult.interceptedMovementIds,
    newHopMovements: movementResult.newHopMovements,
  };
}

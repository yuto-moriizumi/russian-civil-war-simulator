import type {
  ActiveCombat,
  Country,
  Division,
  DivisionState,
  GameEvent,
  Movement,
  Region,
  Relationship,
} from '../../../types/game';
import { canRetreatToRegion } from '../combat';
import { createGameEvent } from '../eventUtils';
import { determineNewOwner } from '../occupationUtils';
import type { SimulationLogger } from '../engine/types';

function resolveRegionOwnerAfterFinishedCombats(
  region: Region,
  regionId: string,
  finishedCombats: ActiveCombat[],
  countries: Country[],
  relationships: Relationship[],
) {
  let owner = region.owner;

  finishedCombats.forEach(combat => {
    if (combat.defenderRegionId !== regionId || combat.victor !== combat.attackerCountry) return;

    owner = determineNewOwner(
      combat.attackerCountry,
      regionId,
      countries,
      relationships,
      combat.defenderCountry,
    );
  });

  return owner;
}

function createRetreatFailureEvent(division: Division, destination: Region, currentDate: Date): GameEvent {
  const reason = `${destination.name} was no longer a friendly retreat destination`;
  return createGameEvent(
    'division_destroyed',
    `${division.name} Destroyed`,
    `${division.name} (${division.owner}) disappeared while retreating toward ${destination.name}. Reason: ${reason}.`,
    currentDate,
    division.owner,
    destination.id,
  );
}

export function applyCompletedRetreatMovement(
  movement: Movement,
  arrivingDivisions: Division[],
  destination: Region,
  divisions: DivisionState,
  events: GameEvent[],
  currentDate: Date,
  relationships: Relationship[],
  finishedCombats: ActiveCombat[] = [],
  countries: Country[] = [],
  logger: SimulationLogger,
): { nextDivisions: DivisionState; nextEvents: GameEvent[] } {
  const finalOwner = resolveRegionOwnerAfterFinishedCombats(
    destination,
    destination.id,
    finishedCombats,
    countries,
    relationships,
  );

  if (finalOwner !== movement.owner && !canRetreatToRegion(movement.owner, finalOwner, relationships)) {
    let nextDivisions = divisions;
    const nextEvents = [...events];

    arrivingDivisions.forEach(division => {
      const { [division.id]: _removed, ...rest } = nextDivisions;
      nextDivisions = rest;
      nextEvents.push(createRetreatFailureEvent(division, destination, currentDate));
    });

    logger.debug(
      `[RETREAT FAILED] ${arrivingDivisions.length} ${movement.owner} divisions were destroyed retreating toward ${destination.name}; destination is no longer friendly`
    );

    return { nextDivisions, nextEvents };
  }

  let nextDivisions = divisions;
  arrivingDivisions.forEach(division => {
    nextDivisions = { ...nextDivisions, [division.id]: { ...division, regionId: destination.id } };
  });
  return { nextDivisions, nextEvents: events };
}

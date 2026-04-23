import { Movement, ActiveCombat, Region, GameEvent, NotificationItem, Relationship, Country, DivisionState, Division } from '../../../types/game';
import { determineNewOwner } from '../occupationUtils';
import { createActiveCombat } from '../combat';
import {
  addCombatReinforcements,
  findActiveCombatOnBorder,
} from '../combatParticipation';
import { createGameEvent, createNotification } from '../eventUtils';
import { calculateDistance, calculateTravelTime } from '../../../utils/distance';
import { getDivisionsInRegion, getMovementDivisions, getCombatDefenders } from '../divisionState';
import { SimulationLogger, noOpLogger } from '../engine/types';

interface MovementApplicationContext {
  regions: Record<string, Region>;
  divisions: DivisionState;
  combats: ActiveCombat[];
  finishedCombats?: ActiveCombat[];
  events: GameEvent[];
  notifications: NotificationItem[];
  relationships: Relationship[];
  countries?: Country[];
  regionCentroids?: Record<string, [number, number]>;
}

interface MovementApplicationResult {
  nextRegions: Record<string, Region>;
  nextDivisions: DivisionState;
  nextCombats: ActiveCombat[];
  nextEvents: GameEvent[];
  nextNotifications: NotificationItem[];
  interceptedMovementIds: string[];
  newHopMovements: Movement[];
}

export function applyCompletedMovements(
  completedMovements: Movement[],
  allMovements: Movement[],
  context: MovementApplicationContext,
  currentDate: Date,
  logger: SimulationLogger = noOpLogger(),
): MovementApplicationResult {
  const nextRegions = { ...context.regions };
  let nextDivisions = { ...context.divisions };
  const nextCombats = [...context.combats];
  const nextEvents = [...context.events];
  const nextNotifications = [...context.notifications];
  const interceptedMovementIds: string[] = [];
  const newHopMovements: Movement[] = [];

  completedMovements.forEach(movement => {
    if (interceptedMovementIds.includes(movement.id)) return;

    const { toRegion, owner } = movement;
    const to = nextRegions[toRegion];
    if (!to) return;

    if (movement.pendingCombatId) {
      const allKnownCombats = [...context.combats, ...(context.finishedCombats ?? [])];
      const linkedCombat = allKnownCombats.find(c => c.id === movement.pendingCombatId);
      if (linkedCombat) {
        return;
      }
    }

    const arrivingDivisions = getMovementDivisions(nextDivisions, movement);

    const dest = nextRegions[toRegion];
    if (!dest) return;

    const landDivisionsInRegion = (targetRegionId: string, divs: Division[]) => {
      for (const d of divs) {
        nextDivisions = { ...nextDivisions, [d.id]: { ...d, regionId: targetRegionId } };
      }
    };

    if (dest.owner === owner) {
      if (movement.remainingPath && movement.remainingPath.length > 0) {
        landDivisionsInRegion(toRegion, arrivingDivisions);
        _dispatchNextHop(movement, nextRegions, nextDivisions, currentDate, newHopMovements, context, logger);
      } else {
        landDivisionsInRegion(toRegion, arrivingDivisions);
      }
    } else {
      const theirRelationship = context.relationships.find(
        r => r.fromCountry === dest.owner && r.toCountry === owner
      );
      const theyGrantUs = theirRelationship ? theirRelationship.type : 'neutral';

      const ourRelationship = context.relationships.find(
        r => r.fromCountry === owner && r.toCountry === dest.owner
      );
      const weDeclared = ourRelationship ? ourRelationship.type : 'neutral';

      const hasAutonomy = theyGrantUs === 'autonomy' || weDeclared === 'autonomy';

      let effectiveRelationship = weDeclared === 'war' ? 'war' : theyGrantUs;
      if (hasAutonomy) {
        effectiveRelationship = 'military_access';
      }

      if (effectiveRelationship === 'military_access' || effectiveRelationship === 'autonomy') {
        if (movement.remainingPath && movement.remainingPath.length > 0) {
          landDivisionsInRegion(toRegion, arrivingDivisions);
          _dispatchNextHop(movement, nextRegions, nextDivisions, currentDate, newHopMovements, context, logger);
        } else {
          landDivisionsInRegion(toRegion, arrivingDivisions);
        }
        logger.debug(`[MILITARY ACCESS] ${arrivingDivisions.length} ${owner} divisions moved to ${dest.name} with military access`);

      } else if (effectiveRelationship === 'war' || effectiveRelationship === 'neutral') {
        const counterMovements = allMovements.filter(m =>
          m.fromRegion === toRegion &&
          m.owner !== owner &&
          !interceptedMovementIds.includes(m.id) &&
          !m.pendingCombatId
        );
        const interceptingDivisions = counterMovements.flatMap(m => getMovementDivisions(nextDivisions, m));
        if (counterMovements.length > 0) {
          counterMovements.forEach(m => {
            interceptedMovementIds.push(m.id);
            logger.debug(`[MEETING ENGAGEMENT] ${owner} forces intercepted ${m.owner} forces moving out of ${dest.name} toward ${m.toRegion}`);
          });
        }

        // With divisionIds, moving divisions have regionId=null so getDivisionsInRegion already excludes them.
        // Still exclude counter-movements explicitly as they're being intercepted.
        const inTransitFromDest = new Set(
          allMovements
            .filter(m => m.fromRegion === toRegion && m.owner !== owner && !counterMovements.includes(m) && !m.pendingCombatId)
            .flatMap(m => m.divisionIds)
        );

        const ongoingCombat = findActiveCombatOnBorder(
          nextCombats,
          movement.fromRegion,
          toRegion,
        );

        if (ongoingCombat) {
          const combatIndex = nextCombats.findIndex(c => c.id === ongoingCombat.id);
          let updatedCombat = addCombatReinforcements(
            ongoingCombat,
            owner,
            arrivingDivisions,
          );

          if (owner === ongoingCombat.attackerCountry && interceptingDivisions.length > 0) {
            updatedCombat = addCombatReinforcements(
              updatedCombat,
              ongoingCombat.defenderCountry,
              interceptingDivisions,
            );
          } else if (owner === ongoingCombat.defenderCountry) {
            updatedCombat = addCombatReinforcements(
              updatedCombat,
              ongoingCombat.defenderCountry,
              interceptingDivisions,
            );

            if (interceptingDivisions.length > 0) {
              const interceptedAttackers = counterMovements
                .filter(m => m.owner === ongoingCombat.attackerCountry)
                .flatMap(m => getMovementDivisions(nextDivisions, m));

              if (interceptedAttackers.length > 0) {
                updatedCombat = addCombatReinforcements(
                  updatedCombat,
                  ongoingCombat.attackerCountry,
                  interceptedAttackers,
                );
                const interceptedAttackerIds = new Set(interceptedAttackers.map(d => d.id));
                updatedCombat = {
                  ...updatedCombat,
                  defenderDivisionIds: updatedCombat.defenderDivisionIds.filter(id => !interceptedAttackerIds.has(id)),
                };
              }
            }
          }

          nextCombats[combatIndex] = updatedCombat;

          if (owner === ongoingCombat.attackerCountry) {
            logger.debug(`[REINFORCEMENTS] ${arrivingDivisions.length} ${owner} divisions joined the attackers in combat at ${dest.name}`);

            nextEvents.push(createGameEvent(
              'combat_victory',
              `Reinforcements Arrive!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} reinforcements (${arrivingDivisions.length} divisions) have joined the attack on ${dest.name}.`,
              currentDate, owner, toRegion
            ));
          } else if (owner === ongoingCombat.defenderCountry) {
            logger.debug(`[REINFORCEMENTS] ${arrivingDivisions.length} ${owner} divisions joined the defenders in combat at ${dest.name}`);

            nextEvents.push(createGameEvent(
              'combat_victory',
              `Reinforcements Arrive!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} reinforcements (${arrivingDivisions.length} divisions) have arrived to defend ${dest.name}.`,
              currentDate, owner, toRegion
            ));
          }
        } else {
          const existingDefenderDivisions = getDivisionsInRegion(nextDivisions, toRegion).filter(
            d => d.owner === dest.owner && !inTransitFromDest.has(d.id)
          );
          const totalDefenderDivisions = [...existingDefenderDivisions, ...interceptingDivisions];

          const otherCombatsOnRegion = nextCombats.filter(
            c => c.defenderRegionId === toRegion && !c.isComplete
          );
          const effectiveDefenderDivisions = totalDefenderDivisions.length > 0
            ? totalDefenderDivisions
            : otherCombatsOnRegion.length > 0
              ? getCombatDefenders(nextDivisions, otherCombatsOnRegion[0])
              : [];

          if (effectiveDefenderDivisions.length === 0) {
            const previousOwner = dest.owner;
            const newOwner = determineNewOwner(owner, toRegion, context.countries ?? [], context.relationships, dest.owner);
            nextRegions[toRegion] = { ...dest, owner: newOwner };
            landDivisionsInRegion(toRegion, arrivingDivisions);
            const captureEvent = createGameEvent(
              'region_captured',
              `${dest.name} Captured!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} forces captured the undefended region of ${dest.name}.`,
              currentDate, owner, toRegion
            );
            nextEvents.push(captureEvent);
            nextNotifications.push(createNotification(captureEvent, currentDate));
            const lostEvent = createGameEvent(
              'region_lost',
              `${dest.name} Lost!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} forces captured your undefended region of ${dest.name}.`,
              currentDate, previousOwner, toRegion
            );
            nextEvents.push(lostEvent);
            nextNotifications.push(createNotification(lostEvent, currentDate));

            if (movement.remainingPath && movement.remainingPath.length > 0) {
              _dispatchNextHop(movement, nextRegions, nextDivisions, currentDate, newHopMovements, context, logger);
            }
          } else {
            const fromRegionStateForCombat = nextRegions[movement.fromRegion];
            const newCombat = createActiveCombat(
              movement.fromRegion,
              fromRegionStateForCombat?.name ?? movement.fromRegion,
              toRegion,
              dest.name,
              owner,
              dest.owner,
              arrivingDivisions,
              effectiveDefenderDivisions,
              currentDate
            );
            nextCombats.push(newCombat);
            const isFirstCombatOnRegion = otherCombatsOnRegion.length === 0 && totalDefenderDivisions.length > 0;
            if (isFirstCombatOnRegion) {
            // Defender divisions keep their regionId — they are defending this region.
            }
            const battleEvent = createGameEvent(
              'combat_victory',
              `Battle for ${dest.name} Begins!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} forces (${arrivingDivisions.length} divisions) are attacking ${dest.owner === 'soviet' ? 'Soviet' : 'White'} defenders (${effectiveDefenderDivisions.length} divisions) at ${dest.name}.`,
              currentDate, owner, toRegion
            );
            nextEvents.push(battleEvent);
          }
        }
      }
    }
  });

  return { nextRegions, nextDivisions, nextCombats, nextEvents, nextNotifications, interceptedMovementIds, newHopMovements };
}

function _dispatchNextHop(
  movement: Movement,
  regions: Record<string, Region>,
  divisions: DivisionState,
  currentDate: Date,
  newHopMovements: Movement[],
  context: Pick<MovementApplicationContext, 'regionCentroids'>,
  logger: SimulationLogger,
): void {
  if (!movement.remainingPath || movement.remainingPath.length === 0) return;

  const [nextRegionId, ...restPath] = movement.remainingPath;
  const fromRegionId = movement.toRegion;

  const regionCentroids = context.regionCentroids ?? {};
  const distanceKm = calculateDistance(fromRegionId, nextRegionId, regionCentroids);
  const travelTimeHours = calculateTravelTime(distanceKm, false);

  const arrivalTime = new Date(currentDate);
  arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

  const nextHop: Movement = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    fromRegion: fromRegionId,
    toRegion: nextRegionId,
    divisionIds: movement.divisionIds,
    departureTime: new Date(currentDate),
    arrivalTime,
    owner: movement.owner,
    ...(restPath.length > 0
      ? { remainingPath: restPath, finalDestination: movement.finalDestination }
      : {}),
  };

  newHopMovements.push(nextHop);
  logger.debug(`[MULTI-STEP] ${movement.owner} divisions continuing from ${fromRegionId} → ${nextRegionId}${restPath.length > 0 ? ` (${restPath.length} more hops)` : ' (final hop)'}`);
}

export function applyFinishedCombats(
  finishedCombats: ActiveCombat[],
  regions: Record<string, Region>,
  divisions: DivisionState,
  countries: Country[] = [],
  relationships: Relationship[] = []
): { nextRegions: Record<string, Region>; nextDivisions: DivisionState } {
  const nextRegions = { ...regions };
  let nextDivisions = { ...divisions };

  finishedCombats.forEach(combat => {
    if (combat.victor === combat.attackerCountry) {
      const defenderRegion = nextRegions[combat.defenderRegionId];
      if (!defenderRegion) return;

      const newOwner = determineNewOwner(combat.attackerCountry, combat.defenderRegionId, countries, relationships, combat.defenderCountry);
      nextRegions[combat.defenderRegionId] = { ...defenderRegion, owner: newOwner };

      for (const id of combat.attackerDivisionIds) {
        const div = nextDivisions[id];
        if (div) {
          nextDivisions = { ...nextDivisions, [id]: { ...div, regionId: combat.defenderRegionId } };
        }
      }
      // Defeated defender divisions are already removed during combat processing.
      // Surviving defenders keep their regionId (the defended region).
    } else {
      // Defender wins: restore attacker divisions to origin region
      for (const id of combat.attackerDivisionIds) {
        const div = nextDivisions[id];
        if (div) {
          nextDivisions = { ...nextDivisions, [id]: { ...div, regionId: combat.attackerRegionId } };
        }
      }
      // Restore defender divisions (deduplicated)
      const restoredDefenderIds = new Set<string>();
      for (const id of combat.defenderDivisionIds) {
        if (!restoredDefenderIds.has(id)) {
          restoredDefenderIds.add(id);
          const div = nextDivisions[id];
          if (div) {
            nextDivisions = { ...nextDivisions, [id]: { ...div, regionId: combat.defenderRegionId } };
          }
        }
      }
    }
  });

  return { nextRegions, nextDivisions };
}

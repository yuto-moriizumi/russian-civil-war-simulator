import { Movement, ActiveCombat, Region, GameEvent, NotificationItem, Relationship, Country, CountryId } from '../../../types/game';
import { determineNewOwner } from '../../../utils/combat';
import { createActiveCombat } from '../../../utils/combat';
import { createGameEvent, createNotification } from '../../../utils/eventUtils';
import { calculateDistance, calculateTravelTime } from '../../../utils/distance';

interface MovementApplicationContext {
  regions: Record<string, Region>;
  combats: ActiveCombat[];
  /** Combats that completed this tick (their result is handled by applyFinishedCombats) */
  finishedCombats?: ActiveCombat[];
  events: GameEvent[];
  notifications: NotificationItem[];
  relationships: Relationship[];
  countries?: Country[];
  /** Centroids for calculating per-hop travel time on multi-step routes */
  regionCentroids?: Record<string, [number, number]>;
}

interface MovementApplicationResult {
  nextRegions: Record<string, Region>;
  nextCombats: ActiveCombat[];
  nextEvents: GameEvent[];
  nextNotifications: NotificationItem[];
  interceptedMovementIds: string[];
  /** New movements that were dispatched for the next hop of a multi-step route */
  newHopMovements: Movement[];
}

/**
 * Applies completed movements to regions, handling friendly reinforcements,
 * combat reinforcements, undefended captures, and initiating new combats.
 * Also detects meeting engagements where opposing forces are moving into each other's territory.
 *
 * For multi-step movements (those with a `remainingPath`): when a movement arrives
 * at an intermediate region without triggering combat, the next hop is automatically
 * dispatched as a new Movement record instead of landing the divisions in place.
 */
export function applyCompletedMovements(
  completedMovements: Movement[],
  allMovements: Movement[],
  context: MovementApplicationContext,
  currentDate: Date
): MovementApplicationResult {
  const nextRegions = { ...context.regions };
  const nextCombats = [...context.combats];
  const nextEvents = [...context.events];
  const nextNotifications = [...context.notifications];
  const interceptedMovementIds: string[] = [];
  const newHopMovements: Movement[] = [];

  completedMovements.forEach(movement => {
    // Skip if this movement was already intercepted as a counter-movement
    if (interceptedMovementIds.includes(movement.id)) return;

    const { toRegion, owner } = movement;
    const to = nextRegions[toRegion];
    if (!to) return;

    // If this movement was linked to a combat it initiated, the combat result
    // is handled by applyFinishedCombats — skip normal movement application.
    // Do NOT remove from fromRegion here; applyFinishedCombats handles placement.
    if (movement.pendingCombatId) {
      const allKnownCombats = [...context.combats, ...(context.finishedCombats ?? [])];
      const linkedCombat = allKnownCombats.find(c => c.id === movement.pendingCombatId);
      if (linkedCombat) {
        return;
      }
      // Combat not found — fall through to normal logic (shouldn't normally happen)
    }

    // Remove moving divisions from the source region now that the movement completes.
    // (Divisions were kept in fromRegion during transit; they leave only on arrival.)
    const movingIds = new Set(movement.divisions.map(d => d.id));
    const fromRegionState = nextRegions[movement.fromRegion];
    if (fromRegionState) {
      nextRegions[movement.fromRegion] = {
        ...fromRegionState,
        divisions: fromRegionState.divisions.filter(d => !movingIds.has(d.id)),
      };
    }
    // Use the up-to-date division objects from the region (HP may have regenerated during transit).
    // Fall back to movement.divisions (e.g. retreat movements where region has stale HP).
    const arrivingDivisions = fromRegionState
      ? fromRegionState.divisions.filter(d => movingIds.has(d.id))
      : movement.divisions;

    // Re-read toRegion after the fromRegion removal so self-moves (fromRegion === toRegion)
    // don't operate on a stale snapshot that still contains the departing divisions.
    const dest = nextRegions[toRegion];
    if (!dest) return;

    if (dest.owner === owner) {
      // Friendly region
      if (movement.remainingPath && movement.remainingPath.length > 0) {
        // Multi-step: divisions were just placed into the intermediate region above;
        // dispatch the next hop from there.
        nextRegions[toRegion] = {
          ...dest,
          divisions: [...dest.divisions, ...arrivingDivisions],
        };
        _dispatchNextHop(movement, nextRegions, currentDate, newHopMovements, context);
      } else {
        // Final destination — land units
        nextRegions[toRegion] = {
          ...dest,
          divisions: [...dest.divisions, ...arrivingDivisions],
        };
      }
    } else {
      // Enemy region - check relationship type
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
        // Military access - units can move but no occupation or combat
        if (movement.remainingPath && movement.remainingPath.length > 0) {
          nextRegions[toRegion] = {
            ...dest,
            divisions: [...dest.divisions, ...arrivingDivisions],
          };
          _dispatchNextHop(movement, nextRegions, currentDate, newHopMovements, context);
        } else {
          nextRegions[toRegion] = {
            ...dest,
            divisions: [...dest.divisions, ...arrivingDivisions],
          };
        }
        console.log(`[MILITARY ACCESS] ${arrivingDivisions.length} ${owner} divisions moved to ${dest.name} with military access`);

      } else if (effectiveRelationship === 'war' || effectiveRelationship === 'neutral') {
        // War state or neutral (hostile) - proceed with combat/occupation logic

        // INTERCEPTION LOGIC: enemy movements leaving the destination are intercepted.
        // With divisions kept in fromRegion, intercepted enemy divisions are already present
        // in dest.divisions and will be included in existingDefenderDivisions below.
        const counterMovements = allMovements.filter(m =>
          m.fromRegion === toRegion &&
          m.owner !== owner &&
          !interceptedMovementIds.includes(m.id) &&
          !m.pendingCombatId
        );
        const interceptingDivisions = counterMovements.flatMap(m => m.divisions);
        if (counterMovements.length > 0) {
          counterMovements.forEach(m => {
            interceptedMovementIds.push(m.id);
            console.log(`[MEETING ENGAGEMENT] ${owner} forces intercepted ${m.owner} forces moving out of ${dest.name} toward ${m.toRegion}`);
          });
        }

        // Exclude divisions already in transit OUT of the destination (they are counted
        // as defenders via interceptingDivisions below, avoiding double-count).
        const inTransitFromDest = new Set(
          allMovements
            .filter(m => m.fromRegion === toRegion && m.owner !== owner && !counterMovements.includes(m))
            .flatMap(m => m.divisions.map(d => d.id))
        );

        // Check for ongoing combat (border-specific: same attacker origin AND same defender)
        const ongoingCombat = nextCombats.find(c =>
          c.attackerRegionId === movement.fromRegion &&
          c.defenderRegionId === toRegion &&
          !c.isComplete
        );

        if (ongoingCombat) {
          const combatIndex = nextCombats.findIndex(c => c.id === ongoingCombat.id);

          if (owner === ongoingCombat.attackerCountry) {
            const updatedCombat = {
              ...ongoingCombat,
              attackerDivisions: [...ongoingCombat.attackerDivisions, ...arrivingDivisions],
              initialAttackerHp: ongoingCombat.initialAttackerHp + arrivingDivisions.reduce((sum, d) => sum + d.hp, 0),
              initialAttackerCount: ongoingCombat.initialAttackerCount + arrivingDivisions.length,
            };

            if (interceptingDivisions.length > 0) {
              updatedCombat.defenderDivisions = [...updatedCombat.defenderDivisions, ...interceptingDivisions];
              updatedCombat.initialDefenderHp += interceptingDivisions.reduce((sum, d) => sum + d.hp, 0);
              updatedCombat.initialDefenderCount += interceptingDivisions.length;
            }

            nextCombats[combatIndex] = updatedCombat;
            console.log(`[REINFORCEMENTS] ${arrivingDivisions.length} ${owner} divisions joined the attackers in combat at ${dest.name}`);

            nextEvents.push(createGameEvent(
              'combat_victory',
              `Reinforcements Arrive!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} reinforcements (${arrivingDivisions.length} divisions) have joined the attack on ${dest.name}.`,
              currentDate, owner, toRegion
            ));
          } else if (owner === ongoingCombat.defenderCountry) {
            const totalDivisionsToAdd = [...arrivingDivisions, ...interceptingDivisions];
            const updatedCombat = {
              ...ongoingCombat,
              defenderDivisions: [...ongoingCombat.defenderDivisions, ...totalDivisionsToAdd],
              initialDefenderHp: ongoingCombat.initialDefenderHp + totalDivisionsToAdd.reduce((sum, d) => sum + d.hp, 0),
              initialDefenderCount: ongoingCombat.initialDefenderCount + totalDivisionsToAdd.length,
            };

            if (interceptingDivisions.length > 0) {
              const interceptedAttackers = counterMovements
                .filter(m => m.owner === ongoingCombat.attackerCountry)
                .flatMap(m => m.divisions);

              if (interceptedAttackers.length > 0) {
                updatedCombat.attackerDivisions = [...updatedCombat.attackerDivisions, ...interceptedAttackers];
                updatedCombat.initialAttackerHp += interceptedAttackers.reduce((sum, d) => sum + d.hp, 0);
                updatedCombat.initialAttackerCount += interceptedAttackers.length;
                updatedCombat.defenderDivisions = updatedCombat.defenderDivisions.filter(d => !interceptedAttackers.includes(d));
              }
            }

            nextCombats[combatIndex] = updatedCombat;
            console.log(`[REINFORCEMENTS] ${arrivingDivisions.length} ${owner} divisions joined the defenders in combat at ${dest.name}`);

            nextEvents.push(createGameEvent(
              'combat_victory',
              `Reinforcements Arrive!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} reinforcements (${arrivingDivisions.length} divisions) have arrived to defend ${dest.name}.`,
              currentDate, owner, toRegion
            ));
          }
        } else {
          // No ongoing combat - follow standard combat/occupation logic
          // Exclude in-transit divisions (they are in the region but already committed to movement).
          const existingDefenderDivisions = dest.divisions.filter(
            d => d.owner === dest.owner && !inTransitFromDest.has(d.id)
          );
          const totalDefenderDivisions = [...existingDefenderDivisions, ...interceptingDivisions];

          const otherCombatsOnRegion = nextCombats.filter(
            c => c.defenderRegionId === toRegion && !c.isComplete
          );
          const effectiveDefenderDivisions = totalDefenderDivisions.length > 0
            ? totalDefenderDivisions
            : otherCombatsOnRegion.length > 0
              ? otherCombatsOnRegion[0].defenderDivisions.map(d => ({ ...d }))
              : [];

          if (effectiveDefenderDivisions.length === 0) {
            // Undefended capture
            const previousOwner = dest.owner;
            const newOwner = determineNewOwner(owner, toRegion, context.countries ?? [], context.relationships);
            nextRegions[toRegion] = {
              ...dest,
              owner: newOwner,
              divisions: arrivingDivisions,
            };
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
              _dispatchNextHop(movement, nextRegions, currentDate, newHopMovements, context);
            }
          } else {
            // Initiate new combat
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
            // Clear defender divisions on first combat — intercepted defenders are included
            const isFirstCombatOnRegion = otherCombatsOnRegion.length === 0 && totalDefenderDivisions.length > 0;
            if (isFirstCombatOnRegion) {
              nextRegions[toRegion] = { ...dest, divisions: [] };
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

  return { nextRegions, nextCombats, nextEvents, nextNotifications, interceptedMovementIds, newHopMovements };
}

/**
 * Helper: dispatch the next hop movement for a multi-step route.
 * Pops the first element from `movement.remainingPath` as the new `toRegion`
 * and creates a new Movement record with the rest as the new `remainingPath`.
 */
function _dispatchNextHop(
  movement: Movement,
  regions: Record<string, Region>,
  currentDate: Date,
  newHopMovements: Movement[],
  context: Pick<MovementApplicationContext, 'regionCentroids'>
): void {
  if (!movement.remainingPath || movement.remainingPath.length === 0) return;

  const [nextRegionId, ...restPath] = movement.remainingPath;
  const fromRegionId = movement.toRegion; // Current arrival region becomes the new departure

  const regionCentroids = context.regionCentroids ?? {};
  const distanceKm = calculateDistance(fromRegionId, nextRegionId, regionCentroids);
  const travelTimeHours = calculateTravelTime(distanceKm, false);

  const arrivalTime = new Date(currentDate);
  arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

  // Divisions are now in regions[fromRegionId] (placed by the caller before this call).
  // Build the division list from the region so the new hop carries up-to-date objects.
  const divIds = new Set(movement.divisions.map(d => d.id));
  const regionDivisions = regions[fromRegionId]?.divisions.filter(d => divIds.has(d.id)) ?? movement.divisions;

  const nextHop: Movement = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    fromRegion: fromRegionId,
    toRegion: nextRegionId,
    divisions: regionDivisions,
    departureTime: new Date(currentDate),
    arrivalTime,
    owner: movement.owner,
    ...(restPath.length > 0
      ? { remainingPath: restPath, finalDestination: movement.finalDestination }
      : {}),
  };

  newHopMovements.push(nextHop);
  console.log(`[MULTI-STEP] ${movement.owner} divisions continuing from ${fromRegionId} → ${nextRegionId}${restPath.length > 0 ? ` (${restPath.length} more hops)` : ' (final hop)'}`);
}

export function applyFinishedCombats(
  finishedCombats: ActiveCombat[],
  regions: Record<string, Region>,
  countries: Country[] = [],
  relationships: Relationship[] = []
): Record<string, Region> {
  const nextRegions = { ...regions };

  finishedCombats.forEach(combat => {
    const attackerIds = new Set(combat.attackerDivisions.map(d => d.id));

    if (combat.victor === combat.attackerCountry) {
      // Attacker wins:
      // 1. Remove attacker divisions from attackerRegion (they were kept there during transit).
      const attackerRegion = nextRegions[combat.attackerRegionId];
      if (attackerRegion) {
        nextRegions[combat.attackerRegionId] = {
          ...attackerRegion,
          divisions: attackerRegion.divisions.filter(d => !attackerIds.has(d.id)),
        };
      }
      // 2. Place attacker divisions (with post-combat HP) in defenderRegion.
      const defenderRegion = nextRegions[combat.defenderRegionId];
      if (!defenderRegion) return;
      const attackerDivisionIds = new Set(combat.attackerDivisions.map(d => d.id));
      const preservedDivisions = defenderRegion.divisions.filter(d =>
        d.owner !== combat.defenderCountry && !attackerDivisionIds.has(d.id)
      );
      const newOwner = determineNewOwner(combat.attackerCountry, combat.defenderRegionId, countries, relationships);
      nextRegions[combat.defenderRegionId] = {
        ...defenderRegion,
        owner: newOwner,
        divisions: [...preservedDivisions, ...combat.attackerDivisions],
      };
    } else {
      // Defender wins:
      // Attacker divisions remain in attackerRegion; update them with post-combat HP.
      const attackerRegion = nextRegions[combat.attackerRegionId];
      if (attackerRegion) {
        nextRegions[combat.attackerRegionId] = {
          ...attackerRegion,
          divisions: [
            ...attackerRegion.divisions.filter(d => !attackerIds.has(d.id)),
            ...combat.attackerDivisions,
          ],
        };
      }
      // Restore defender divisions (deduplicated) to defender region
      const defenderRegion = nextRegions[combat.defenderRegionId];
      if (defenderRegion) {
        const existingIds = new Set(defenderRegion.divisions.map(d => d.id));
        const newDefenderDivs = combat.defenderDivisions.filter(d => !existingIds.has(d.id));
        nextRegions[combat.defenderRegionId] = {
          ...defenderRegion,
          divisions: [...defenderRegion.divisions, ...newDefenderDivs],
        };
      }
    }
  });

  return nextRegions;
}

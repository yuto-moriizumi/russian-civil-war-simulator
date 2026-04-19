import { Movement, ActiveCombat, Region, GameEvent, NotificationItem, Relationship } from '../../../types/game';
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

    const { toRegion, divisions, owner } = movement;
    const to = nextRegions[toRegion];
    if (!to) return;

    // If this movement was linked to a combat it initiated, the combat result
    // is handled by applyFinishedCombats — skip normal movement application.
    if (movement.pendingCombatId) {
      const allKnownCombats = [...context.combats, ...(context.finishedCombats ?? [])];
      const linkedCombat = allKnownCombats.find(c => c.id === movement.pendingCombatId);
      if (linkedCombat) {
        // Combat result (victor, surviving divisions) is applied by applyFinishedCombats.
        // Nothing to do here for this movement.
        return;
      }
      // Combat not found — fall through to normal logic (shouldn't normally happen)
    }

    if (to.owner === owner) {
      // Friendly region
      if (movement.remainingPath && movement.remainingPath.length > 0) {
        // Multi-step: don't land here — dispatch next hop
        _dispatchNextHop(movement, nextRegions, currentDate, newHopMovements, context);
      } else {
        // Final destination — land units
        nextRegions[toRegion] = {
          ...to,
          divisions: [...to.divisions, ...divisions],
        };
      }
    } else {
      // Enemy region - check relationship type
      // Check if they grant us access/war
      const theirRelationship = context.relationships.find(
        r => r.fromCountry === to.owner && r.toCountry === owner
      );
      const theyGrantUs = theirRelationship ? theirRelationship.type : 'neutral';
      
      // Check if we declared war on them
      const ourRelationship = context.relationships.find(
        r => r.fromCountry === owner && r.toCountry === to.owner
      );
      const weDeclared = ourRelationship ? ourRelationship.type : 'neutral';
      
      // Check for autonomy relationship (bidirectional)
      const hasAutonomy = theyGrantUs === 'autonomy' || weDeclared === 'autonomy';
      
      // Determine the effective relationship
      let effectiveRelationship = weDeclared === 'war' ? 'war' : theyGrantUs;
      
      // Override: autonomy grants military access
      if (hasAutonomy) {
        effectiveRelationship = 'military_access';
      }
      
      if (effectiveRelationship === 'military_access' || effectiveRelationship === 'autonomy') {
        // Military access - units can move but no occupation or combat
        if (movement.remainingPath && movement.remainingPath.length > 0) {
          // Multi-step: pass through with military access — dispatch next hop
          _dispatchNextHop(movement, nextRegions, currentDate, newHopMovements, context);
        } else {
          nextRegions[toRegion] = {
            ...to,
            divisions: [...to.divisions, ...divisions],
          };
        }
        console.log(`[MILITARY ACCESS] ${divisions.length} ${owner} divisions moved to ${to.name} with military access`);
        
      } else if (effectiveRelationship === 'war' || effectiveRelationship === 'neutral') {
        // War state or neutral (hostile) - proceed with combat/occupation logic

        // INTERCEPTION LOGIC: Check for counter-movements (Meeting Engagement)
        // EU4/CK3 rule: if enemy units are moving OUT of our destination region (regardless
        // of where they're heading), they are intercepted and must fight at the destination.
        // This prevents the "division swap" bug where two armies pass through each other.
        const counterMovements = allMovements.filter(m =>
          m.fromRegion === toRegion &&
          m.owner !== owner &&
          !interceptedMovementIds.includes(m.id) &&
          !m.pendingCombatId // don't intercept units already locked into a combat
        );

        const interceptingDivisions = counterMovements.flatMap(m => m.divisions);
        if (counterMovements.length > 0) {
          counterMovements.forEach(m => {
            interceptedMovementIds.push(m.id);
            console.log(`[MEETING ENGAGEMENT] ${owner} forces intercepted ${m.owner} forces moving out of ${to.name} toward ${m.toRegion}`);
          });
        }

        // Check for ongoing combat (border-specific: same attacker origin AND same defender)
        const ongoingCombat = nextCombats.find(c =>
          c.attackerRegionId === movement.fromRegion &&
          c.defenderRegionId === toRegion &&
          !c.isComplete
        );
        
        if (ongoingCombat) {
          // There's an ongoing combat - add reinforcements to the appropriate side
          const combatIndex = nextCombats.findIndex(c => c.id === ongoingCombat.id);
          
          if (owner === ongoingCombat.attackerCountry) {
            // Join the attackers
            const totalDivisionsToAdd = [...divisions];
            const updatedCombat = {
              ...ongoingCombat,
              attackerDivisions: [...ongoingCombat.attackerDivisions, ...totalDivisionsToAdd],
              initialAttackerHp: ongoingCombat.initialAttackerHp + totalDivisionsToAdd.reduce((sum, d) => sum + d.hp, 0),
              initialAttackerCount: ongoingCombat.initialAttackerCount + totalDivisionsToAdd.length,
            };

            // If we intercepted counter-movements, they join the defenders
            if (interceptingDivisions.length > 0) {
              updatedCombat.defenderDivisions = [...updatedCombat.defenderDivisions, ...interceptingDivisions];
              updatedCombat.initialDefenderHp += interceptingDivisions.reduce((sum, d) => sum + d.hp, 0);
              updatedCombat.initialDefenderCount += interceptingDivisions.length;
            }

            nextCombats[combatIndex] = updatedCombat;
            
            console.log(`[REINFORCEMENTS] ${divisions.length} ${owner} divisions joined the attackers in combat at ${to.name}`);
            
            const reinforcementEvent = createGameEvent(
              'combat_victory',
              `Reinforcements Arrive!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} reinforcements (${divisions.length} divisions) have joined the attack on ${to.name}.`,
              currentDate,
              owner,
              toRegion
            );
            nextEvents.push(reinforcementEvent);
          } else if (owner === ongoingCombat.defenderCountry) {
            // Join the defenders
            const totalDivisionsToAdd = [...divisions, ...interceptingDivisions];
            const updatedCombat = {
              ...ongoingCombat,
              defenderDivisions: [...ongoingCombat.defenderDivisions, ...totalDivisionsToAdd],
              initialDefenderHp: ongoingCombat.initialDefenderHp + totalDivisionsToAdd.reduce((sum, d) => sum + d.hp, 0),
              initialDefenderCount: ongoingCombat.initialDefenderCount + totalDivisionsToAdd.length,
            };

            // If we intercepted counter-movements, sort them by owner and add to the correct side.
            // Any intercepted unit belonging to the attacker side joins the attackers;
            // everything else (rare edge case) stays with defenders.
            if (interceptingDivisions.length > 0) {
              const interceptedAttackers = counterMovements
                .filter(m => m.owner === ongoingCombat.attackerCountry)
                .flatMap(m => m.divisions);
              const interceptedDefenders = counterMovements
                .filter(m => m.owner !== ongoingCombat.attackerCountry)
                .flatMap(m => m.divisions);

              if (interceptedAttackers.length > 0) {
                updatedCombat.attackerDivisions = [...updatedCombat.attackerDivisions, ...interceptedAttackers];
                updatedCombat.initialAttackerHp += interceptedAttackers.reduce((sum, d) => sum + d.hp, 0);
                updatedCombat.initialAttackerCount += interceptedAttackers.length;
                // Remove them from the defender slice added above
                updatedCombat.defenderDivisions = updatedCombat.defenderDivisions.filter(d => !interceptedAttackers.includes(d));
              }
              if (interceptedDefenders.length > 0) {
                // already included via totalDivisionsToAdd above; nothing extra needed
              }
            }

            nextCombats[combatIndex] = updatedCombat;
            
            console.log(`[REINFORCEMENTS] ${divisions.length} ${owner} divisions joined the defenders in combat at ${to.name}`);
            
            const reinforcementEvent = createGameEvent(
              'combat_victory',
              `Reinforcements Arrive!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} reinforcements (${divisions.length} divisions) have arrived to defend ${to.name}.`,
              currentDate,
              owner,
              toRegion
            );
            nextEvents.push(reinforcementEvent);
          }
        } else {
          // No ongoing combat - follow standard combat/occupation logic
          const existingDefenderDivisions = to.divisions.filter(d => d.owner === to.owner);
          const totalDefenderDivisions = [...existingDefenderDivisions, ...interceptingDivisions];

          // Check for other combats on the same defender region (multi-front).
          // If defender divisions are absent from the region (already pulled into another combat),
          // use those combat divisions as the effective defenders.
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
            const previousOwner = to.owner;
            nextRegions[toRegion] = {
              ...to,
              owner: owner,
              divisions: divisions,
            };
            const captureEvent = createGameEvent(
              'region_captured',
              `${to.name} Captured!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} forces captured the undefended region of ${to.name}.`,
              currentDate,
              owner,
              toRegion
            );
            nextEvents.push(captureEvent);
            nextNotifications.push(createNotification(captureEvent, currentDate));
            // Also notify the previous owner that they lost the region
            const lostEvent = createGameEvent(
              'region_lost',
              `${to.name} Lost!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} forces captured your undefended region of ${to.name}.`,
              currentDate,
              previousOwner,
              toRegion
            );
            nextEvents.push(lostEvent);
            nextNotifications.push(createNotification(lostEvent, currentDate));

            // After capturing, continue the multi-step route if there are more hops
            if (movement.remainingPath && movement.remainingPath.length > 0) {
              // The region is now ours — dispatch next hop from the freshly captured region
              const updatedMovement = { ...movement };
              // Update regions snapshot so next hop sees the captured region as ours
              _dispatchNextHop(updatedMovement, nextRegions, currentDate, newHopMovements, context);
            }
          } else {
            // Initiate new combat
            const combatDefenderDivisions = effectiveDefenderDivisions;
            const fromRegionState = nextRegions[movement.fromRegion];
            const newCombat = createActiveCombat(
              movement.fromRegion,
              fromRegionState?.name ?? movement.fromRegion,
              toRegion,
              to.name,
              owner,
              to.owner,
              divisions,
              combatDefenderDivisions,
              currentDate
            );
            nextCombats.push(newCombat);
            // Only clear defender divisions on first combat on this region
            const isFirstCombatOnRegion = otherCombatsOnRegion.length === 0 && totalDefenderDivisions.length > 0;
            if (isFirstCombatOnRegion) {
              nextRegions[toRegion] = { ...to, divisions: [] };
            }
            const battleEvent = createGameEvent(
              'combat_victory',
              `Battle for ${to.name} Begins!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} forces (${divisions.length} divisions) are attacking ${to.owner === 'soviet' ? 'Soviet' : 'White'} defenders (${combatDefenderDivisions.length} divisions) at ${to.name}.`,
              currentDate,
              owner,
              toRegion
            );
            nextEvents.push(battleEvent);
            // Note: multi-step is halted when combat occurs; the player must re-issue orders
            // after the battle resolves.
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

  const nextHop: Movement = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    fromRegion: fromRegionId,
    toRegion: nextRegionId,
    divisions: movement.divisions,
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

/**
 * Applies finished combat results to regions
 */
export function applyFinishedCombats(
  finishedCombats: ActiveCombat[],
  regions: Record<string, Region>
): Record<string, Region> {
  const nextRegions = { ...regions };

  finishedCombats.forEach(combat => {
    if (combat.victor === combat.attackerCountry) {
      // Attacker wins: move attacker divisions into the defender's region
      const defenderRegion = nextRegions[combat.defenderRegionId];
      if (!defenderRegion) return;
      const existingAttackerDivs = defenderRegion.divisions.filter(d => d.owner === combat.attackerCountry);
      nextRegions[combat.defenderRegionId] = {
        ...defenderRegion,
        owner: combat.attackerCountry,
        divisions: [...existingAttackerDivs, ...combat.attackerDivisions],
      };
    } else {
      // Defender wins: return attacker divisions to their origin region
      const attackerRegion = nextRegions[combat.attackerRegionId];
      if (attackerRegion) {
        nextRegions[combat.attackerRegionId] = {
          ...attackerRegion,
          divisions: [...attackerRegion.divisions, ...combat.attackerDivisions],
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

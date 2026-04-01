import { Movement, ActiveCombat } from '../../types/game';
import {
  buildCanEnterPredicate,
  buildIsHostilePredicate,
  computeFrontline,
  assignDivisionsToFrontline,
} from '../../utils/pathfinding';
import { calculateDistance, calculateTravelTime } from '../../utils/distance';
import { createActiveCombat } from '../../utils/combat';
import { createGameEvent } from '../../utils/eventUtils';
import { GameStore } from './types';

/**
 * Advances an army group using a HOI4-style frontline assignment strategy.
 *
 * Strategy:
 * 1. Compute the frontline — the set of friendly regions adjacent to accessible
 *    enemy provinces — and the set of immediate attack targets.
 * 2. Phase 1 (fill): Route rear divisions (not yet on the frontline) one BFS
 *    step toward the nearest under-staffed frontline slot (a slot with 0 group
 *    divisions).
 * 3. Phase 2 (push): Frontline regions with surplus divisions (>1 group div)
 *    send excess divisions directly into adjacent target regions.
 * 4. Each assignment becomes a Movement; hostile targets also get an
 *    ActiveCombat created (or reuse an existing one).
 */
export function advanceArmyGroup(
  groupId: string,
  state: GameStore,
  setState: (partial: Partial<GameStore>) => void
) {
  const {
    armyGroups, regions, adjacency, dateTime, movingUnits,
    selectedUnitRegion, relationships, activeCombats, gameEvents,
    regionCentroids,
  } = state;

  const group = armyGroups.find(g => g.id === groupId);
  if (!group) return;

  const countryId = group.owner;

  // Build access predicate once — reused for all pathfinding calls this tick
  const canEnter = buildCanEnterPredicate(countryId, regions, relationships);
  // Hostile predicate: only regions we are actively at war with are valid attack targets.
  // This prevents advance mode from marching into military_access or autonomy territory.
  const isHostile = buildIsHostilePredicate(countryId, regions, relationships);

  // -------------------------------------------------------------------------
  // Step 1: Compute frontline and targets
  // -------------------------------------------------------------------------
  const frontline = computeFrontline(groupId, regions, adjacency, countryId, canEnter, isHostile);
  if (frontline.frontlineRegions.size === 0 && frontline.targetRegions.size === 0) {
    // No accessible enemy nearby — nothing to do this tick
    return;
  }

  // -------------------------------------------------------------------------
  // Step 2: Produce the full assignment list
  // -------------------------------------------------------------------------
  const assignments = assignDivisionsToFrontline(
    groupId,
    regions,
    adjacency,
    countryId,
    frontline,
    movingUnits,
    canEnter,
  );

  if (assignments.length === 0) return;

  // -------------------------------------------------------------------------
  // Step 3: Convert assignments into Movements (and ActiveCombats where needed)
  // -------------------------------------------------------------------------
  const newMovements: Movement[] = [];
  const newCombats: ActiveCombat[] = [];
  let newEvents = [...gameEvents];
  const newRegions = { ...regions };
  const movedRegions = new Set<string>();
  const targetRegionIds = new Set<string>();

  // Group assignments by (fromRegion, toRegion) so we create one Movement per
  // (source, destination) pair rather than one per division.
  const bySourceDest = new Map<string, { fromRegion: string; toRegion: string; divIds: string[] }>();
  for (const a of assignments) {
    const key = `${a.fromRegion}::${a.toRegion}`;
    if (!bySourceDest.has(key)) {
      bySourceDest.set(key, { fromRegion: a.fromRegion, toRegion: a.toRegion, divIds: [] });
    }
    bySourceDest.get(key)!.divIds.push(a.divisionId);
  }

  for (const { fromRegion, toRegion, divIds } of bySourceDest.values()) {
    const sourceRegion = newRegions[fromRegion];
    const destRegion = newRegions[toRegion];
    if (!sourceRegion || !destRegion) continue;

    // Collect the actual Division objects
    const divsForMove = sourceRegion.divisions.filter(d => divIds.includes(d.id));
    if (divsForMove.length === 0) continue;

    // Access check — canEnter already validated for advance targets but be
    // defensive for reinforcement paths through own territory.
    if (destRegion.owner !== countryId && !canEnter(toRegion)) continue;

    const distanceKm = calculateDistance(fromRegion, toRegion, regionCentroids);
    const travelTimeHours = calculateTravelTime(distanceKm, false);
    const arrivalTime = new Date(dateTime);
    arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

    // Determine hostility of the destination
    const theyGrantUs = relationships.find(
      r => r.fromCountry === destRegion.owner && r.toCountry === countryId
    )?.type ?? 'neutral';
    const weDeclared = relationships.find(
      r => r.fromCountry === countryId && r.toCountry === destRegion.owner
    )?.type ?? 'neutral';
    const destAutonomy = theyGrantUs === 'autonomy' || weDeclared === 'autonomy';
    const isEnemy = destRegion.owner !== countryId;
    const isHostile = isEnemy && !destAutonomy && theyGrantUs !== 'military_access';

    let pendingCombatId: string | undefined;

    if (isHostile) {
      const existingCombat = [...activeCombats, ...newCombats].find(
        c => c.regionId === toRegion && !c.isComplete
      );
      if (existingCombat) {
        pendingCombatId = existingCombat.id;
      } else {
        const defenderDivisions = destRegion.divisions.filter(d => d.owner === destRegion.owner);
        if (defenderDivisions.length > 0) {
          const newCombat = createActiveCombat(
            toRegion,
            destRegion.name,
            countryId,
            destRegion.owner,
            divsForMove,
            defenderDivisions,
            dateTime
          );
          pendingCombatId = newCombat.id;
          newCombats.push(newCombat);
          newRegions[toRegion] = { ...destRegion, divisions: [] };

          const battleEvent = createGameEvent(
            'combat_victory',
            `Battle for ${destRegion.name} Begins!`,
            `${countryId} forces (${divsForMove.length} div) advance on ${destRegion.owner} defenders (${defenderDivisions.length} div) at ${destRegion.name}.`,
            dateTime,
            countryId,
            toRegion
          );
          newEvents = [...newEvents, battleEvent];
        }
      }
    }

    const newMovement: Movement = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${fromRegion}-${toRegion}`,
      fromRegion,
      toRegion,
      divisions: divsForMove,
      departureTime: new Date(dateTime),
      arrivalTime,
      owner: countryId,
      ...(pendingCombatId ? { pendingCombatId } : {}),
    };

    newMovements.push(newMovement);
    targetRegionIds.add(toRegion);

    // Remove dispatched divisions from the source region
    const dispatchedIds = new Set(divIds);
    newRegions[fromRegion] = {
      ...sourceRegion,
      divisions: sourceRegion.divisions.filter(d => !dispatchedIds.has(d.id)),
    };
    movedRegions.add(fromRegion);
  }

  if (newMovements.length > 0) {
    const shouldClearSelection = selectedUnitRegion && movedRegions.has(selectedUnitRegion);

    const updatedArmyGroups = armyGroups.map(g => {
      if (g.id === groupId) {
        const newRegionIds = new Set([...g.regionIds, ...Array.from(targetRegionIds)]);
        return { ...g, regionIds: Array.from(newRegionIds) };
      }
      return g;
    });

    setState({
      regions: newRegions,
      movingUnits: [...movingUnits, ...newMovements],
      armyGroups: updatedArmyGroups,
      activeCombats: [...activeCombats, ...newCombats],
      gameEvents: newEvents,
      ...(shouldClearSelection && { selectedUnitRegion: null }),
    });
  }
}

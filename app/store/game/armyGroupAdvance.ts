import { Movement, ActiveCombat, Division } from '../../types/game';
import { buildCanEnterPredicate, findAllAdvanceTargets } from '../../utils/pathfinding';
import { calculateDistance, calculateTravelTime } from '../../utils/distance';
import { createActiveCombat } from '../../utils/combat';
import { createGameEvent } from '../../utils/eventUtils';
import { GameStore } from './types';

/**
 * Advances an army group by spreading its divisions toward enemy positions.
 *
 * Strategy:
 * 1. For each region with group divisions, find ALL valid adjacent targets
 *    (accessible enemy/foreign regions). Each division fans out to a different
 *    target instead of the whole stack moving to one place.
 * 2. Excess divisions (more than available targets) reinforce the nearest
 *    ongoing combat rather than sitting idle.
 * 3. Pathfinding respects diplomatic access — neutral and foreign regions
 *    require war or military access to enter/traverse.
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

  const newMovements: Movement[] = [];
  const newRegions = { ...regions };
  const movedRegions = new Set<string>();
  const targetRegions = new Set<string>();
  const newCombats: ActiveCombat[] = [];
  let newEvents = [...gameEvents];

  // All regions with divisions from this group that aren't already dispatching
  const regionsWithGroupDivisions = Object.keys(newRegions).filter(regionId => {
    const region = newRegions[regionId];
    if (!region || region.owner !== countryId) return false;
    return region.divisions.some(d => d.armyGroupId === groupId);
  });

  for (const regionId of regionsWithGroupDivisions) {
    const region = newRegions[regionId];
    if (!region || region.divisions.length === 0) continue;

    const divisionsInGroup = region.divisions.filter(d => d.armyGroupId === groupId);
    if (divisionsInGroup.length === 0) continue;

    // Skip if any division from this group is already in transit from here
    const groupAlreadyMoving = movingUnits.some(m =>
      m.fromRegion === regionId &&
      m.divisions.some(d => d.armyGroupId === groupId)
    );
    if (groupAlreadyMoving) continue;

    // --- Find all valid advance targets from this region ---
    const targets = findAllAdvanceTargets(regionId, newRegions, adjacency, countryId, canEnter);
    if (targets.length === 0) continue;

    // Assign one division per target (round-robin), remainder goes to reinforce
    const assignedPairs: Array<{ division: Division; target: string }> = [];
    for (let i = 0; i < Math.min(divisionsInGroup.length, targets.length); i++) {
      assignedPairs.push({ division: divisionsInGroup[i], target: targets[i % targets.length] });
    }

    // Excess divisions — find nearest active (non-complete) combat to reinforce
    const excessDivisions = divisionsInGroup.slice(targets.length);
    if (excessDivisions.length > 0) {
      const ongoingCombats = [...activeCombats, ...newCombats].filter(c => !c.isComplete);
      if (ongoingCombats.length > 0) {
        // Pick the ongoing combat closest to this region (by distance to combat region)
        let bestCombat = ongoingCombats[0];
        let bestDist = calculateDistance(regionId, bestCombat.regionId, regionCentroids);
        for (const c of ongoingCombats.slice(1)) {
          const d = calculateDistance(regionId, c.regionId, regionCentroids);
          if (d < bestDist) { bestDist = d; bestCombat = c; }
        }
        // Route each excess division toward the combat region's first step
        // (they'll all share the same target but as separate movements)
        for (const div of excessDivisions) {
          assignedPairs.push({ division: div, target: bestCombat.regionId });
        }
      }
      // If no ongoing combats, excess divisions stay put (nothing to reinforce)
    }

    if (assignedPairs.length === 0) continue;

    // Group pairs by target so we create one movement per (source, target) pair
    const byTarget = new Map<string, Division[]>();
    for (const { division, target } of assignedPairs) {
      if (!byTarget.has(target)) byTarget.set(target, []);
      byTarget.get(target)!.push(division);
    }

    for (const [nextStep, divsForTarget] of byTarget) {
      const dest = newRegions[nextStep];
      if (!dest) continue;

      // Access check (canEnter already validated for advance targets, but
      // reinforcement targets may be own territory with a combat)
      if (dest.owner !== countryId && !canEnter(nextStep)) continue;

      const distanceKm = calculateDistance(regionId, nextStep, regionCentroids);
      const travelTimeHours = calculateTravelTime(distanceKm, false);
      const arrivalTime = new Date(dateTime);
      arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

      // Determine hostility
      const theyGrantUs = relationships.find(
        r => r.fromCountry === dest.owner && r.toCountry === countryId
      )?.type ?? 'neutral';
      const weDeclared = relationships.find(
        r => r.fromCountry === countryId && r.toCountry === dest.owner
      )?.type ?? 'neutral';
      const destAutonomy = theyGrantUs === 'autonomy' || weDeclared === 'autonomy';
      const isEnemy = dest.owner !== countryId;
      const isHostile = isEnemy && !destAutonomy && theyGrantUs !== 'military_access';

      let pendingCombatId: string | undefined;

      if (isHostile) {
        const existingCombat = [...activeCombats, ...newCombats].find(
          c => c.regionId === nextStep && !c.isComplete
        );
        if (existingCombat) {
          pendingCombatId = existingCombat.id;
        } else {
          const defenderDivisions = dest.divisions.filter(d => d.owner === dest.owner);
          if (defenderDivisions.length > 0) {
            const newCombat = createActiveCombat(
              nextStep,
              dest.name,
              countryId,
              dest.owner,
              divsForTarget,
              defenderDivisions,
              dateTime
            );
            pendingCombatId = newCombat.id;
            newCombats.push(newCombat);
            newRegions[nextStep] = { ...dest, divisions: [] };

            const battleEvent = createGameEvent(
              'combat_victory',
              `Battle for ${dest.name} Begins!`,
              `${countryId} forces (${divsForTarget.length} div) advance on ${dest.owner} defenders (${defenderDivisions.length} div) at ${dest.name}.`,
              dateTime,
              countryId,
              nextStep
            );
            newEvents = [...newEvents, battleEvent];
          }
        }
      }

      const newMovement: Movement = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${regionId}-${nextStep}`,
        fromRegion: regionId,
        toRegion: nextStep,
        divisions: divsForTarget,
        departureTime: new Date(dateTime),
        arrivalTime,
        owner: countryId,
        ...(pendingCombatId ? { pendingCombatId } : {}),
      };

      newMovements.push(newMovement);
      targetRegions.add(nextStep);
    }

    // Remove all dispatched divisions from the source region in one pass
    const dispatchedIds = new Set(assignedPairs.map(p => p.division.id));
    newRegions[regionId] = {
      ...region,
      divisions: region.divisions.filter(d => !dispatchedIds.has(d.id)),
    };
    movedRegions.add(regionId);
  }

  if (newMovements.length > 0) {
    const shouldClearSelection = selectedUnitRegion && movedRegions.has(selectedUnitRegion);

    const updatedArmyGroups = armyGroups.map(g => {
      if (g.id === groupId) {
        const newRegionIds = new Set([...g.regionIds, ...Array.from(targetRegions)]);
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

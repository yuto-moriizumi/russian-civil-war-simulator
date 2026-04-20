import { Movement, ActiveCombat } from '../../types/game';
import { getNextStepToward, buildCanEnterPredicate, buildIsHostilePredicate } from '../../utils/pathfinding';
import { calculateDistance, calculateTravelTime } from '../../utils/distance';
import { createActiveCombat } from '../../utils/combat';
import { createGameEvent } from '../../utils/eventUtils';
import { GameStore } from './types';

/**
 * Attacks with an army group using a two-phase strategy:
 *
 * Phase 1 (Defend): Identical to defendArmyGroup — distributes divisions
 *   proportionally to border regions (own regions adjacent to hostile territory).
 *
 * Phase 2 (Attack): After Phase 1 has positioned units, border regions advance
 *   into adjacent accessible hostile regions. Three cases trigger an advance:
 *   - Surplus: the border holds more divisions than its allocation target.
 *   - Single-enemy auto-advance: the border has one adjacent hostile target.
 *     All stationary divisions advance there, even when allocation would
 *     otherwise keep a garrison behind.
 *   - Safe-advance: when there are multiple hostile targets, borders with
 *     multiple divisions can advance all but one division as a garrison.
 *   Borders that already dispatched units in Phase 1 are skipped to avoid
 *   double-moving, except for the single-enemy auto-advance case.
 */
export function attackArmyGroup(
  groupId: string,
  state: GameStore,
  setState: (partial: Partial<GameStore>) => void
) {
  const {
    armyGroups, regions, adjacency, dateTime, movingUnits,
    selectedUnitRegion, theaters, relationships, activeCombats,
    gameEvents, regionCentroids,
  } = state;

  const group = armyGroups.find(g => g.id === groupId);
  if (!group) return;

  const countryId = group.owner;

  const canEnter = buildCanEnterPredicate(countryId, regions, relationships);
  const isHostile = buildIsHostilePredicate(countryId, regions, relationships);

  // Find the theater this group belongs to
  const theater = group.theaterId ? theaters.find(t => t.id === group.theaterId) : null;

  // ── Phase 1 Step 1: Find border regions ──────────────────────────────────────
  const allBorderRegions: string[] = [];
  for (const [regionId, region] of Object.entries(regions)) {
    if (!region || region.owner !== countryId) continue;
    if (theater && !theater.frontlineRegions.includes(regionId)) continue;

    const hasEnemyNeighbor = (adjacency[regionId] || []).some(neighborId => {
      const neighbor = regions[neighborId];
      return neighbor && neighbor.owner !== countryId && isHostile(neighborId);
    });

    if (hasEnemyNeighbor) allBorderRegions.push(regionId);
  }

  if (allBorderRegions.length === 0) return;

  const borderSet = new Set(allBorderRegions);

  // ── Phase 1 Step 2: Committed counts (present + in-transit directly to border) ─
  const committedAtBorder = new Map<string, number>();
  allBorderRegions.forEach(id => {
    const present = regions[id]?.divisions.filter(d => d.armyGroupId === groupId).length ?? 0;
    committedAtBorder.set(id, present);
  });

  // In-transit division IDs — present in regions but already committed to movement.
  // Track ALL country divisions in transit regardless of armyGroupId: syncAIArmyGroupsToTheaters
  // may reassign a division's armyGroupId inside a movement without updating the source region,
  // causing the army group to re-dispatch the same division each tick and accumulate duplicates.
  const inTransitDivisionIds = new Set<string>();
  movingUnits.forEach(m => {
    if (m.owner !== countryId) return;
    m.divisions.forEach(d => { inTransitDivisionIds.add(d.id); });
  });

  movingUnits.forEach(m => {
    if (m.owner !== countryId) return;
    const count = m.divisions.filter(d => d.armyGroupId === groupId).length;
    if (count > 0 && borderSet.has(m.toRegion)) {
      committedAtBorder.set(m.toRegion, (committedAtBorder.get(m.toRegion) ?? 0) + count);
    }
  });

  // ── Phase 1 Step 3: Total group divisions (stationary only; in-transit are counted via movingUnits) ──
  let totalGroupDivisions = 0;
  Object.values(regions).forEach(region => {
    if (!region) return;
    totalGroupDivisions += region.divisions.filter(
      d => d.armyGroupId === groupId && d.owner === countryId && !inTransitDivisionIds.has(d.id)
    ).length;
  });
  // Add in-transit divisions
  movingUnits.forEach(m => {
    if (m.owner !== countryId) return;
    totalGroupDivisions += m.divisions.filter(d => d.armyGroupId === groupId).length;
  });

  // ── Phase 1 Step 4: Allocation targets ───────────────────────────────────────
  const targetPerBorder = Math.floor(totalGroupDivisions / allBorderRegions.length);
  const remainder = totalGroupDivisions % allBorderRegions.length;

  const allocationTarget = new Map<string, number>();
  allBorderRegions.forEach((id, i) => {
    allocationTarget.set(id, targetPerBorder + (i < remainder ? 1 : 0));
  });

  // ── Phase 1 Step 5: Needy borders ────────────────────────────────────────────
  const needyBorders = allBorderRegions.filter(id =>
    (committedAtBorder.get(id) ?? 0) < (allocationTarget.get(id) ?? 0)
  );

  // ── Phase 1 Step 6: Available divisions ──────────────────────────────────────
  const availableDivisions: { divisionId: string; regionId: string }[] = [];
  Object.entries(regions).forEach(([regionId, region]) => {
    if (!region) return;
    const groupDivs = region.divisions.filter(
      d => d.armyGroupId === groupId && d.owner === countryId && !inTransitDivisionIds.has(d.id)
    );
    if (groupDivs.length === 0) return;

    if (borderSet.has(regionId)) {
      const target = allocationTarget.get(regionId) ?? 0;
      const committed = committedAtBorder.get(regionId) ?? 0;
      const excess = Math.max(0, committed - target);
      groupDivs.slice(groupDivs.length - excess).forEach(d =>
        availableDivisions.push({ divisionId: d.id, regionId })
      );
    } else {
      groupDivs.forEach(d => availableDivisions.push({ divisionId: d.id, regionId }));
    }
  });

  // ── Phase 1 Step 7: Assign available divisions to needy borders ───────────────
  const newMovements: Movement[] = [];
  const newRegions = { ...regions };
  const movedRegions = new Set<string>();
  const targetRegionSet = new Set<string>();

  // Track which borders received Phase 1 movements (for Phase 2 skip logic)
  const bordersDispatchedInPhase1 = new Set<string>();

  if (needyBorders.length > 0) {
    // Only skip Phase 1 dispatch if in-transit units already cover the entire deficit
    const totalDeficit = needyBorders.reduce(
      (s, id) => s + ((allocationTarget.get(id) ?? 0) - (committedAtBorder.get(id) ?? 0)), 0
    );

    if (inTransitDivisionIds.size < totalDeficit) {
      const availBySource = new Map<string, string[]>();
      availableDivisions.forEach(({ divisionId, regionId }) => {
        if (!availBySource.has(regionId)) availBySource.set(regionId, []);
        availBySource.get(regionId)!.push(divisionId);
      });

      // BN-2: memoize getNextStepToward results across the (source × border) loop.
      // canEnter and adjacency are both constant within a single tick, so each
      // (from, to) pair always yields the same first-step.
      const nextStepCache = new Map<string, string | null>();
      const cachedNextStep = (from: string, to: string): string | null => {
        const key = `${from}|${to}`;
        if (nextStepCache.has(key)) return nextStepCache.get(key)!;
        const result = getNextStepToward(from, to, adjacency, canEnter);
        nextStepCache.set(key, result);
        return result;
      };

      for (const borderRegionId of needyBorders) {
        const target = allocationTarget.get(borderRegionId) ?? 0;
        let committed = committedAtBorder.get(borderRegionId) ?? 0;

        for (const [sourceRegionId, divIds] of availBySource) {
          if (committed >= target) break;
          if (divIds.length === 0) continue;

          const alreadyMovingFromSource = movingUnits.some(m =>
            m.fromRegion === sourceRegionId &&
            m.owner === countryId &&
            m.divisions.some(d => d.armyGroupId === groupId && inTransitDivisionIds.has(d.id))
          );
          if (alreadyMovingFromSource) continue;

          if (sourceRegionId === borderRegionId) continue;

          const nextStep = cachedNextStep(sourceRegionId, borderRegionId);
          if (!nextStep) {
            console.warn(`[ATTACK] No valid path from ${sourceRegionId} to ${borderRegionId}`);
            continue;
          }

          const deficit = target - committed;
          const sendCount = Math.min(deficit, divIds.length);
          const divIdsToSend = divIds.splice(0, sendCount);

          const divsToSend = divIdsToSend
            .map(id => newRegions[sourceRegionId]?.divisions.find(d => d.id === id))
            .filter((d): d is NonNullable<typeof d> => d !== undefined);

          if (divsToSend.length === 0) continue;

          const distanceKm = calculateDistance(sourceRegionId, nextStep, regionCentroids);
          const travelTimeHours = calculateTravelTime(distanceKm, false);
          const arrivalTime = new Date(dateTime);
          arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

          newMovements.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${sourceRegionId}`,
            fromRegion: sourceRegionId,
            toRegion: nextStep,
            divisions: divsToSend,
            departureTime: new Date(dateTime),
            arrivalTime,
            owner: countryId,
          });

          // Divisions stay in the region; they are removed only when the movement completes.
          movedRegions.add(sourceRegionId);
          targetRegionSet.add(nextStep);
          divsToSend.forEach(d => inTransitDivisionIds.add(d.id));

          committed += divsToSend.length;

          // Track that this border received reinforcements in Phase 1
          bordersDispatchedInPhase1.add(borderRegionId);
        }
      }
    }
  }

  // ── Phase 2: Advance divisions from border regions ────────────────────────────
  const newCombats: ActiveCombat[] = [];
  let newEvents = [...gameEvents];

  for (const borderRegionId of allBorderRegions) {
    const target = allocationTarget.get(borderRegionId) ?? 0;

    // Count stationary group divisions still present at this border after Phase 1
    const stationaryDivs = (newRegions[borderRegionId]?.divisions ?? []).filter(
      d => d.armyGroupId === groupId && d.owner === countryId && !inTransitDivisionIds.has(d.id)
    );

    // Find adjacent hostile regions we can enter
    const attackTargets = (adjacency[borderRegionId] || []).filter(
      neighborId => isHostile(neighborId) && canEnter(neighborId)
    );
    if (attackTargets.length === 0) continue;

    const shouldAutoAdvanceSingleEnemy = attackTargets.length === 1 && stationaryDivs.length > 0;

    // Skip Phase 1-touched borders only when the explicit single-enemy advance
    // rule does not apply. Stationary divisions are filtered above, so this
    // cannot double-dispatch divisions already committed during Phase 1.
    if (!shouldAutoAdvanceSingleEnemy && bordersDispatchedInPhase1.has(borderRegionId)) continue;
    if (!shouldAutoAdvanceSingleEnemy && movedRegions.has(borderRegionId)) continue;

    // Determine which divisions advance:
    //   - Surplus case: border holds more than its allocation target → advance the excess.
    //   - Single-enemy auto-advance: exactly 1 hostile adjacent target → all stationary
    //     divisions advance there, so ATTACK mode never leaves that front idle.
    //   - Safe-advance: border holds more than 1 division → advance all but 1 as garrison,
    //     because at least 1 remaining division prevents enemies on ambiguous fronts
    //     from occupying the border.
    const surplus = Math.max(0, stationaryDivs.length - target);
    // When no surplus, still advance if we can leave a garrison behind (>1 divisions present).
    const effectiveAdvanceCount = surplus > 0 ? surplus : Math.max(0, stationaryDivs.length - 1);
    const attackDivisions = shouldAutoAdvanceSingleEnemy
      ? stationaryDivs
      : stationaryDivs.slice(stationaryDivs.length - effectiveAdvanceCount);
    if (attackDivisions.length === 0) continue;

    // Distribute advancing divisions round-robin across attack targets
    const divsByTarget = new Map<string, typeof attackDivisions>();
    attackTargets.forEach(t => divsByTarget.set(t, []));

    attackDivisions.forEach((div, i) => {
      const targetId = attackTargets[i % attackTargets.length];
      divsByTarget.get(targetId)!.push(div);
    });

    for (const [attackTargetId, divsForAttack] of divsByTarget) {
      if (divsForAttack.length === 0) continue;

      const destRegion = newRegions[attackTargetId];
      if (!destRegion) continue;

      const distanceKm = calculateDistance(borderRegionId, attackTargetId, regionCentroids);
      const travelTimeHours = calculateTravelTime(distanceKm, false);
      const arrivalTime = new Date(dateTime);
      arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

      let pendingCombatId: string | undefined;

      // Check if target region is truly hostile (not just accessible via military access)
      const existingCombat = [...activeCombats, ...newCombats].find(
        c => c.attackerRegionId === borderRegionId &&
             c.defenderRegionId === attackTargetId &&
             !c.isComplete
      );
      if (existingCombat) {
        pendingCombatId = existingCombat.id;
      } else {
        const inTransitFromDest = new Set(
          movingUnits.filter(m => m.fromRegion === attackTargetId).flatMap(m => m.divisions.map(d => d.id))
        );
        const defenderDivisions = destRegion.divisions.filter(d => d.owner === destRegion.owner && !inTransitFromDest.has(d.id));
        const hasActiveCombatAtDest = [...activeCombats, ...newCombats].some(c => c.defenderRegionId === attackTargetId && !c.isComplete);
        if (defenderDivisions.length > 0 || hasActiveCombatAtDest) {
          // Check for other combats on the same defender region (multi-front)
          const otherCombatsOnRegion = [...activeCombats, ...newCombats].filter(
            c => c.defenderRegionId === attackTargetId && !c.isComplete
          );
          const combatDefenderDivisions = otherCombatsOnRegion.length > 0
            ? otherCombatsOnRegion[0].defenderDivisions.map(d => ({ ...d }))
            : defenderDivisions;

          const newCombat = createActiveCombat(
            borderRegionId,
            newRegions[borderRegionId]?.name ?? borderRegionId,
            attackTargetId,
            destRegion.name,
            countryId,
            destRegion.owner,
            divsForAttack,
            combatDefenderDivisions,
            dateTime
          );
          pendingCombatId = newCombat.id;
          newCombats.push(newCombat);
          // Only clear defender divisions on first combat on this region
          const isFirstCombatOnRegion = otherCombatsOnRegion.length === 0;
          if (isFirstCombatOnRegion) {
            newRegions[attackTargetId] = { ...destRegion, divisions: [] };
          }

          const battleEvent = createGameEvent(
            'combat_victory',
            `Battle for ${destRegion.name} Begins!`,
            `${countryId} forces (${divsForAttack.length} div) advance on ${destRegion.owner} defenders (${defenderDivisions.length} div) at ${destRegion.name}.`,
            dateTime,
            countryId,
            attackTargetId
          );
          newEvents = [...newEvents, battleEvent];
        }
      }

      newMovements.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${borderRegionId}-${attackTargetId}`,
        fromRegion: borderRegionId,
        toRegion: attackTargetId,
        divisions: divsForAttack,
        departureTime: new Date(dateTime),
        arrivalTime,
        owner: countryId,
        ...(pendingCombatId ? { pendingCombatId } : {}),
      });

      targetRegionSet.add(attackTargetId);

      // Divisions stay in the region; they are removed only when the movement completes.
      movedRegions.add(borderRegionId);
      divsForAttack.forEach(d => inTransitDivisionIds.add(d.id));
    }
  }

  if (newMovements.length === 0) return;

  const shouldClearSelection = selectedUnitRegion && movedRegions.has(selectedUnitRegion);

  const updatedArmyGroups = armyGroups.map(g => {
    if (g.id === groupId) {
      const newRegionIds = new Set([...g.regionIds, ...Array.from(targetRegionSet)]);
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

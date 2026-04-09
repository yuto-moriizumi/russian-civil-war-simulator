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
 * Phase 2 (Attack): After Phase 1 has positioned units, border regions that
 *   still hold MORE divisions than their allocation target advance the surplus
 *   directly into adjacent accessible hostile regions. Borders that already
 *   dispatched units in Phase 1 are skipped to avoid double-moving.
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

  const inTransitDivisionIds = new Set<string>();
  movingUnits.forEach(m => {
    if (m.owner !== countryId) return;
    m.divisions.forEach(d => { if (d.armyGroupId === groupId) inTransitDivisionIds.add(d.id); });
  });

  movingUnits.forEach(m => {
    if (m.owner !== countryId) return;
    const count = m.divisions.filter(d => d.armyGroupId === groupId).length;
    if (count > 0 && borderSet.has(m.toRegion)) {
      committedAtBorder.set(m.toRegion, (committedAtBorder.get(m.toRegion) ?? 0) + count);
    }
  });

  // ── Phase 1 Step 3: Total group divisions ────────────────────────────────────
  let totalGroupDivisions = 0;
  Object.values(regions).forEach(region => {
    if (!region) return;
    totalGroupDivisions += region.divisions.filter(d => d.armyGroupId === groupId && d.owner === countryId).length;
  });
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

      for (const borderRegionId of needyBorders) {
        const target = allocationTarget.get(borderRegionId) ?? 0;
        let committed = committedAtBorder.get(borderRegionId) ?? 0;

        for (const [sourceRegionId, divIds] of availBySource) {
          if (committed >= target) break;
          if (divIds.length === 0) continue;

          const alreadyMovingFromSource = movingUnits.some(m =>
            m.fromRegion === sourceRegionId &&
            m.owner === countryId &&
            m.divisions.some(d => d.armyGroupId === groupId)
          );
          if (alreadyMovingFromSource) continue;

          if (sourceRegionId === borderRegionId) continue;

          const nextStep = getNextStepToward(sourceRegionId, borderRegionId, adjacency, canEnter);
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

          newRegions[sourceRegionId] = {
            ...newRegions[sourceRegionId],
            divisions: newRegions[sourceRegionId].divisions.filter(
              d => !divsToSend.some(dfs => dfs.id === d.id)
            ),
          };

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

  // ── Phase 2: Advance surplus divisions from border regions ────────────────────
  const newCombats: ActiveCombat[] = [];
  let newEvents = [...gameEvents];

  for (const borderRegionId of allBorderRegions) {
    // Skip borders that already dispatched units in Phase 1 (as destination)
    if (bordersDispatchedInPhase1.has(borderRegionId)) continue;
    // Skip borders that had units moved away FROM them in Phase 1
    if (movedRegions.has(borderRegionId)) continue;

    const target = allocationTarget.get(borderRegionId) ?? 0;

    // Count stationary group divisions still present at this border after Phase 1
    const stationaryDivs = (newRegions[borderRegionId]?.divisions ?? []).filter(
      d => d.armyGroupId === groupId && d.owner === countryId && !inTransitDivisionIds.has(d.id)
    );
    const surplus = Math.max(0, stationaryDivs.length - target);
    if (surplus === 0) continue;

    // Find adjacent hostile regions we can enter
    const attackTargets = (adjacency[borderRegionId] || []).filter(
      neighborId => isHostile(neighborId) && canEnter(neighborId)
    );
    if (attackTargets.length === 0) continue;

    // Surplus divisions to advance (take from the end to preserve the garrison at front)
    const surplusDivs = stationaryDivs.slice(stationaryDivs.length - surplus);

    // Distribute surplus round-robin across attack targets
    const divsByTarget = new Map<string, typeof surplusDivs>();
    attackTargets.forEach(t => divsByTarget.set(t, []));

    surplusDivs.forEach((div, i) => {
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
        c => c.regionId === attackTargetId && !c.isComplete
      );
      if (existingCombat) {
        pendingCombatId = existingCombat.id;
      } else {
        const defenderDivisions = destRegion.divisions.filter(d => d.owner === destRegion.owner);
        if (defenderDivisions.length > 0) {
          const newCombat = createActiveCombat(
            attackTargetId,
            destRegion.name,
            countryId,
            destRegion.owner,
            divsForAttack,
            defenderDivisions,
            dateTime
          );
          pendingCombatId = newCombat.id;
          newCombats.push(newCombat);
          newRegions[attackTargetId] = { ...destRegion, divisions: [] };

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

      // Remove advanced divisions from the border region
      const advancedIds = new Set(divsForAttack.map(d => d.id));
      newRegions[borderRegionId] = {
        ...newRegions[borderRegionId],
        divisions: newRegions[borderRegionId].divisions.filter(d => !advancedIds.has(d.id)),
      };
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

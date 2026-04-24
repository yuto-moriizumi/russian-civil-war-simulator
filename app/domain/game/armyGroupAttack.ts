import { Movement, ActiveCombat, Division } from '../../types/game';
import { getNextStepToward, buildCanEnterPredicate, buildIsHostilePredicate } from '../../utils/pathfinding';
import { calculateDistance, calculateTravelTime } from '../../utils/distance';
import { createActiveCombat } from './combat';
import {
  addCombatReinforcements,
  findActiveCombatOnBorder,
  getCommittedDivisionIds,
} from './combatParticipation';
import { createGameEvent } from './eventUtils';
import { getCombatDefenders } from './divisionState';
import { EngineSimulationState, SimulationLogger, noOpLogger } from './engine/types';

/**
 * Pure version of attackArmyGroup: returns state delta instead of calling setState.
 * Returns null if no movements were created.
 */
export function attackArmyGroup(
  groupId: string,
  state: EngineSimulationState,
  logger: SimulationLogger = noOpLogger(),
): Partial<EngineSimulationState> | null {
  const {
    armyGroups, regions, adjacency, dateTime, movingUnits,
    theaters, relationships, activeCombats,
    gameEvents, regionCentroids, divisions,
  } = state;

  const group = armyGroups.find(g => g.id === groupId);
  if (!group) return null;

  const countryId = group.owner;
  const canEnter = buildCanEnterPredicate(countryId, regions, relationships);
  const isHostile = buildIsHostilePredicate(countryId, regions, relationships);
  const theater = group.theaterId ? theaters.find(t => t.id === group.theaterId) : null;
  const frontlineSet = theater ? new Set(theater.frontlineRegions) : null;

  // Build region→division index once: O(D) instead of O(R×D)
  const divisionsByRegion = new Map<string, Division[]>();
  for (const div of Object.values(divisions)) {
    if (!divisionsByRegion.has(div.regionId)) divisionsByRegion.set(div.regionId, []);
    divisionsByRegion.get(div.regionId)!.push(div);
  }
  const getDivsInRegion = (regionId: string): Division[] => divisionsByRegion.get(regionId) ?? [];

  // Cache activeCombats array to avoid repeated spread
  let allCombats = [...activeCombats];
  const engagedDivisionIds = getCommittedDivisionIds([], activeCombats);

  // Phase 1 Step 1: Find border regions
  const allBorderRegions: string[] = [];
  for (const [regionId, region] of Object.entries(regions)) {
    if (!region || region.owner !== countryId) continue;
    if (frontlineSet && !frontlineSet.has(regionId)) continue;
    const hasEnemyNeighbor = (adjacency[regionId] || []).some(neighborId => {
      const neighbor = regions[neighborId];
      return neighbor && neighbor.owner !== countryId && isHostile(neighborId);
    });
    if (hasEnemyNeighbor) allBorderRegions.push(regionId);
  }

  if (allBorderRegions.length === 0) return null;

  const borderSet = new Set(allBorderRegions);

  // Phase 1 Step 2: Committed counts
  const committedAtBorder = new Map<string, number>();
  allBorderRegions.forEach(id => {
    const present = getDivsInRegion(id).filter(d => d.armyGroupId === groupId).length;
    committedAtBorder.set(id, present);
  });

  const inTransitDivisionIds = new Set<string>();
  movingUnits.forEach(m => {
    if (m.owner !== countryId) return;
    (m.divisionIds ?? []).forEach(id => { inTransitDivisionIds.add(id); });
  });

  movingUnits.forEach(m => {
    if (m.owner !== countryId) return;
    const count = (m.divisionIds ?? []).filter(id => divisions[id]?.armyGroupId === groupId).length;
    if (count > 0 && borderSet.has(m.toRegion)) {
      committedAtBorder.set(m.toRegion, (committedAtBorder.get(m.toRegion) ?? 0) + count);
    }
  });

  // Phase 1 Step 3: Total group divisions
  let totalGroupDivisions = 0;
  Object.values(regions).forEach(region => {
    if (!region) return;
    totalGroupDivisions += getDivsInRegion(region.id).filter(
      d => d.armyGroupId === groupId && d.owner === countryId && !inTransitDivisionIds.has(d.id)
    ).length;
  });
  movingUnits.forEach(m => {
    if (m.owner !== countryId) return;
    totalGroupDivisions += m.divisionIds.filter(id => divisions[id]?.armyGroupId === groupId).length;
  });

  // Phase 1 Step 4: Allocation targets
  const targetPerBorder = Math.floor(totalGroupDivisions / allBorderRegions.length);
  const remainder = totalGroupDivisions % allBorderRegions.length;
  const allocationTarget = new Map<string, number>();
  allBorderRegions.forEach((id, i) => {
    allocationTarget.set(id, targetPerBorder + (i < remainder ? 1 : 0));
  });

  // Phase 1 Step 5: Needy borders
  const needyBorders = allBorderRegions.filter(id =>
    (committedAtBorder.get(id) ?? 0) < (allocationTarget.get(id) ?? 0)
  );

  // Phase 1 Step 6: Available divisions
  const availableDivisions: { divisionId: string; regionId: string }[] = [];
  Object.entries(regions).forEach(([regionId, region]) => {
    if (!region) return;
    const groupDivs = getDivsInRegion(regionId).filter(
      d =>
        d.armyGroupId === groupId &&
        d.owner === countryId &&
        !inTransitDivisionIds.has(d.id) &&
        !engagedDivisionIds.has(d.id)
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

  // Phase 1 Step 7: Assign to needy borders
  const newMovements: Movement[] = [];
  const newRegions = { ...regions };
  const newDivisions = { ...divisions };
  const movedRegions = new Set<string>();
  const targetRegionSet = new Set<string>();
  const bordersDispatchedInPhase1 = new Set<string>();

  if (needyBorders.length > 0) {
    const totalDeficit = needyBorders.reduce(
      (s, id) => s + ((allocationTarget.get(id) ?? 0) - (committedAtBorder.get(id) ?? 0)), 0
    );

    if (inTransitDivisionIds.size < totalDeficit) {
      const availBySource = new Map<string, string[]>();
      availableDivisions.forEach(({ divisionId, regionId }) => {
        if (!availBySource.has(regionId)) availBySource.set(regionId, []);
        availBySource.get(regionId)!.push(divisionId);
      });

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
            m.divisionIds.some(id => divisions[id]?.armyGroupId === groupId && inTransitDivisionIds.has(id))
          );
          if (alreadyMovingFromSource) continue;
          if (sourceRegionId === borderRegionId) continue;

          const nextStep = cachedNextStep(sourceRegionId, borderRegionId);
          if (!nextStep) {
            logger.warn(`[ATTACK] No valid path from ${sourceRegionId} to ${borderRegionId}`);
            continue;
          }

          const deficit = target - committed;
          const sendCount = Math.min(deficit, divIds.length);
          const divIdsToSend = divIds.splice(0, sendCount);
          const divsToSend = divIdsToSend
            .map(id => divisions[id])
            .filter((d): d is NonNullable<typeof d> => d !== undefined);
          if (divsToSend.length === 0) continue;

          const distanceKm = calculateDistance(sourceRegionId, nextStep, regionCentroids);
          const travelTimeHours = calculateTravelTime(distanceKm, false);
          const arrivalTime = new Date(dateTime);
          arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

          // Divisions keep their regionId — they are departing from this region.

          newMovements.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${sourceRegionId}`,
            fromRegion: sourceRegionId,
            toRegion: nextStep,
            divisionIds: divsToSend.map(d => d.id),
            departureTime: new Date(dateTime),
            arrivalTime,
            owner: countryId,
          });

          movedRegions.add(sourceRegionId);
          targetRegionSet.add(nextStep);
          divsToSend.forEach(d => inTransitDivisionIds.add(d.id));
          committed += divsToSend.length;
          bordersDispatchedInPhase1.add(borderRegionId);
        }
      }
    }
  }

  // Phase 2: Advance from border regions
  const newCombats: ActiveCombat[] = [];
  let newEvents = [...gameEvents];

  for (const borderRegionId of allBorderRegions) {
    const target = allocationTarget.get(borderRegionId) ?? 0;
    const stationaryDivs = getDivsInRegion(borderRegionId).filter(
      d =>
        d.armyGroupId === groupId &&
        d.owner === countryId &&
        !inTransitDivisionIds.has(d.id) &&
        !engagedDivisionIds.has(d.id)
    );

    const attackTargets = (adjacency[borderRegionId] || []).filter(
      neighborId => isHostile(neighborId) && canEnter(neighborId)
    );
    if (attackTargets.length === 0) continue;

    const shouldAutoAdvanceSingleEnemy = attackTargets.length === 1 && stationaryDivs.length > 0;
    if (!shouldAutoAdvanceSingleEnemy && bordersDispatchedInPhase1.has(borderRegionId)) continue;
    if (!shouldAutoAdvanceSingleEnemy && movedRegions.has(borderRegionId)) continue;

    const surplus = Math.max(0, stationaryDivs.length - target);
    const effectiveAdvanceCount = surplus > 0 ? surplus : Math.max(0, stationaryDivs.length - 1);
    const attackDivisions = shouldAutoAdvanceSingleEnemy
      ? stationaryDivs
      : stationaryDivs.slice(stationaryDivs.length - effectiveAdvanceCount);
    if (attackDivisions.length === 0) continue;

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
      const allKnownCombats = [...allCombats, ...newCombats];
      const existingCombat = findActiveCombatOnBorder(
        allKnownCombats,
        borderRegionId,
        attackTargetId,
      );
      if (existingCombat) {
        pendingCombatId = existingCombat.id;
        const combatIndex = newCombats.findIndex(c => c.id === existingCombat.id);
        if (combatIndex >= 0) {
          newCombats[combatIndex] = addCombatReinforcements(
            newCombats[combatIndex],
            countryId,
            divsForAttack,
          );
        } else {
          allCombats = allCombats.map(combat =>
            combat.id === existingCombat.id
              ? addCombatReinforcements(combat, countryId, divsForAttack)
              : combat,
          );
        }
      } else {
        // Divisions at the target region (including those currently moving away — regionId stays as source until arrival)
        const defenderDivisions = getDivsInRegion(attackTargetId).filter(d => d.owner === destRegion.owner);
        const hasActiveCombatAtDest = allKnownCombats.some(c => c.defenderRegionId === attackTargetId && !c.isComplete);
        if (defenderDivisions.length > 0 || hasActiveCombatAtDest) {
          const otherCombatsOnRegion = allKnownCombats.filter(
            c => c.defenderRegionId === attackTargetId && !c.isComplete
          );
          const combatDefenderDivisions = otherCombatsOnRegion.length > 0
            ? getCombatDefenders(newDivisions, otherCombatsOnRegion[0])
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
          // Defender divisions keep their regionId — they are defending this region.
          // Attacker divisions keep their regionId — they are departing from this region.

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

      // Divisions keep their regionId — they are departing from this region.

      newMovements.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${borderRegionId}-${attackTargetId}`,
        fromRegion: borderRegionId,
        toRegion: attackTargetId,
        divisionIds: divsForAttack.map(d => d.id),
        departureTime: new Date(dateTime),
        arrivalTime,
        owner: countryId,
        ...(pendingCombatId ? { pendingCombatId } : {}),
      });

      targetRegionSet.add(attackTargetId);
      movedRegions.add(borderRegionId);
      divsForAttack.forEach(d => inTransitDivisionIds.add(d.id));
    }
  }

  if (newMovements.length === 0) return null;

  const updatedArmyGroups = armyGroups.map(g => {
    if (g.id === groupId) {
      const newRegionIds = new Set([...g.regionIds, ...Array.from(targetRegionSet)]);
      return { ...g, regionIds: Array.from(newRegionIds) };
    }
    return g;
  });

  return {
    divisions: newDivisions,
    regions: newRegions,
    movingUnits: [...movingUnits, ...newMovements],
    armyGroups: updatedArmyGroups,
    activeCombats: [...allCombats, ...newCombats],
    gameEvents: newEvents,
  };
}

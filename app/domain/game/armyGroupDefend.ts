import { Movement, Division } from '../../types/game';
import { getNextStepToward, buildIsHostilePredicate } from '../../utils/pathfinding';
import { calculateDistance, calculateTravelTime } from '../../utils/distance';
import { EngineSimulationState, SimulationLogger, noOpLogger } from './engine/types';

/**
 * Pure version of defendArmyGroup: returns state delta instead of calling setState.
 * Returns null if no movements were created.
 */
export function defendArmyGroup(
  groupId: string,
  state: EngineSimulationState,
  logger: SimulationLogger = noOpLogger(),
): Partial<EngineSimulationState> | null {
  const { armyGroups, regions, adjacency, dateTime, movingUnits, theaters, relationships, divisions, regionCentroids } = state;

  const group = armyGroups.find(g => g.id === groupId);
  if (!group) return null;

  const countryId = group.owner;
  const isHostile = buildIsHostilePredicate(countryId, regions, relationships);
  const theater = group.theaterId ? theaters.find(t => t.id === group.theaterId) : null;
  const frontlineSet = theater ? new Set(theater.frontlineRegions) : null;

  // Build region→division index once: O(D) instead of O(R×D)
  const divisionsByRegion = new Map<string, Division[]>();
  for (const div of Object.values(divisions)) {
    if (div.regionId) {
      if (!divisionsByRegion.has(div.regionId)) divisionsByRegion.set(div.regionId, []);
      divisionsByRegion.get(div.regionId)!.push(div);
    }
  }
  const getDivsInRegion = (regionId: string): Division[] => divisionsByRegion.get(regionId) ?? [];

  // Step 1: Find border regions
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

  // Step 2: Committed counts
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

  // Step 3: Allocation targets
  let totalGroupDivisions = 0;
  Object.values(regions).forEach(region => {
    if (!region) return;
    totalGroupDivisions += getDivsInRegion(region.id).filter(
      d => d.armyGroupId === groupId && d.owner === countryId && !inTransitDivisionIds.has(d.id)
    ).length;
  });
  movingUnits.forEach(m => {
    if (m.owner !== countryId) return;
    const divIds = m.divisionIds ?? [];
    totalGroupDivisions += divIds.filter(id => divisions[id]?.armyGroupId === groupId).length;
  });

  const targetPerBorder = Math.floor(totalGroupDivisions / allBorderRegions.length);
  const remainder = totalGroupDivisions % allBorderRegions.length;
  const allocationTarget = new Map<string, number>();
  allBorderRegions.forEach((id, i) => {
    allocationTarget.set(id, targetPerBorder + (i < remainder ? 1 : 0));
  });

  // Step 4: Needy borders
  const needyBorders = allBorderRegions.filter(id =>
    (committedAtBorder.get(id) ?? 0) < (allocationTarget.get(id) ?? 0)
  );
  if (needyBorders.length === 0) return null;

  const totalDeficit = needyBorders.reduce(
    (s, id) => s + ((allocationTarget.get(id) ?? 0) - (committedAtBorder.get(id) ?? 0)), 0
  );
  if (inTransitDivisionIds.size >= totalDeficit) return null;

  // Step 5: Available divisions
  const availableDivisions: { divisionId: string; regionId: string }[] = [];
  Object.entries(regions).forEach(([regionId, region]) => {
    if (!region) return;
    const groupDivs = getDivsInRegion(regionId).filter(
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

  if (availableDivisions.length === 0) return null;

  // Step 6: Create movements
  const newMovements: Movement[] = [];
  const newRegions = { ...regions };
  const newDivisions = { ...divisions };
  const movedRegions = new Set<string>();
  const targetRegionSet = new Set<string>();

  const availBySource = new Map<string, string[]>();
  availableDivisions.forEach(({ divisionId, regionId }) => {
    if (!availBySource.has(regionId)) availBySource.set(regionId, []);
    availBySource.get(regionId)!.push(divisionId);
  });

  const canEnterFriendlyOnly = (regionId: string): boolean =>
    regions[regionId]?.owner === countryId;

  const nextStepCache = new Map<string, string | null>();
  const cachedNextStep = (from: string, to: string): string | null => {
    const key = `${from}|${to}`;
    if (nextStepCache.has(key)) return nextStepCache.get(key)!;
    const result = getNextStepToward(from, to, adjacency, canEnterFriendlyOnly);
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
        logger.warn(`[DEFEND] No valid path from ${sourceRegionId} to ${borderRegionId}`);
        continue;
      }
      if (regions[nextStep]?.owner !== countryId) continue;

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

      for (const d of divsToSend) {
        newDivisions[d.id] = { ...d, regionId: null };
      }

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
  };
}

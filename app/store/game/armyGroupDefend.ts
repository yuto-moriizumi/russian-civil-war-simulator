import { getDivisionsInRegion } from '../../utils/divisionState';
import { Movement } from '../../types/game';
import { getNextStepToward, buildIsHostilePredicate } from '../../utils/pathfinding';
import { calculateDistance, calculateTravelTime } from '../../utils/distance';
import { GameStore } from './types';

/**
 * Defends an army group by redistributing its divisions to border regions.
 *
 * Movement is only triggered when a division is:
 *   1. Not already at a border region, AND
 *   2. There is a border region whose committed count (present + in-transit)
 *      is below its allocation target.
 *
 * This prevents the two main causes of endless movement:
 *   a) Divisions already at a border being repeatedly pulled away and sent
 *      back due to integer rounding.
 *   b) New movements being dispatched to a border that already has
 *      reinforcements en route (in-transit divisions are counted as committed).
 */
export function defendArmyGroup(
  groupId: string,
  state: GameStore,
  setState: (partial: Partial<GameStore>) => void
) {
  const { armyGroups, regions, adjacency, dateTime, movingUnits, selectedUnitRegion, theaters, relationships, divisions } = state;
  
  const group = armyGroups.find(g => g.id === groupId);
  if (!group) return;
  
  // Use the army group's owner country instead of selectedCountry to support AI
  const countryId = group.owner;

  // Only treat regions we are actively at war with as borders worth defending.
  // military_access and autonomy neighbors must not trigger defensive repositioning.
  const isHostile = buildIsHostilePredicate(countryId, regions, relationships);

  // Find the theater this group belongs to
  const theater = group.theaterId ? theaters.find(t => t.id === group.theaterId) : null;
  
  // ── Step 1: Find border regions ─────────────────────────────────────────────
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

  // ── Step 2: Compute committed counts (present + in-transit) per border ──────
  // "Committed" = divisions already at the border + divisions in transit that
  // will eventually reach it. We track this at two levels:
  //
  //   a) Divisions whose toRegion IS the border (one hop away) — assigned
  //      directly to that border's count.
  //   b) Divisions whose toRegion is an intermediate step en route to a border
  //      — these are counted in a global "alreadyInTransit" pool so they
  //      reduce the total available-to-dispatch count and prevent wave dispatch.
  //
  // This stops the "wave" pattern where tick N dispatches 5 divs, tick N+1
  // dispatches another 5 while the first wave is still crossing an intermediate
  // region, etc.
  const committedAtBorder = new Map<string, number>();
  allBorderRegions.forEach(id => {
    const present = getDivisionsInRegion(divisions, id).filter(d => d.armyGroupId === groupId).length;
    committedAtBorder.set(id, present);
  });

  // All in-transit division IDs for the country — present in regions but already committed to movement.
  // Track ALL country divisions regardless of armyGroupId: syncAIArmyGroupsToTheaters may reassign
  // a division's armyGroupId inside a movement without updating the source region, causing the army
  // group to re-dispatch the same division each tick and accumulate duplicate movement records.
  const inTransitDivisionIds = new Set<string>();
  movingUnits.forEach(m => {
    if (m.owner !== countryId) return;
    m.divisions.forEach(d => { inTransitDivisionIds.add(d.id); });
  });

  // For divisions heading directly to a border, credit that border's committed count.
  movingUnits.forEach(m => {
    if (m.owner !== countryId) return;
    const count = m.divisions.filter(d => d.armyGroupId === groupId).length;
    if (count > 0 && borderSet.has(m.toRegion)) {
      committedAtBorder.set(m.toRegion, (committedAtBorder.get(m.toRegion) ?? 0) + count);
    }
  });

  // ── Step 3: Compute allocation targets ──────────────────────────────────────
  // Stationary divisions + in-transit (avoid double-counting since both are in regions).
  let totalGroupDivisions = 0;
  Object.values(regions).forEach(region => {
    if (!region) return;
    totalGroupDivisions += getDivisionsInRegion(divisions, region.id).filter(
      d => d.armyGroupId === groupId && d.owner === countryId && !inTransitDivisionIds.has(d.id)
    ).length;
  });
  movingUnits.forEach(m => {
    if (m.owner !== countryId) return;
    totalGroupDivisions += m.divisions.filter(d => d.armyGroupId === groupId).length;
  });

  const targetPerBorder = Math.floor(totalGroupDivisions / allBorderRegions.length);
  const remainder = totalGroupDivisions % allBorderRegions.length;

  // Each border gets targetPerBorder, with the first `remainder` borders getting +1.
  const allocationTarget = new Map<string, number>();
  allBorderRegions.forEach((id, i) => {
    allocationTarget.set(id, targetPerBorder + (i < remainder ? 1 : 0));
  });

  // ── Step 4: Find borders that are under their allocation target ──────────────
  // A border is "needy" only when its committed count is below target.
  const needyBorders = allBorderRegions.filter(id =>
    (committedAtBorder.get(id) ?? 0) < (allocationTarget.get(id) ?? 0)
  );

  if (needyBorders.length === 0) return; // Everyone is adequately staffed — do nothing

  // If the total number of already-moving group divisions (any destination)
  // is enough to cover the entire remaining deficit, don't dispatch more.
  // This prevents wave-dispatch: when 15 divs are already moving toward a
  // 1-border theater, we don't queue another wave the next tick.
  const totalDeficit = needyBorders.reduce(
    (s, id) => s + ((allocationTarget.get(id) ?? 0) - (committedAtBorder.get(id) ?? 0)), 0
  );
  if (inTransitDivisionIds.size >= totalDeficit) return;

  // ── Step 5: Find available divisions to send ────────────────────────────────
  // - Non-border regions: all stationary group divisions are available.
  // - Border regions: only the *excess* above their allocation target is
  //   available. Divisions covering the target are never pulled away — this
  //   prevents the "strip a border to staff another" oscillation.
  // - In-transit divisions (inTransitDivisionIds, built in Step 2) are excluded.

  const availableDivisions: { divisionId: string; regionId: string }[] = [];
  Object.entries(regions).forEach(([regionId, region]) => {
    if (!region) return;
    const groupDivs = getDivisionsInRegion(divisions, regionId).filter(
      d => d.armyGroupId === groupId && d.owner === countryId && !inTransitDivisionIds.has(d.id)
    );
    if (groupDivs.length === 0) return;

    if (borderSet.has(regionId)) {
      // Only the excess above this border's committed target is available.
      const target = allocationTarget.get(regionId) ?? 0;
      const committed = committedAtBorder.get(regionId) ?? 0;
      const excess = Math.max(0, committed - target);
      // Take up to `excess` divisions from the end of the list (keep the first
      // `target` worth of divisions as the permanent garrison).
      groupDivs.slice(groupDivs.length - excess).forEach(d =>
        availableDivisions.push({ divisionId: d.id, regionId })
      );
    } else {
      // Non-border: all stationary divisions are available.
      groupDivs.forEach(d => availableDivisions.push({ divisionId: d.id, regionId }));
    }
  });

  if (availableDivisions.length === 0) return;

  // ── Step 6: Assign available divisions to needy borders and create movements ─
  const newMovements: Movement[] = [];
  const newRegions = { ...regions };
  const newDivisions = { ...divisions };
  const movedRegions = new Set<string>();
  const targetRegionSet = new Set<string>();

  // Build a lookup: sourceRegionId → remaining available division ids
  // (respects the per-border excess cap already encoded in availableDivisions).
  const availBySource = new Map<string, string[]>();
  availableDivisions.forEach(({ divisionId, regionId }) => {
    if (!availBySource.has(regionId)) availBySource.set(regionId, []);
    availBySource.get(regionId)!.push(divisionId);
  });

  // DEFEND mode must never route divisions through enemy territory.
  // canEnter (built from buildCanEnterPredicate) allows war-enemy regions so
  // that advance mode can cross frontlines, but defend routing must stay on
  // friendly soil.  We build a separate predicate that only permits regions
  // owned by our country so BFS never expands into (or through) enemy nodes.
  const canEnterFriendlyOnly = (regionId: string): boolean =>
    regions[regionId]?.owner === countryId;

  // BN-2: memoize getNextStepToward results across the (source × border) loop.
  // canEnterFriendlyOnly and adjacency are both constant within a single tick,
  // so each (from, to) pair always yields the same first-step.  Caching
  // eliminates redundant BFS calls when multiple needy borders share the same
  // source pool.
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

      // Skip if a movement from this source is already in-flight
      const alreadyMovingFromSource = movingUnits.some(m =>
        m.fromRegion === sourceRegionId &&
        m.owner === countryId &&
        m.divisions.some(d => d.armyGroupId === groupId && inTransitDivisionIds.has(d.id))
      );
      if (alreadyMovingFromSource) continue;

      // Don't send from a border toward itself
      if (sourceRegionId === borderRegionId) continue;

      // Find the next BFS step toward the border (cached)
      const nextStep = cachedNextStep(sourceRegionId, borderRegionId);
      if (!nextStep) {
        console.warn(`[DEFEND] No valid path from ${sourceRegionId} to ${borderRegionId}`);
        continue;
      }

      // DEFEND mode must never move divisions into enemy territory.
      // canEnter allows war-enemy regions (needed for advance), but defend
      // routing must stay within friendly land.  Skip this source/border pair
      // if the first BFS step is not owned by us.
      if (regions[nextStep]?.owner !== countryId) {
        continue;
      }

      // How many divisions to send: enough to fill the deficit, but no more
      // than what this source has available.
      const deficit = target - committed;
      const sendCount = Math.min(deficit, divIds.length);
      const divIdsToSend = divIds.splice(0, sendCount); // mutates availBySource entry

      const divsToSend = divIdsToSend
        .map(id => divisions[id])
        .filter((d): d is NonNullable<typeof d> => d !== undefined);

      if (divsToSend.length === 0) continue;

      // Create movement
      const { regionCentroids } = state;
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
      divsToSend.forEach(d => { delete newDivisions[d.id]; });

      committed += divsToSend.length;
    }
  }

  if (newMovements.length === 0) return;

  // Clear selectedUnitRegion if it was in a region that had units moved
  const shouldClearSelection = selectedUnitRegion && movedRegions.has(selectedUnitRegion);

  // Update army groups to include target regions immediately
  const updatedArmyGroups = armyGroups.map(g => {
    if (g.id === groupId) {
      const newRegionIds = new Set([...g.regionIds, ...Array.from(targetRegionSet)]);
      return { ...g, regionIds: Array.from(newRegionIds) };
    }
    return g;
  });

  setState({
    divisions: newDivisions,
    regions: newRegions,
    movingUnits: [...movingUnits, ...newMovements],
    armyGroups: updatedArmyGroups,
    ...(shouldClearSelection && { selectedUnitRegion: null }),
  });
}

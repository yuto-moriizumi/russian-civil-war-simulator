import { Movement } from '../../types/game';
import { getNextStepToward, buildCanEnterPredicate, buildIsHostilePredicate } from '../../utils/pathfinding';
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
  const { armyGroups, regions, adjacency, dateTime, movingUnits, selectedUnitRegion, theaters, relationships } = state;
  
  const group = armyGroups.find(g => g.id === groupId);
  if (!group) return;
  
  // Use the army group's owner country instead of selectedCountry to support AI
  const countryId = group.owner;

  // Build access predicate — defend routing respects diplomacy too
  const canEnter = buildCanEnterPredicate(countryId, regions, relationships);
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
  // Using "committed" rather than just "present" is the key fix: divisions
  // already travelling toward a border count against its allocation so we
  // don't dispatch duplicates.
  const committedAtBorder = new Map<string, number>();
  allBorderRegions.forEach(id => {
    const present = regions[id]?.divisions.filter(d => d.armyGroupId === groupId).length ?? 0;
    committedAtBorder.set(id, present);
  });

  // Add in-transit divisions that are heading directly to a border region.
  movingUnits.forEach(m => {
    if (m.owner !== countryId) return;
    const count = m.divisions.filter(d => d.armyGroupId === groupId).length;
    if (count > 0 && borderSet.has(m.toRegion)) {
      committedAtBorder.set(m.toRegion, (committedAtBorder.get(m.toRegion) ?? 0) + count);
    }
  });

  // ── Step 3: Compute allocation targets ──────────────────────────────────────
  // Count ALL group divisions: stationed + in-transit (regardless of destination).
  // This gives a stable total that doesn't shrink just because units are moving.
  let totalGroupDivisions = 0;
  Object.values(regions).forEach(region => {
    if (!region) return;
    totalGroupDivisions += region.divisions.filter(d => d.armyGroupId === groupId && d.owner === countryId).length;
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
  // A border is "needy" only when committed < target. Borders at or above their
  // target are left alone — this is the core stopping condition.
  const needyBorders = allBorderRegions.filter(id =>
    (committedAtBorder.get(id) ?? 0) < (allocationTarget.get(id) ?? 0)
  );

  if (needyBorders.length === 0) return; // Everyone is adequately staffed — do nothing

  // ── Step 5: Find available divisions to send ────────────────────────────────
  // - Non-border regions: all stationary group divisions are available.
  // - Border regions: only the *excess* above their allocation target is
  //   available. Divisions covering the target are never pulled away — this
  //   prevents the "strip a border to staff another" oscillation.
  // - In-transit divisions are never double-dispatched.
  const inTransitDivisionIds = new Set<string>();
  movingUnits.forEach(m => {
    if (m.owner !== countryId) return;
    m.divisions.forEach(d => { if (d.armyGroupId === groupId) inTransitDivisionIds.add(d.id); });
  });

  const availableDivisions: { divisionId: string; regionId: string }[] = [];
  Object.entries(regions).forEach(([regionId, region]) => {
    if (!region) return;
    const groupDivs = region.divisions.filter(
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
  const movedRegions = new Set<string>();
  const targetRegionSet = new Set<string>();

  // Track which sources have already dispatched a movement this tick to
  // avoid creating two movements from the same source region.
  const dispatchedFromSource = new Set<string>();
  // Track which nextStep hops already have a movement dispatched this tick
  // (in addition to what's already in movingUnits).
  const dispatchedToStep = new Set<string>();

  // Build a lookup: sourceRegionId → remaining available division ids
  // (respects the per-border excess cap already encoded in availableDivisions).
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

      // Skip if we already dispatched from this source this tick
      if (dispatchedFromSource.has(sourceRegionId)) continue;

      // Skip if a movement from this source is already in-flight
      const alreadyMovingFromSource = movingUnits.some(m =>
        m.fromRegion === sourceRegionId &&
        m.owner === countryId &&
        m.divisions.some(d => d.armyGroupId === groupId)
      );
      if (alreadyMovingFromSource) continue;

      // Don't send from a border toward itself
      if (sourceRegionId === borderRegionId) continue;

      // Find the next BFS step toward the border
      const nextStep = getNextStepToward(sourceRegionId, borderRegionId, adjacency, canEnter);
      if (!nextStep) {
        console.warn(`[DEFEND] No valid path from ${sourceRegionId} to ${borderRegionId}`);
        continue;
      }

      // Skip if another movement (existing or newly created this tick) already
      // targets this next step — prevents flooding the same hop.
      const stepAlreadyCovered =
        dispatchedToStep.has(nextStep) ||
        movingUnits.some(m =>
          m.owner === countryId &&
          m.toRegion === nextStep &&
          m.divisions.some(d => d.armyGroupId === groupId)
        );
      if (stepAlreadyCovered) continue;

      // How many divisions to send: enough to fill the deficit, but no more
      // than what this source has available.
      const deficit = target - committed;
      const sendCount = Math.min(deficit, divIds.length);
      const divIdsToSend = divIds.splice(0, sendCount); // mutates availBySource entry

      const divsToSend = divIdsToSend
        .map(id => newRegions[sourceRegionId]?.divisions.find(d => d.id === id))
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

      // Remove dispatched divisions from source region state
      newRegions[sourceRegionId] = {
        ...newRegions[sourceRegionId],
        divisions: newRegions[sourceRegionId].divisions.filter(
          d => !divsToSend.some(dfs => dfs.id === d.id)
        ),
      };

      movedRegions.add(sourceRegionId);
      targetRegionSet.add(nextStep);
      dispatchedFromSource.add(sourceRegionId);
      dispatchedToStep.add(nextStep);
      divsToSend.forEach(d => inTransitDivisionIds.add(d.id));

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
    regions: newRegions,
    movingUnits: [...movingUnits, ...newMovements],
    armyGroups: updatedArmyGroups,
    ...(shouldClearSelection && { selectedUnitRegion: null }),
  });
}

/**
 * HOI4-style frontline assignment helpers.
 *
 * Extracted from pathfinding.ts to keep file size within lint limits.
 * Re-exported via pathfinding.ts so callers have a single import path.
 */
import { RegionState, Adjacency, CountryId, Movement } from '../types/game';

/**
 * Describes a single division-move assignment produced by
 * `assignDivisionsToFrontline`.
 */
export interface FrontlineAssignment {
  divisionId: string;
  /** Region the division currently occupies. */
  fromRegion: string;
  /**
   * The immediate next-hop region to move toward.
   * For frontline-fill moves this is one BFS step toward the empty slot.
   * For surplus attack moves this is the adjacent enemy target directly.
   */
  toRegion: string;
  /** true = filling an under-staffed frontline slot; false = pushing into an enemy target. */
  isFrontlineMove: boolean;
}

/**
 * Compute the current frontline for an army group.
 *
 * Returns:
 *  - `frontlineRegions`: own regions adjacent to at least one accessible enemy province.
 *  - `targetRegions`: enemy provinces adjacent to at least one frontline region.
 *
 * Only considers regions that contain at least one division belonging to
 * `groupId` (or all own regions when `groupId` is null — useful for tests).
 */
export function computeFrontline(
  groupId: string | null,
  regions: RegionState,
  adjacency: Adjacency,
  countryId: CountryId,
  canEnter: (regionId: string) => boolean
): { frontlineRegions: Set<string>; targetRegions: Set<string> } {
  const frontlineRegions = new Set<string>();
  const targetRegions = new Set<string>();

  for (const [regionId, region] of Object.entries(regions)) {
    if (!region || region.owner !== countryId) continue;
    if (groupId !== null && !region.divisions.some(d => d.armyGroupId === groupId)) continue;

    const neighbors = adjacency[regionId] || [];
    for (const neighborId of neighbors) {
      const neighbor = regions[neighborId];
      if (!neighbor) continue;
      if (neighbor.owner === countryId) continue;
      if (!canEnter(neighborId)) continue;

      frontlineRegions.add(regionId);
      targetRegions.add(neighborId);
    }
  }

  return { frontlineRegions, targetRegions };
}

/**
 * Assign divisions belonging to `groupId` to movement targets using a
 * HOI4-style frontline-fill-then-push strategy.
 *
 * Phase 1 — Fill empty frontline slots:
 *   Rear divisions are routed one BFS step toward the nearest under-staffed
 *   frontline slot. In-transit divisions count toward slot coverage so we
 *   never double-fill a slot.
 *
 * Phase 2 — Push surplus into targets:
 *   Frontline regions with >1 group division send surplus directly into
 *   adjacent enemy target regions.
 *
 * Back-and-forth loop prevention:
 *   The `toRegion` of every in-transit movement is added to `inTransitToRegion`.
 *   Regions in this set are excluded from the rear-region pool so a division
 *   that just arrived is not immediately re-dispatched toward the front.
 */
export function assignDivisionsToFrontline(
  groupId: string,
  regions: RegionState,
  adjacency: Adjacency,
  countryId: CountryId,
  frontline: { frontlineRegions: Set<string>; targetRegions: Set<string> },
  movingUnits: Movement[],
  canEnter: (regionId: string) => boolean
): FrontlineAssignment[] {
  const { frontlineRegions, targetRegions } = frontline;
  const assignments: FrontlineAssignment[] = [];

  const groupMovements = movingUnits.filter(m =>
    m.divisions.some(d => d.armyGroupId === groupId)
  );

  // Source regions already dispatching — skip to avoid double-dispatch.
  const alreadyMovingFromRegion = new Set<string>(groupMovements.map(m => m.fromRegion));

  // Destination regions of in-transit movements — skip to prevent immediate
  // re-dispatch upon arrival (loop prevention).
  const inTransitToRegion = new Set<string>(groupMovements.map(m => m.toRegion));

  // Frontline slot coverage: stationed divisions + in-transit divisions
  // heading directly to a frontline slot.
  const frontlineCoverage = new Map<string, number>();
  for (const flRegion of frontlineRegions) {
    const region = regions[flRegion];
    const stationed = region
      ? region.divisions.filter(d => d.armyGroupId === groupId).length
      : 0;
    const inbound = groupMovements
      .filter(m => m.toRegion === flRegion)
      .reduce((sum, m) => sum + m.divisions.filter(d => d.armyGroupId === groupId).length, 0);
    frontlineCoverage.set(flRegion, stationed + inbound);
  }

  // Rear regions: own territory, not a frontline region, not already-moving
  // source, and not the destination of any in-transit movement.
  const rearRegions = Object.keys(regions).filter(rId => {
    if (frontlineRegions.has(rId)) return false;
    if (alreadyMovingFromRegion.has(rId)) return false;
    if (inTransitToRegion.has(rId)) return false;
    const r = regions[rId];
    if (!r) return false;
    return r.divisions.some(d => d.armyGroupId === groupId && d.owner === countryId);
  });

  const emptySlots = (): string[] =>
    Array.from(frontlineCoverage.entries())
      .filter(([, count]) => count === 0)
      .map(([id]) => id);

  // Phase 1: route rear divisions one step toward nearest empty frontline slot.
  for (const rearRegionId of rearRegions) {
    if (alreadyMovingFromRegion.has(rearRegionId)) continue;
    if (inTransitToRegion.has(rearRegionId)) continue;
    const region = regions[rearRegionId];
    if (!region) continue;

    const rearDivisions = region.divisions.filter(
      d => d.armyGroupId === groupId && d.owner === countryId
    );
    if (rearDivisions.length === 0) continue;

    const slots = emptySlots();
    if (slots.length === 0) break;

    let bestSlot: string | null = null;
    let bestFirstStep: string | null = null;

    const visited = new Set<string>([rearRegionId]);
    const queue: { id: string; firstStep: string | null }[] = [
      { id: rearRegionId, firstStep: null },
    ];
    outer: while (queue.length > 0) {
      const { id: cur, firstStep } = queue.shift()!;
      for (const nId of adjacency[cur] || []) {
        if (visited.has(nId)) continue;
        visited.add(nId);
        const nextStep = firstStep ?? nId;
        if (slots.includes(nId)) {
          bestSlot = nId;
          bestFirstStep = nextStep;
          break outer;
        }
        const nRegion = regions[nId];
        if (nRegion && nRegion.owner === countryId) {
          queue.push({ id: nId, firstStep: nextStep });
        }
      }
    }

    if (!bestSlot || !bestFirstStep) continue;
    if (bestFirstStep === rearRegionId) continue;

    assignments.push({
      divisionId: rearDivisions[0].id,
      fromRegion: rearRegionId,
      toRegion: bestFirstStep,
      isFrontlineMove: true,
    });

    frontlineCoverage.set(bestSlot, (frontlineCoverage.get(bestSlot) ?? 0) + 1);
    alreadyMovingFromRegion.add(rearRegionId);
  }

  // Phase 2: push surplus frontline divisions into adjacent target regions.
  for (const flRegionId of frontlineRegions) {
    if (alreadyMovingFromRegion.has(flRegionId)) continue;
    const region = regions[flRegionId];
    if (!region) continue;

    const flDivisions = region.divisions.filter(
      d => d.armyGroupId === groupId && d.owner === countryId
    );

    const surplus = flDivisions.slice(1);
    if (surplus.length === 0) continue;

    const adjacentTargets = (adjacency[flRegionId] || []).filter(nId =>
      targetRegions.has(nId) && canEnter(nId)
    );
    if (adjacentTargets.length === 0) continue;

    for (let i = 0; i < surplus.length; i++) {
      assignments.push({
        divisionId: surplus[i].id,
        fromRegion: flRegionId,
        toRegion: adjacentTargets[i % adjacentTargets.length],
        isFrontlineMove: false,
      });
    }

    alreadyMovingFromRegion.add(flRegionId);
    frontlineCoverage.set(flRegionId, flDivisions.length - surplus.length);
  }

  // Deduplicate by division ID (defensive — phase 2 shouldn't produce dups).
  const seen = new Set<string>();
  return assignments.filter(a => {
    if (seen.has(a.divisionId)) return false;
    seen.add(a.divisionId);
    return true;
  });
}

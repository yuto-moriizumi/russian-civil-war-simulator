import { RegionState, Adjacency, CountryId, Movement, Relationship } from '../types/game';

/**
 * Build a predicate that returns true if a given regionId is accessible
 * (can be entered or traversed) by countryId given the current relationships.
 *
 * Rules:
 * - Own territory: always accessible
 * - Neutral (unowned) regions: blocked — must have war/access with 'neutral' owner
 *   (treated as foreign territory per game design)
 * - Foreign-owned: accessible only if at war with them OR they granted military_access/war
 *   OR either side has autonomy
 */
export function buildCanEnterPredicate(
  countryId: CountryId,
  regions: RegionState,
  relationships: Relationship[]
): (regionId: string) => boolean {
  return (regionId: string): boolean => {
    const region = regions[regionId];
    if (!region) return false;
    if (region.owner === countryId) return true;

    const theirRel = relationships.find(
      r => r.fromCountry === region.owner && r.toCountry === countryId
    );
    const ourRel = relationships.find(
      r => r.fromCountry === countryId && r.toCountry === region.owner
    );

    const theyGrantUs = theirRel?.type ?? 'neutral';
    const weDeclared  = ourRel?.type  ?? 'neutral';

    const hasAutonomy = theyGrantUs === 'autonomy' || weDeclared === 'autonomy';
    return theyGrantUs !== 'neutral' || weDeclared === 'war' || hasAutonomy;
  };
}

/**
 * Find the nearest enemy-controlled region from a starting region using BFS.
 * Only traverses regions that pass the canEnter predicate.
 * Returns the region ID of the nearest accessible enemy, or null if none reachable.
 */
export function findNearestEnemyRegion(
  startRegionId: string,
  regions: RegionState,
  adjacency: Adjacency,
  playerCountry: CountryId,
  canEnter?: (regionId: string) => boolean
): string | null {
  const visited = new Set<string>();
  const queue: string[] = [startRegionId];
  visited.add(startRegionId);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const neighbors = adjacency[currentId] || [];

    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);

      const neighbor = regions[neighborId];
      if (!neighbor) continue;

      if (neighbor.owner !== playerCountry) {
        // Check if we can enter this region at all
        if (canEnter && !canEnter(neighborId)) continue;

        // It's an accessible enemy region — this is the target
        return neighborId;
      }

      // Friendly territory — keep expanding
      queue.push(neighborId);
    }
  }

  return null;
}

/**
 * Find the shortest path between two regions using BFS.
 * Only traverses regions that pass the canEnter predicate (if provided).
 * Returns an array of region IDs (excluding start, including end),
 * or null if no path exists.
 */
export function findPath(
  fromRegionId: string,
  toRegionId: string,
  adjacency: Adjacency,
  canEnter?: (regionId: string) => boolean
): string[] | null {
  if (fromRegionId === toRegionId) return [];

  const visited = new Set<string>();
  const queue: { id: string; path: string[] }[] = [{ id: fromRegionId, path: [] }];
  visited.add(fromRegionId);

  while (queue.length > 0) {
    const { id: currentId, path } = queue.shift()!;
    const neighbors = adjacency[currentId] || [];

    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);

      const newPath = [...path, neighborId];

      if (neighborId === toRegionId) {
        return newPath;
      }

      // Only expand through accessible regions
      if (canEnter && !canEnter(neighborId)) continue;

      queue.push({ id: neighborId, path: newPath });
    }
  }

  return null;
}

/**
 * Get the next step (adjacent region) to move toward a target region.
 * Respects the canEnter predicate when routing.
 */
export function getNextStepToward(
  fromRegionId: string,
  targetRegionId: string,
  adjacency: Adjacency,
  canEnter?: (regionId: string) => boolean
): string | null {
  const path = findPath(fromRegionId, targetRegionId, adjacency, canEnter);
  if (!path || path.length === 0) return null;
  return path[0];
}

/**
 * Find the best move for a unit in a region toward the nearest accessible enemy.
 * Returns the adjacent region ID to move to, or null if no valid move exists.
 */
export function findBestMoveTowardEnemy(
  regionId: string,
  regions: RegionState,
  adjacency: Adjacency,
  playerCountry: CountryId,
  canEnter?: (regionId: string) => boolean
): string | null {
  const nearestEnemy = findNearestEnemyRegion(regionId, regions, adjacency, playerCountry, canEnter);
  if (!nearestEnemy) return null;
  return getNextStepToward(regionId, nearestEnemy, adjacency, canEnter);
}

/**
 * Find ALL valid adjacent targets a unit in regionId can advance toward.
 * Returns each adjacent region that either:
 *   - is directly accessible enemy territory, OR
 *   - is on the shortest accessible path toward any enemy
 *
 * Used by the spread-advance logic to fan out divisions instead of stacking.
 */
export function findAllAdvanceTargets(
  regionId: string,
  regions: RegionState,
  adjacency: Adjacency,
  playerCountry: CountryId,
  canEnter: (regionId: string) => boolean
): string[] {
  const neighbors = adjacency[regionId] || [];
  const validTargets: string[] = [];

  for (const neighborId of neighbors) {
    const neighbor = regions[neighborId];
    if (!neighbor) continue;

    if (neighbor.owner === playerCountry) {
      // Friendly neighbor — only useful as a waypoint if it's on the path to an enemy.
      // Skip: we want to fan out toward enemies, not shuffle within own territory.
      continue;
    }

    // Foreign region — check access
    if (!canEnter(neighborId)) continue;

    validTargets.push(neighborId);
  }

  // If no direct enemy/accessible-foreign neighbors, fall back to the single best
  // pathfinding step so divisions still make progress through own territory.
  if (validTargets.length === 0) {
    const best = findBestMoveTowardEnemy(regionId, regions, adjacency, playerCountry, canEnter);
    if (best) validTargets.push(best);
  }

  return validTargets;
}

/**
 * Find all friendly border regions that are adjacent to enemy territory.
 * These are regions that need defending.
 */
export function findFriendlyBorderRegions(
  regions: RegionState,
  adjacency: Adjacency,
  playerCountry: CountryId
): string[] {
  const borderRegions: string[] = [];

  for (const [regionId, region] of Object.entries(regions)) {
    if (!region || region.owner !== playerCountry) continue;

    const neighbors = adjacency[regionId] || [];
    const hasEnemyNeighbor = neighbors.some(neighborId => {
      const neighbor = regions[neighborId];
      return neighbor && neighbor.owner !== playerCountry && neighbor.owner !== 'neutral';
    });

    if (hasEnemyNeighbor) {
      borderRegions.push(regionId);
    }
  }

  return borderRegions;
}

/**
 * Find the best defensive move for a unit in a region.
 * Strategy:
 * 1. If already at a border region (adjacent to enemy), stay put
 * 2. Otherwise, move toward the nearest friendly border region
 * Returns the adjacent region ID to move to, or null if should stay/no valid move exists.
 */
export function findBestDefensiveMove(
  regionId: string,
  regions: RegionState,
  adjacency: Adjacency,
  playerCountry: CountryId
): string | null {
  const currentRegion = regions[regionId];
  if (!currentRegion || currentRegion.owner !== playerCountry) return null;

  // Check if already at a border region (adjacent to enemy)
  const neighbors = adjacency[regionId] || [];
  const hasEnemyNeighbor = neighbors.some(neighborId => {
    const neighbor = regions[neighborId];
    return neighbor && neighbor.owner !== playerCountry && neighbor.owner !== 'neutral';
  });

  // If at a border, stay put to defend
  if (hasEnemyNeighbor) return null;

  // Find all friendly border regions
  const borderRegions = findFriendlyBorderRegions(regions, adjacency, playerCountry);
  if (borderRegions.length === 0) return null;

  // Find the nearest border region using BFS
  const visited = new Set<string>();
  const queue: { id: string; firstStep: string | null }[] = [{ id: regionId, firstStep: null }];
  visited.add(regionId);

  while (queue.length > 0) {
    const { id: currentId, firstStep } = queue.shift()!;
    const currentNeighbors = adjacency[currentId] || [];

    for (const neighborId of currentNeighbors) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);

      const neighbor = regions[neighborId];
      // Only move through friendly territory
      if (!neighbor || neighbor.owner !== playerCountry) continue;

      const nextFirstStep = firstStep || neighborId;

      // Check if this neighbor is a border region
      if (borderRegions.includes(neighborId)) {
        return nextFirstStep;
      }

      queue.push({ id: neighborId, firstStep: nextFirstStep });
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// HOI4-style frontline assignment helpers
// ---------------------------------------------------------------------------

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
 *  - `frontlineRegions`: own regions that are adjacent to at least one
 *    accessible enemy/foreign province.
 *  - `targetRegions`: enemy/foreign provinces adjacent to at least one
 *    frontline region (i.e. the immediate attack objectives).
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

    // Only consider regions where this group has at least one division
    if (groupId !== null && !region.divisions.some(d => d.armyGroupId === groupId)) continue;

    const neighbors = adjacency[regionId] || [];
    for (const neighborId of neighbors) {
      const neighbor = regions[neighborId];
      if (!neighbor) continue;
      if (neighbor.owner === countryId) continue; // skip own territory
      if (!canEnter(neighborId)) continue;         // diplomacy gate

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
 *   Divisions that are NOT already in a frontline region are routed (one BFS
 *   step at a time through own territory) toward the nearest under-staffed
 *   frontline region (a frontline region with 0 group divisions assigned).
 *
 * Phase 2 — Push surplus into targets:
 *   Frontline regions that have more than 1 group division send their surplus
 *   (all divisions beyond the first) directly into a randomly chosen adjacent
 *   target region.
 *
 * Regions with already-moving group divisions are skipped entirely.
 *
 * @param groupId        Army group whose divisions are being assigned.
 * @param regions        Current region state (read-only).
 * @param adjacency      Adjacency map.
 * @param countryId      Owning faction.
 * @param frontline      Result of `computeFrontline`.
 * @param movingUnits    In-transit movements (used to skip already-moving regions).
 * @param canEnter       Diplomatic access predicate.
 * @returns              List of assignments — one entry per division that should move.
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

  // Regions that already have a group movement in progress — skip entirely.
  const alreadyMovingFromRegion = new Set<string>(
    movingUnits
      .filter(m => m.divisions.some(d => d.armyGroupId === groupId))
      .map(m => m.fromRegion)
  );

  // -----------------------------------------------------------------------
  // Build a mutable tally of how many group divisions are already at each
  // frontline region.  We treat "divisions not yet assigned" as a virtual
  // pool and decrement slot coverage as we make assignments.
  // -----------------------------------------------------------------------
  const frontlineCoverage = new Map<string, number>();
  for (const flRegion of frontlineRegions) {
    const region = regions[flRegion];
    const count = region ? region.divisions.filter(d => d.armyGroupId === groupId).length : 0;
    frontlineCoverage.set(flRegion, count);
  }

  // -----------------------------------------------------------------------
  // Phase 1: Pull rear divisions forward to fill empty frontline slots.
  // "Rear" = a region that is NOT a frontline region but holds group divs.
  // -----------------------------------------------------------------------
  const rearRegions = Object.keys(regions).filter(rId => {
    if (frontlineRegions.has(rId)) return false;
    if (alreadyMovingFromRegion.has(rId)) return false;
    const r = regions[rId];
    if (!r) return false;
    return r.divisions.some(d => d.armyGroupId === groupId && d.owner === countryId);
  });

  // Collect empty frontline slots (coverage === 0), order is arbitrary for now.
  const emptySlots = (): string[] =>
    Array.from(frontlineCoverage.entries())
      .filter(([, count]) => count === 0)
      .map(([id]) => id);

  for (const rearRegionId of rearRegions) {
    if (alreadyMovingFromRegion.has(rearRegionId)) continue;
    const region = regions[rearRegionId];
    if (!region) continue;

    const rearDivisions = region.divisions.filter(
      d => d.armyGroupId === groupId && d.owner === countryId
    );
    if (rearDivisions.length === 0) continue;

    const slots = emptySlots();
    if (slots.length === 0) break; // All frontline slots filled — move to phase 2

    // Find nearest empty slot via BFS through accessible territory
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
        // Only traverse accessible territory (own or military-access)
        const nRegion = regions[nId];
        if (nRegion && nRegion.owner === countryId) {
          queue.push({ id: nId, firstStep: nextStep });
        }
      }
    }

    if (!bestSlot || !bestFirstStep) continue;
    if (bestFirstStep === rearRegionId) continue; // already there

    // Send one division toward the empty slot
    const div = rearDivisions[0];
    assignments.push({
      divisionId: div.id,
      fromRegion: rearRegionId,
      toRegion: bestFirstStep,
      isFrontlineMove: true,
    });

    // Mark the slot as now having +1 coverage so future iterations don't
    // double-fill it.
    frontlineCoverage.set(bestSlot, (frontlineCoverage.get(bestSlot) ?? 0) + 1);

    // Prevent issuing multiple orders from the same rear region this tick.
    alreadyMovingFromRegion.add(rearRegionId);
  }

  // -----------------------------------------------------------------------
  // Phase 2: Push surplus frontline divisions into adjacent target regions.
  // A frontline region is "surplus" if it has more than 1 group division
  // after the phase-1 assignments above.
  // -----------------------------------------------------------------------
  for (const flRegionId of frontlineRegions) {
    if (alreadyMovingFromRegion.has(flRegionId)) continue;
    const region = regions[flRegionId];
    if (!region) continue;

    const flDivisions = region.divisions.filter(
      d => d.armyGroupId === groupId && d.owner === countryId
    );

    // Keep one division on the frontline; the rest are surplus.
    const surplus = flDivisions.slice(1);
    if (surplus.length === 0) continue;

    // Find all adjacent target regions for this frontline province.
    const adjacentTargets = (adjacency[flRegionId] || []).filter(nId =>
      targetRegions.has(nId) && canEnter(nId)
    );
    if (adjacentTargets.length === 0) continue;

    for (let i = 0; i < surplus.length; i++) {
      const target = adjacentTargets[i % adjacentTargets.length];
      assignments.push({
        divisionId: surplus[i].id,
        fromRegion: flRegionId,
        toRegion: target,
        isFrontlineMove: false,
      });
    }

    // Prevent further orders from this region this tick.
    alreadyMovingFromRegion.add(flRegionId);

    // Also: if this frontline region itself has 0 coverage (edge case where
    // it only has divisions that will be sent as surplus), skip the slot in
    // phase-1 future iterations.
    const remaining = flDivisions.length - surplus.length;
    frontlineCoverage.set(flRegionId, remaining);
  }

  // Deduplicate: only one assignment per division ID (phase 2 can't create
  // duplicates because we iterate by region, but be defensive).
  const seen = new Set<string>();
  return assignments.filter(a => {
    if (seen.has(a.divisionId)) return false;
    seen.add(a.divisionId);
    return true;
  });
}

// ---------------------------------------------------------------------------

/**
 * Calculate the total number of divisions assigned to a specific army group.
 * This counts divisions by their armyGroupId field, including in-transit divisions.
 */
export function getArmyGroupUnitCount(
  regionIds: string[],
  regions: RegionState,
  playerCountry: CountryId,
  armyGroupId?: string,
  movingUnits?: Movement[]
): number {
  // If armyGroupId is provided, count only divisions with that armyGroupId
  if (armyGroupId) {
    // Count divisions in regions
    let total = Object.values(regions).reduce((sum, region) => {
      if (!region || region.owner !== playerCountry) return sum;
      const matchingDivisions = region.divisions.filter(d => d.armyGroupId === armyGroupId);
      return sum + matchingDivisions.length;
    }, 0);
    
    // Count divisions in transit
    if (movingUnits) {
      const inTransit = movingUnits.reduce((sum, movement) => {
        if (movement.owner !== playerCountry) return sum;
        const matchingDivisions = movement.divisions.filter(d => d.armyGroupId === armyGroupId);
        return sum + matchingDivisions.length;
      }, 0);
      total += inTransit;
    }
    
    return total;
  }
  
  // Legacy behavior: count all divisions in the specified regions
  return regionIds.reduce((total, regionId) => {
    const region = regions[regionId];
    if (!region || region.owner !== playerCountry) return total;
    return total + region.divisions.length;
  }, 0);
}

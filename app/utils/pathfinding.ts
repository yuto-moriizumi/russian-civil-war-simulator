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
// HOI4-style frontline assignment helpers (in separate file for size limits)
// ---------------------------------------------------------------------------
export type { FrontlineAssignment } from './frontlineAssignment';
export { computeFrontline, assignDivisionsToFrontline } from './frontlineAssignment';

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

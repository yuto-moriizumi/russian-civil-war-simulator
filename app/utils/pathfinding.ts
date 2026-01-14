import { RegionState, Adjacency, FactionId, Movement } from '../types/game';

/**
 * Find the nearest enemy-controlled region from a starting region using BFS.
 * Returns the region ID of the nearest enemy, or null if no enemy is reachable.
 */
export function findNearestEnemyRegion(
  startRegionId: string,
  regions: RegionState,
  adjacency: Adjacency,
  playerFaction: FactionId
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

      // Check if this is an enemy region
      if (neighbor.owner !== playerFaction && neighbor.owner !== 'neutral') {
        return neighborId;
      }

      // Continue searching through friendly/neutral territory
      queue.push(neighborId);
    }
  }

  return null;
}

/**
 * Find the shortest path between two regions using BFS.
 * Returns an array of region IDs representing the path (excluding start, including end),
 * or null if no path exists.
 */
export function findPath(
  fromRegionId: string,
  toRegionId: string,
  adjacency: Adjacency
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

      queue.push({ id: neighborId, path: newPath });
    }
  }

  return null;
}

/**
 * Get the next step (adjacent region) to move toward a target region.
 * Returns the adjacent region ID that is on the shortest path to the target,
 * or null if no path exists.
 */
export function getNextStepToward(
  fromRegionId: string,
  targetRegionId: string,
  adjacency: Adjacency
): string | null {
  const path = findPath(fromRegionId, targetRegionId, adjacency);
  if (!path || path.length === 0) return null;
  return path[0];
}

/**
 * Find the best move for a unit in a region toward the nearest enemy.
 * Returns the adjacent region ID to move to, or null if no valid move exists.
 */
export function findBestMoveTowardEnemy(
  regionId: string,
  regions: RegionState,
  adjacency: Adjacency,
  playerFaction: FactionId
): string | null {
  // First find the nearest enemy
  const nearestEnemy = findNearestEnemyRegion(regionId, regions, adjacency, playerFaction);
  if (!nearestEnemy) return null;

  // Then find the next step toward that enemy
  return getNextStepToward(regionId, nearestEnemy, adjacency);
}

/**
 * Find all friendly border regions that are adjacent to enemy territory.
 * These are regions that need defending.
 */
export function findFriendlyBorderRegions(
  regions: RegionState,
  adjacency: Adjacency,
  playerFaction: FactionId
): string[] {
  const borderRegions: string[] = [];

  for (const [regionId, region] of Object.entries(regions)) {
    if (!region || region.owner !== playerFaction) continue;

    const neighbors = adjacency[regionId] || [];
    const hasEnemyNeighbor = neighbors.some(neighborId => {
      const neighbor = regions[neighborId];
      return neighbor && neighbor.owner !== playerFaction && neighbor.owner !== 'neutral';
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
  playerFaction: FactionId
): string | null {
  const currentRegion = regions[regionId];
  if (!currentRegion || currentRegion.owner !== playerFaction) return null;

  // Check if already at a border region (adjacent to enemy)
  const neighbors = adjacency[regionId] || [];
  const hasEnemyNeighbor = neighbors.some(neighborId => {
    const neighbor = regions[neighborId];
    return neighbor && neighbor.owner !== playerFaction && neighbor.owner !== 'neutral';
  });

  // If at a border, stay put to defend
  if (hasEnemyNeighbor) return null;

  // Find all friendly border regions
  const borderRegions = findFriendlyBorderRegions(regions, adjacency, playerFaction);
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
      if (!neighbor || neighbor.owner !== playerFaction) continue;

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

/**
 * Calculate the total number of divisions assigned to a specific army group.
 * This counts divisions by their armyGroupId field, including in-transit divisions.
 */
export function getArmyGroupUnitCount(
  regionIds: string[],
  regions: RegionState,
  playerFaction: FactionId,
  armyGroupId?: string,
  movingUnits?: Movement[]
): number {
  // If armyGroupId is provided, count only divisions with that armyGroupId
  if (armyGroupId) {
    // Count divisions in regions
    let total = Object.values(regions).reduce((sum, region) => {
      if (!region || region.owner !== playerFaction) return sum;
      const matchingDivisions = region.divisions.filter(d => d.armyGroupId === armyGroupId);
      return sum + matchingDivisions.length;
    }, 0);
    
    // Count divisions in transit
    if (movingUnits) {
      const inTransit = movingUnits.reduce((sum, movement) => {
        if (movement.owner !== playerFaction) return sum;
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
    if (!region || region.owner !== playerFaction) return total;
    return total + region.divisions.length;
  }, 0);
}

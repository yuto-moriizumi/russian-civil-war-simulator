import { FactionId, RegionState, ProductionQueueItem, Movement } from '../types/game';

/**
 * Base divisions per state (configurable)
 */
export const DIVISIONS_PER_STATE = 2;

/**
 * Calculate the maximum divisions a faction can have based on controlled states
 * @param factionId - The faction to calculate cap for
 * @param regions - Current region state
 * @returns Maximum number of divisions allowed
 */
export function calculateDivisionCap(
  factionId: FactionId,
  regions: RegionState
): number {
  // Count the number of states controlled by this faction
  const controlledStates = Object.values(regions).filter(
    region => region.owner === factionId
  ).length;

  // Cap is: controlled states * divisions per state
  return controlledStates * DIVISIONS_PER_STATE;
}

/**
 * Count current divisions for a faction (in regions + in transit)
 * @param factionId - The faction to count for
 * @param regions - Current region state
 * @param movements - Current unit movements
 * @returns Total number of divisions
 */
export function countCurrentDivisions(
  factionId: FactionId,
  regions: RegionState,
  movements: Movement[]
): number {
  // Count divisions in regions
  const divisionsInRegions = Object.values(regions).reduce((count, region) => {
    return count + region.divisions.filter(d => d.owner === factionId).length;
  }, 0);

  // Count divisions in transit
  const divisionsInTransit = movements.reduce((count, movement) => {
    if (movement.owner === factionId) {
      return count + movement.divisions.length;
    }
    return count;
  }, 0);

  return divisionsInRegions + divisionsInTransit;
}

/**
 * Count divisions in production queue for a faction
 * @param factionId - The faction to count for
 * @param productionQueues - Per-faction production queues
 * @returns Number of divisions being produced
 */
export function countDivisionsInProduction(
  factionId: FactionId,
  productionQueues: Record<FactionId, ProductionQueueItem[]>
): number {
  const queue = productionQueues[factionId] || [];
  return queue.length;
}

/**
 * Check if a faction can produce another division
 * @param factionId - The faction to check
 * @param regions - Current region state
 * @param movements - Current unit movements
 * @param productionQueues - Per-faction production queues
 * @returns True if the faction can produce more divisions
 */
export function canProduceDivision(
  factionId: FactionId,
  regions: RegionState,
  movements: Movement[],
  productionQueues: Record<FactionId, ProductionQueueItem[]>
): boolean {
  const cap = calculateDivisionCap(factionId, regions);
  const current = countCurrentDivisions(factionId, regions, movements);
  const inProduction = countDivisionsInProduction(factionId, productionQueues);
  
  // Can produce if: (current + inProduction) < cap
  return (current + inProduction) < cap;
}

/**
 * Get division cap info for display
 * @param factionId - The faction to get info for
 * @param regions - Current region state
 * @param movements - Current unit movements
 * @param productionQueues - Per-faction production queues
 * @returns Object with cap, current, inProduction, and available counts
 */
export function getDivisionCapInfo(
  factionId: FactionId,
  regions: RegionState,
  movements: Movement[],
  productionQueues: Record<FactionId, ProductionQueueItem[]>
): {
  cap: number;
  current: number;
  inProduction: number;
  total: number;
  available: number;
  controlledStates: number;
} {
  const cap = calculateDivisionCap(factionId, regions);
  const current = countCurrentDivisions(factionId, regions, movements);
  const inProduction = countDivisionsInProduction(factionId, productionQueues);
  const total = current + inProduction;
  const available = Math.max(0, cap - total);
  
  const controlledStates = Object.values(regions).filter(
    region => region.owner === factionId
  ).length;

  return {
    cap,
    current,
    inProduction,
    total,
    available,
    controlledStates,
  };
}

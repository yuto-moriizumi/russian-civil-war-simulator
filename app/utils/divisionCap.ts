import { FactionId, RegionState, ProductionQueueItem, Movement, FactionBonuses } from '../types/game';

/**
 * Base divisions per state (configurable)
 */
export const DIVISIONS_PER_STATE = 1;

/**
 * Division cap consumed per unit (configurable)
 * Each unit will consume this many division cap slots
 */
export const DIVISION_CAP_PER_UNIT = 2;

/**
 * Base division cap provided to all factions
 */
export const BASE_DIVISION_CAP = 4;

/**
 * Cap bonuses for major cities
 * These regions provide additional divisions beyond the base amount
 */
export const MAJOR_CITY_CAP_BONUS: Record<string, number> = {
  'RU-MOW': 2,  // Moscow - +3 total (1 base + 2 bonus)
  'UA-30': 2,   // Kyiv - +3 total (1 base + 2 bonus)
  'BY-HM': 2,   // Minsk - +3 total (1 base + 2 bonus)
  'RU-SPE': 1,  // Saint Petersburg - +2 total (1 base + 1 bonus)
  'RU-MOS': 1,  // Moscow Oblast - +2 total (1 base + 1 bonus)
};

/**
 * Calculate the maximum divisions a faction can have based on controlled states
 * @param factionId - The faction to calculate cap for
 * @param regions - Current region state
 * @param factionBonuses - Faction bonuses from completed missions
 * @returns Maximum number of divisions allowed
 */
export function calculateDivisionCap(
  factionId: FactionId,
  regions: RegionState,
  factionBonuses: FactionBonuses
): number {
  let totalCap = BASE_DIVISION_CAP;

  // Iterate through all controlled regions
  Object.entries(regions).forEach(([regionId, region]) => {
    if (region.owner === factionId) {
      // Base cap for controlling any state
      totalCap += DIVISIONS_PER_STATE;
      
      // Add bonus for major cities
      if (MAJOR_CITY_CAP_BONUS[regionId]) {
        totalCap += MAJOR_CITY_CAP_BONUS[regionId];
      }
    }
  });

  // Add bonus from completed missions
  totalCap += factionBonuses.divisionCapBonus;

  return totalCap;
}

/**
 * Count current divisions for a faction (in regions + in transit)
 * Each division consumes DIVISION_CAP_PER_UNIT cap slots
 * @param factionId - The faction to count for
 * @param regions - Current region state
 * @param movements - Current unit movements
 * @returns Total division cap consumed by current divisions
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

  // Each division consumes DIVISION_CAP_PER_UNIT cap slots
  return (divisionsInRegions + divisionsInTransit) * DIVISION_CAP_PER_UNIT;
}

/**
 * Count divisions in production queue for a faction
 * Each division consumes DIVISION_CAP_PER_UNIT cap slots
 * @param factionId - The faction to count for
 * @param productionQueues - Per-faction production queues
 * @returns Division cap consumed by divisions being produced
 */
export function countDivisionsInProduction(
  factionId: FactionId,
  productionQueues: Record<FactionId, ProductionQueueItem[]>
): number {
  const queue = productionQueues[factionId] || [];
  // Each division in production consumes DIVISION_CAP_PER_UNIT cap slots
  return queue.length * DIVISION_CAP_PER_UNIT;
}

/**
 * Check if a faction can produce another division
 * @param factionId - The faction to check
 * @param regions - Current region state
 * @param movements - Current unit movements
 * @param productionQueues - Per-faction production queues
 * @param factionBonuses - Faction bonuses from completed missions
 * @returns True if the faction can produce more divisions
 */
export function canProduceDivision(
  factionId: FactionId,
  regions: RegionState,
  movements: Movement[],
  productionQueues: Record<FactionId, ProductionQueueItem[]>,
  factionBonuses: FactionBonuses
): boolean {
  const cap = calculateDivisionCap(factionId, regions, factionBonuses);
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
 * @param factionBonuses - Faction bonuses from completed missions
 * @returns Object with cap, current, inProduction, and available counts
 */
export function getDivisionCapInfo(
  factionId: FactionId,
  regions: RegionState,
  movements: Movement[],
  productionQueues: Record<FactionId, ProductionQueueItem[]>,
  factionBonuses: FactionBonuses
): {
  cap: number;
  current: number;
  inProduction: number;
  total: number;
  available: number;
  controlledStates: number;
} {
  const cap = calculateDivisionCap(factionId, regions, factionBonuses);
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

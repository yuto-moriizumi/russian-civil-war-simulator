import { CountryId, RegionState, ProductionQueueItem, Movement, CountryBonuses } from '../types/game';

/**
 * Base divisions per state (configurable)
 */
export const DIVISIONS_PER_STATE = 1;

/**
 * Command power consumed per unit (configurable)
 * Each unit will consume this many command power slots
 */
export const COMMAND_POWER_PER_UNIT = 2;

/**
 * Base command power provided to all factions
 */
export const BASE_COMMAND_POWER = 2;

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
 * @param countryId - The country to calculate command power for
 * @param regions - Current region state
 * @param countryBonuses - Country bonuses from completed missions
 * @returns Maximum command power allowed
 */
export function calculateCommandPower(
  countryId: CountryId,
  regions: RegionState,
  countryBonuses: CountryBonuses
): number {
  let totalCap = BASE_COMMAND_POWER;

  // Iterate through all controlled regions
  Object.entries(regions).forEach(([regionId, region]) => {
    if (region.owner === countryId) {
      // Base cap for controlling any state
      totalCap += DIVISIONS_PER_STATE;
      
      // Add bonus for major cities
      if (MAJOR_CITY_CAP_BONUS[regionId]) {
        totalCap += MAJOR_CITY_CAP_BONUS[regionId];
      }
    }
  });

  // Add bonus from completed missions
  totalCap += countryBonuses.commandPowerBonus;

  return totalCap;
}

/**
 * Count current divisions for a faction (in regions + in transit)
 * Each division consumes COMMAND_POWER_PER_UNIT command power slots
 * @param countryId - The country to count for
 * @param regions - Current region state
 * @param movements - Current unit movements
 * @returns Total command power consumed by current divisions
 */
export function countCurrentDivisions(
  countryId: CountryId,
  regions: RegionState,
  movements: Movement[]
): number {
  // Count divisions in regions
  const divisionsInRegions = Object.values(regions).reduce((count, region) => {
    return count + region.divisions.filter(d => d.owner === countryId).length;
  }, 0);

  // Count divisions in transit
  const divisionsInTransit = movements.reduce((count, movement) => {
    if (movement.owner === countryId) {
      return count + movement.divisions.length;
    }
    return count;
  }, 0);

  // Each division consumes COMMAND_POWER_PER_UNIT command power slots
  return (divisionsInRegions + divisionsInTransit) * COMMAND_POWER_PER_UNIT;
}

/**
 * Count divisions in production queue for a faction
 * Each division consumes COMMAND_POWER_PER_UNIT command power slots
 * @param countryId - The country to count for
 * @param productionQueues - Per-country production queues
 * @returns Command power consumed by divisions being produced
 */
export function countDivisionsInProduction(
  countryId: CountryId,
  productionQueues: Record<CountryId, ProductionQueueItem[]>
): number {
  const queue = productionQueues[countryId] || [];
  // Each division in production consumes COMMAND_POWER_PER_UNIT command power slots
  return queue.length * COMMAND_POWER_PER_UNIT;
}

/**
 * Check if a faction can produce another division
 * @param countryId - The country to check
 * @param regions - Current region state
 * @param movements - Current unit movements
 * @param productionQueues - Per-country production queues
 * @param countryBonuses - Country bonuses from completed missions
 * @returns True if the country can produce more divisions
 */
export function canProduceDivision(
  countryId: CountryId,
  regions: RegionState,
  movements: Movement[],
  productionQueues: Record<CountryId, ProductionQueueItem[]>,
  countryBonuses: CountryBonuses
): boolean {
  const cap = calculateCommandPower(countryId, regions, countryBonuses);
  const current = countCurrentDivisions(countryId, regions, movements);
  const inProduction = countDivisionsInProduction(countryId, productionQueues);
  
  // Can produce if: (current + inProduction) < cap
  return (current + inProduction) < cap;
}

/**
 * Get command power info for display
 * @param countryId - The country to get info for
 * @param regions - Current region state
 * @param movements - Current unit movements
 * @param productionQueues - Per-country production queues
 * @param countryBonuses - Country bonuses from completed missions
 * @returns Object with cap, current, inProduction, and available counts
 */
export function getCommandPowerInfo(
  countryId: CountryId,
  regions: RegionState,
  movements: Movement[],
  productionQueues: Record<CountryId, ProductionQueueItem[]>,
  countryBonuses: CountryBonuses
): {
  cap: number;
  current: number;
  inProduction: number;
  total: number;
  available: number;
  controlledStates: number;
} {
  const cap = calculateCommandPower(countryId, regions, countryBonuses);
  const current = countCurrentDivisions(countryId, regions, movements);
  const inProduction = countDivisionsInProduction(countryId, productionQueues);
  const total = current + inProduction;
  const available = Math.max(0, cap - total);
  
  const controlledStates = Object.values(regions).filter(
    region => region.owner === countryId
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

import { CountryId, RegionState, ProductionQueueItem, Movement, CountryBonuses, DivisionState, Modifier } from '../types/game';
import { regionValues } from '../data/map/regionValues';

/**
 * Base divisions per state (configurable)
 */
export const DIVISIONS_PER_STATE = 1;

/**
 * Command power consumed per unit (configurable)
 * Each unit will consume this many command power slots
 */
export const COMMAND_POWER_PER_UNIT = 4;

/**
 * Base command power provided to all countries
 */
export const BASE_COMMAND_POWER = 2;

/**
 * Calculate CP multiplier from a country's modifiers.
 * Each cp_modify item's factors are multiplied together.
 */
function getCpModifierMultiplier(modifiers: Modifier[]): number {
  let multiplier = 1;
  for (const modifier of modifiers) {
    for (const item of modifier.items) {
      if (item.kind === 'cp_modify') {
        multiplier *= item.factor;
      }
    }
  }
  return multiplier;
}

/**
 * Calculate the maximum divisions a country can have based on controlled states
 * @param countryId - The country to calculate command power for
 * @param regions - Current region state
 * @param countryBonuses - Country bonuses from completed missions
 * @param coreRegions - Optional list of core region IDs for this country (controlling these doubles their CP contribution)
 * @param modifiers - Country's active modifiers
 * @returns Maximum command power allowed
 */
export function calculateCommandPower(
  countryId: CountryId,
  regions: RegionState,
  countryBonuses: CountryBonuses,
  coreRegions?: string[],
  modifiers?: Modifier[]
): number {
  let totalCap = BASE_COMMAND_POWER;

  // Iterate through all controlled regions
  Object.entries(regions).forEach(([regionId, region]) => {
    if (region.owner === countryId) {
      // Base cap for controlling any state
      const regionContribution = regionValues[regionId] ?? DIVISIONS_PER_STATE;

      // Core regions provide x2 command power (double their total contribution)
      if (coreRegions?.includes(regionId)) {
        totalCap += regionContribution * 2;
      } else {
        totalCap += regionContribution;
      }
    }
  });

  // Add bonus from completed missions
  totalCap += countryBonuses.commandPowerBonus;

  // Apply modifier multiplier
  if (modifiers && modifiers.length > 0) {
    totalCap = Math.floor(totalCap * getCpModifierMultiplier(modifiers));
  }

  return totalCap;
}

/**
 * Count current divisions for a country (in regions + in transit)
 * Each division consumes COMMAND_POWER_PER_UNIT command power slots
 * @param countryId - The country to count for
 * @param regions - Current region state
 * @param movements - Current unit movements
 * @returns Total command power consumed by current divisions
 */
export function countCurrentDivisions(
  countryId: CountryId,
  divisions: import('../types/game').DivisionState,
  _movements: Movement[]
): number {
  const divisionsCount = Object.values(divisions).filter(d => d.owner === countryId).length;
  return divisionsCount * COMMAND_POWER_PER_UNIT;
}

/**
 * Count divisions in production queue for a country
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
 * Check if a country can produce another division
 * @param countryId - The country to check
 * @param regions - Current region state
 * @param movements - Current unit movements
 * @param productionQueues - Per-country production queues
 * @param countryBonuses - Country bonuses from completed missions
 * @param coreRegions - Optional list of core region IDs for this country
 * @returns True if the country can produce more divisions
 */
export function canProduceDivision(
  countryId: CountryId,
  divisions: DivisionState,
  regions: RegionState,
  movements: Movement[],
  productionQueues: Record<CountryId, ProductionQueueItem[]>,
  countryBonuses: CountryBonuses,
  coreRegions?: string[],
  modifiers?: Modifier[]
): boolean {
  const cap = calculateCommandPower(countryId, regions, countryBonuses, coreRegions, modifiers);
  const current = countCurrentDivisions(countryId, divisions, movements);
  const inProduction = countDivisionsInProduction(countryId, productionQueues);

  // The next division must fully fit within the remaining CP budget.
  return (current + inProduction + COMMAND_POWER_PER_UNIT) <= cap;
}

/**
 * Trim a country's production queue so queued divisions still fit within the
 * current command power cap after accounting for already-fielded/in-transit units.
 */
export function clampProductionQueueToCommandPower(
  countryId: CountryId,
  queue: ProductionQueueItem[],
  divisions: DivisionState,
  regions: RegionState,
  movements: Movement[],
  countryBonuses: CountryBonuses,
  coreRegions?: string[],
  modifiers?: Modifier[]
): ProductionQueueItem[] {
  const cap = calculateCommandPower(countryId, regions, countryBonuses, coreRegions, modifiers);
  const current = countCurrentDivisions(countryId, divisions, movements);
  const maxQueuedDivisions = Math.max(0, Math.floor((cap - current) / COMMAND_POWER_PER_UNIT));

  if (queue.length <= maxQueuedDivisions) {
    return queue;
  }

  return queue.slice(0, maxQueuedDivisions);
}

/**
 * Get command power info for display
 * @param countryId - The country to get info for
 * @param regions - Current region state
 * @param movements - Current unit movements
 * @param productionQueues - Per-country production queues
 * @param countryBonuses - Country bonuses from completed missions
 * @param coreRegions - Optional list of core region IDs for this country
 * @param modifiers - Optional country modifiers
 * @returns Object with cap, current, inProduction, and available counts
 */
export function getCommandPowerInfo(
  countryId: CountryId,
  divisions: DivisionState,
  regions: RegionState,
  movements: Movement[],
  productionQueues: Record<CountryId, ProductionQueueItem[]>,
  countryBonuses: CountryBonuses,
  coreRegions?: string[],
  modifiers?: Modifier[]
): {
  cap: number;
  current: number;
  inProduction: number;
  total: number;
  available: number;
  controlledStates: number;
} {
  const cap = calculateCommandPower(countryId, regions, countryBonuses, coreRegions, modifiers);
  const current = countCurrentDivisions(countryId, divisions, movements);
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

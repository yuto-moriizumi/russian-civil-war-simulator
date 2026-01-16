import { Mission, CountryBonuses, CountryId } from '../types/game';

/**
 * Base stats for divisions
 */
export const BASE_DIVISION_STATS = {
  attack: 20,
  defence: 10,
  hp: 100,
  maxHp: 100,
} as const;

/**
 * Base production time in hours
 */
export const BASE_PRODUCTION_TIME_HOURS = 24;

/**
 * Calculate country bonuses from all claimed missions
 * @param missions - All game missions
 * @param countryId - Country to calculate bonuses for
 * @returns Aggregated bonuses for the country
 */
export function calculateCountryBonuses(
  missions: Mission[],
  countryId: CountryId
): CountryBonuses {
  // Filter to claimed missions for this country
  const claimedMissions = missions.filter(
    m => m.country === countryId && m.claimed
  );

  // Aggregate all bonuses (additive stacking)
  let attackBonus = 0;
  let defenceBonus = 0;
  let hpBonus = 0;
  let maxHpBonus = 0;
  let commandPowerBonus = 0;
  let productionSpeedMultiplier = 1.0; // 1.0 = normal speed

  claimedMissions.forEach(mission => {
    const rewards = mission.rewards;
    
    if (rewards.attackBonus) {
      attackBonus += rewards.attackBonus;
    }
    
    if (rewards.defenceBonus) {
      defenceBonus += rewards.defenceBonus;
    }
    
    if (rewards.hpBonus) {
      hpBonus += rewards.hpBonus;
      maxHpBonus += rewards.hpBonus; // HP bonus applies to both current and max HP
    }
    
    if (rewards.commandPowerBonus) {
      commandPowerBonus += rewards.commandPowerBonus;
    }
    
    if (rewards.productionSpeedBonus) {
      // Multiplicative stacking: each bonus multiplies the previous
      // E.g., 15% + 20% = 0.85 * 0.80 = 0.68 = 32% total reduction
      productionSpeedMultiplier *= (1 - rewards.productionSpeedBonus);
    }
  });

  return {
    attackBonus,
    defenceBonus,
    hpBonus,
    maxHpBonus,
    commandPowerBonus,
    productionSpeedMultiplier,
  };
}

/**
 * Get modified production time based on country bonuses
 * @param countryBonuses - Country's current bonuses
 * @returns Production time in hours
 */
export function getBaseProductionTime(countryBonuses: CountryBonuses): number {
  return BASE_PRODUCTION_TIME_HOURS * countryBonuses.productionSpeedMultiplier;
}

/**
 * Get division stats with bonuses applied
 * @param countryId - Country that owns the division
 * @param countryBonuses - Country's current bonuses
 * @returns Division stats with bonuses
 */
export function getDivisionStats(
  countryId: CountryId,
  countryBonuses: CountryBonuses
): { attack: number; defence: number; hp: number; maxHp: number } {
  return {
    attack: BASE_DIVISION_STATS.attack + countryBonuses.attackBonus,
    defence: BASE_DIVISION_STATS.defence + countryBonuses.defenceBonus,
    hp: BASE_DIVISION_STATS.hp + countryBonuses.hpBonus,
    maxHp: BASE_DIVISION_STATS.maxHp + countryBonuses.maxHpBonus,
  };
}

/**
 * Get initial (zero) bonuses for a country
 * Used when initializing game state
 */
export function getInitialCountryBonuses(): CountryBonuses {
  return {
    attackBonus: 0,
    defenceBonus: 0,
    hpBonus: 0,
    maxHpBonus: 0,
    commandPowerBonus: 0,
    productionSpeedMultiplier: 1.0,
  };
}

/**
 * Format production speed bonus for display
 * @param multiplier - Production speed multiplier (e.g., 0.85 for 15% faster)
 * @returns Formatted percentage string (e.g., "15%")
 */
export function formatProductionSpeedBonus(multiplier: number): string {
  const percentReduction = Math.round((1 - multiplier) * 100);
  return `${percentReduction}%`;
}

import { Mission, FactionBonuses, CountryId, FactionId } from '../types/game';

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
 * Calculate faction bonuses from all claimed missions
 * @param missions - All game missions
 * @param factionId - Faction to calculate bonuses for
 * @returns Aggregated bonuses for the faction
 */
export function calculateFactionBonuses(
  missions: Mission[],
  factionId: CountryId
): FactionBonuses {
  // Filter to claimed missions for this faction
  const claimedMissions = missions.filter(
    m => m.faction === factionId && m.claimed
  );

  // Aggregate all bonuses (additive stacking)
  let attackBonus = 0;
  let defenceBonus = 0;
  let hpBonus = 0;
  let maxHpBonus = 0;
  let divisionCapBonus = 0;
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
    
    if (rewards.divisionCapBonus) {
      divisionCapBonus += rewards.divisionCapBonus;
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
    divisionCapBonus,
    productionSpeedMultiplier,
  };
}

/**
 * Get modified production time based on faction bonuses
 * @param factionBonuses - Faction's current bonuses
 * @returns Production time in hours
 */
export function getBaseProductionTime(factionBonuses: FactionBonuses): number {
  return BASE_PRODUCTION_TIME_HOURS * factionBonuses.productionSpeedMultiplier;
}

/**
 * Get division stats with bonuses applied
 * @param factionId - Faction that owns the division
 * @param factionBonuses - Faction's current bonuses
 * @returns Division stats with bonuses
 */
export function getDivisionStats(
  factionId: FactionId,
  factionBonuses: FactionBonuses
): { attack: number; defence: number; hp: number; maxHp: number } {
  return {
    attack: BASE_DIVISION_STATS.attack + factionBonuses.attackBonus,
    defence: BASE_DIVISION_STATS.defence + factionBonuses.defenceBonus,
    hp: BASE_DIVISION_STATS.hp + factionBonuses.hpBonus,
    maxHp: BASE_DIVISION_STATS.maxHp + factionBonuses.maxHpBonus,
  };
}

/**
 * Get initial (zero) bonuses for a faction
 * Used when initializing game state
 */
export function getInitialFactionBonuses(): FactionBonuses {
  return {
    attackBonus: 0,
    defenceBonus: 0,
    hpBonus: 0,
    maxHpBonus: 0,
    divisionCapBonus: 0,
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

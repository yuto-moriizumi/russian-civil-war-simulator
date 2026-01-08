import { Division, CombatResult, FactionId } from '../types/game';

/**
 * Generate a unique ID for a new division
 */
export function generateDivisionId(): string {
  return `div_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new division with default stats
 */
export function createDivision(
  owner: FactionId,
  name: string,
  options?: {
    hp?: number;
    maxHp?: number;
    attack?: number;
    defence?: number;
  }
): Division {
  const maxHp = options?.maxHp ?? 100;
  return {
    id: generateDivisionId(),
    name,
    owner,
    hp: options?.hp ?? maxHp,
    maxHp,
    attack: options?.attack ?? 20,
    defence: options?.defence ?? 10,
  };
}

/**
 * Calculate damage dealt by an attacker to a defender
 * Damage = attacker's attack - defender's defence (minimum 1)
 */
export function calculateDamage(attacker: Division, defender: Division): number {
  const baseDamage = attacker.attack - defender.defence;
  // Minimum damage is 1 to ensure combat always progresses
  return Math.max(1, baseDamage);
}

/**
 * Apply damage to a division and return the updated division
 * Returns null if the division is destroyed (hp <= 0)
 */
export function applyDamage(division: Division, damage: number): Division | null {
  const newHp = division.hp - damage;
  if (newHp <= 0) {
    return null; // Division is destroyed
  }
  return {
    ...division,
    hp: newHp,
  };
}

/**
 * Resolve combat between attacking and defending divisions
 * Combat proceeds in rounds until one side is eliminated or retreats
 * 
 * Combat mechanics:
 * 1. Each round, all divisions attack simultaneously
 * 2. Damage is distributed among enemy divisions
 * 3. Divisions with hp <= 0 are destroyed
 * 4. Combat ends when one side has no divisions left
 */
export function resolveCombat(
  attackers: Division[],
  defenders: Division[]
): CombatResult {
  // Make copies to avoid mutating original arrays
  let attackerDivisions = attackers.map(d => ({ ...d }));
  let defenderDivisions = defenders.map(d => ({ ...d }));
  
  const initialAttackerCount = attackerDivisions.length;
  const initialDefenderCount = defenderDivisions.length;
  
  // Combat rounds (max 10 to prevent infinite loops)
  const maxRounds = 10;
  
  for (let round = 0; round < maxRounds; round++) {
    if (attackerDivisions.length === 0 || defenderDivisions.length === 0) {
      break;
    }
    
    // Calculate total damage from each side
    const attackerTotalDamage = attackerDivisions.reduce((sum, attacker) => {
      // Each attacker targets a random defender
      const targetIndex = Math.floor(Math.random() * defenderDivisions.length);
      const target = defenderDivisions[targetIndex];
      return sum + calculateDamage(attacker, target);
    }, 0);
    
    const defenderTotalDamage = defenderDivisions.reduce((sum, defender) => {
      // Each defender targets a random attacker
      const targetIndex = Math.floor(Math.random() * attackerDivisions.length);
      const target = attackerDivisions[targetIndex];
      return sum + calculateDamage(defender, target);
    }, 0);
    
    // Distribute damage to attacking divisions
    const damagePerAttacker = Math.ceil(defenderTotalDamage / attackerDivisions.length);
    attackerDivisions = attackerDivisions
      .map(div => applyDamage(div, damagePerAttacker))
      .filter((div): div is Division => div !== null);
    
    // Distribute damage to defending divisions
    const damagePerDefender = Math.ceil(attackerTotalDamage / defenderDivisions.length);
    defenderDivisions = defenderDivisions
      .map(div => applyDamage(div, damagePerDefender))
      .filter((div): div is Division => div !== null);
  }
  
  const attackerCasualties = initialAttackerCount - attackerDivisions.length;
  const defenderCasualties = initialDefenderCount - defenderDivisions.length;
  
  // Region is captured if all defenders are eliminated and at least one attacker survives
  const regionCaptured = defenderDivisions.length === 0 && attackerDivisions.length > 0;
  
  return {
    attackerDivisions,
    defenderDivisions,
    attackerCasualties,
    defenderCasualties,
    regionCaptured,
  };
}

/**
 * Get the total combat strength of a group of divisions
 * Useful for AI decision making and UI display
 */
export function getTotalCombatStrength(divisions: Division[]): number {
  return divisions.reduce((sum, div) => {
    // Strength is based on HP percentage, attack, and defence
    const hpRatio = div.hp / div.maxHp;
    return sum + (div.attack + div.defence) * hpRatio;
  }, 0);
}

/**
 * Get the total HP of a group of divisions
 */
export function getTotalHp(divisions: Division[]): number {
  return divisions.reduce((sum, div) => sum + div.hp, 0);
}

/**
 * Get the count of divisions (for backward compatibility with unit count displays)
 */
export function getDivisionCount(divisions: Division[]): number {
  return divisions.length;
}

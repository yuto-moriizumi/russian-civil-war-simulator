import { Division, CombatResult, FactionId, ActiveCombat, ArmyGroup, RegionState, Adjacency } from '../types/game';

/**
 * Generate a unique ID for a new division
 */
export function generateDivisionId(): string {
  return `div_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate that a division has a valid army group assignment
 * Returns the division (potentially with corrected armyGroupId) and whether it was fixed
 */
export function validateDivisionArmyGroup(
  division: Division,
  armyGroups: ArmyGroup[]
): { division: Division; isValid: boolean; wasFixed: boolean } {
  if (!division.armyGroupId) {
    console.error(`Division ${division.id} (${division.name}) has no army group assigned`);
    return { division, isValid: false, wasFixed: false };
  }
  
  const armyGroup = armyGroups.find(g => g.id === division.armyGroupId);
  if (!armyGroup) {
    console.warn(`Division ${division.id} (${division.name}) is assigned to non-existent army group ${division.armyGroupId}`);
    
    // Try to find any valid army group for this division's owner
    const anyValidGroup = armyGroups.find(g => g.owner === division.owner);
    
    if (anyValidGroup) {
      console.log(`Auto-fixing: Reassigning division ${division.id} to ${anyValidGroup.id} (${anyValidGroup.name})`);
      return {
        division: { ...division, armyGroupId: anyValidGroup.id },
        isValid: true,
        wasFixed: true
      };
    }
    
    console.error(`Cannot auto-fix: No army group found for faction ${division.owner}`);
    return { division, isValid: false, wasFixed: false };
  }
  
  if (armyGroup.owner !== division.owner) {
    console.error(`Division ${division.id} (${division.name}) owner (${division.owner}) does not match army group ${armyGroup.id} owner (${armyGroup.owner})`);
    return { division, isValid: false, wasFixed: false };
  }
  
  return { division, isValid: true, wasFixed: false };
}

/**
 * Create a new division with default stats
 */
export function createDivision(
  owner: FactionId,
  name: string,
  armyGroupId: string,
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
    armyGroupId,
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
 * Result of applying damage to a division
 */
export type DamageResult = 
  | { type: 'survived'; division: Division }
  | { type: 'retreating'; division: Division };

/**
 * Apply damage to a division and return the result
 * - If hp > 0: division survives normally
 * - If hp <= 0: division is marked for retreat
 */
export function applyDamage(division: Division, damage: number): DamageResult {
  const newHp = division.hp - damage;
  if (newHp <= 0) {
    // Division HP reached 0 - mark for retreat
    return { 
      type: 'retreating', 
      division: { ...division, hp: 0 } 
    };
  }
  return {
    type: 'survived',
    division: { ...division, hp: newHp }
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
    const attackerResults = attackerDivisions.map(div => applyDamage(div, damagePerAttacker));
    attackerDivisions = attackerResults
      .filter(result => result.type === 'survived')
      .map(result => result.division);
    
    // Distribute damage to defending divisions
    const damagePerDefender = Math.ceil(attackerTotalDamage / defenderDivisions.length);
    const defenderResults = defenderDivisions.map(div => applyDamage(div, damagePerDefender));
    defenderDivisions = defenderResults
      .filter(result => result.type === 'survived')
      .map(result => result.division);
    // Note: Retreating divisions are lost in resolveCombat (instant resolution)
    // Retreat logic only applies to active combats processed over time
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

/**
 * Generate a unique ID for a combat
 */
export function generateCombatId(): string {
  return `combat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new active combat when units arrive at an enemy region
 */
export function createActiveCombat(
  regionId: string,
  regionName: string,
  attackerFaction: FactionId,
  defenderFaction: FactionId,
  attackerDivisions: Division[],
  defenderDivisions: Division[],
  currentTime: Date
): ActiveCombat {
  const attackerDivisionsCopy = attackerDivisions.map(d => ({ ...d }));
  const defenderDivisionsCopy = defenderDivisions.map(d => ({ ...d }));
  
  // Set lastRoundTime to currentTime so the first round happens after roundIntervalHours
  // This prevents combat from resolving immediately on creation
  const combatId = generateCombatId();
  
  console.log('[COMBAT STARTED]', {
    combatId,
    regionId,
    regionName,
    attackerFaction,
    defenderFaction,
    attackerDivisions: attackerDivisionsCopy.length,
    defenderDivisions: defenderDivisionsCopy.length,
    attackerTotalHp: getTotalHp(attackerDivisionsCopy),
    defenderTotalHp: getTotalHp(defenderDivisionsCopy),
    startTime: currentTime.toISOString(),
  });
  
  return {
    id: combatId,
    regionId,
    regionName,
    attackerFaction,
    defenderFaction,
    attackerDivisions: attackerDivisionsCopy,
    defenderDivisions: defenderDivisionsCopy,
    initialAttackerCount: attackerDivisions.length,
    initialDefenderCount: defenderDivisions.length,
    initialAttackerHp: getTotalHp(attackerDivisions),
    initialDefenderHp: getTotalHp(defenderDivisions),
    currentRound: 0,
    startTime: new Date(currentTime),
    lastRoundTime: new Date(currentTime),
    roundIntervalHours: 1, // One combat round per game hour
    isComplete: false,
    victor: null,
  };
}

/**
 * Process a single combat round for an active combat
 * Returns the updated combat state and any divisions that retreated
 */
export function processCombatRound(
  combat: ActiveCombat,
  regions: RegionState,
  adjacency: Adjacency
): { 
  combat: ActiveCombat; 
  retreatingDivisions: { division: Division; toRegionId: string | null }[] 
} {
  if (combat.isComplete) {
    return { combat, retreatingDivisions: [] };
  }
  
  let attackerDivisions = combat.attackerDivisions.map(d => ({ ...d }));
  let defenderDivisions = combat.defenderDivisions.map(d => ({ ...d }));
  
  // If either side has no divisions, combat is over
  if (attackerDivisions.length === 0 || defenderDivisions.length === 0) {
    return {
      combat: {
        ...combat,
        isComplete: true,
        victor: attackerDivisions.length > 0 ? combat.attackerFaction : 
                defenderDivisions.length > 0 ? combat.defenderFaction : null,
      },
      retreatingDivisions: []
    };
  }
  
  // Calculate total damage from each side
  const attackerTotalDamage = attackerDivisions.reduce((sum, attacker) => {
    const targetIndex = Math.floor(Math.random() * defenderDivisions.length);
    const target = defenderDivisions[targetIndex];
    return sum + calculateDamage(attacker, target);
  }, 0);
  
  const defenderTotalDamage = defenderDivisions.reduce((sum, defender) => {
    const targetIndex = Math.floor(Math.random() * attackerDivisions.length);
    const target = attackerDivisions[targetIndex];
    return sum + calculateDamage(defender, target);
  }, 0);
  
  const retreatingDivisions: { division: Division; toRegionId: string | null }[] = [];
  
  // Distribute damage to attacking divisions
  const damagePerAttacker = Math.ceil(defenderTotalDamage / attackerDivisions.length);
  const attackerResults = attackerDivisions.map(div => applyDamage(div, damagePerAttacker));
  
  // Process attacker results - handle retreats
  attackerDivisions = [];
  attackerResults.forEach(result => {
    if (result.type === 'survived') {
      attackerDivisions.push(result.division);
    } else {
      // Division needs to retreat
      const retreatTarget = findRetreatDestination(
        combat.regionId, 
        result.division.owner, 
        regions, 
        adjacency
      );
      retreatingDivisions.push({
        division: result.division,
        toRegionId: retreatTarget
      });
      if (retreatTarget) {
        console.log(`[RETREAT] ${result.division.name} (${result.division.owner}) retreating from ${combat.regionName} to ${regions[retreatTarget]?.name}`);
      } else {
        console.log(`[DESTROYED] ${result.division.name} (${result.division.owner}) destroyed in ${combat.regionName} (no retreat available)`);
      }
    }
  });
  
  // Distribute damage to defending divisions
  const damagePerDefender = Math.ceil(attackerTotalDamage / defenderDivisions.length);
  const defenderResults = defenderDivisions.map(div => applyDamage(div, damagePerDefender));
  
  // Process defender results - handle retreats
  defenderDivisions = [];
  defenderResults.forEach(result => {
    if (result.type === 'survived') {
      defenderDivisions.push(result.division);
    } else {
      // Division needs to retreat
      const retreatTarget = findRetreatDestination(
        combat.regionId, 
        result.division.owner, 
        regions, 
        adjacency
      );
      retreatingDivisions.push({
        division: result.division,
        toRegionId: retreatTarget
      });
      if (retreatTarget) {
        console.log(`[RETREAT] ${result.division.name} (${result.division.owner}) retreating from ${combat.regionName} to ${regions[retreatTarget]?.name}`);
      } else {
        console.log(`[DESTROYED] ${result.division.name} (${result.division.owner}) destroyed in ${combat.regionName} (no retreat available)`);
      }
    }
  });
  
  const newRound = combat.currentRound + 1;
  const combatEnded = 
    attackerDivisions.length === 0 || 
    defenderDivisions.length === 0;
  
  let victor: FactionId | null = null;
  if (combatEnded) {
    if (defenderDivisions.length === 0 && attackerDivisions.length > 0) {
      victor = combat.attackerFaction;
    } else if (attackerDivisions.length === 0 && defenderDivisions.length > 0) {
      victor = combat.defenderFaction;
    }
  }
  
  // Log combat progress
  console.log('[COMBAT PROGRESS]', {
    combatId: combat.id,
    regionName: combat.regionName,
    round: newRound,
    attackerFaction: combat.attackerFaction,
    defenderFaction: combat.defenderFaction,
    attackerDivisionsRemaining: attackerDivisions.length,
    defenderDivisionsRemaining: defenderDivisions.length,
    attackerHp: getTotalHp(attackerDivisions),
    defenderHp: getTotalHp(defenderDivisions),
    attackerDamageDealt: attackerTotalDamage,
    defenderDamageDealt: defenderTotalDamage,
    retreats: retreatingDivisions.length,
  });
  
  if (combatEnded) {
    console.log('[COMBAT ENDED]', {
      combatId: combat.id,
      regionName: combat.regionName,
      totalRounds: newRound,
      victor,
      attackerSurvivors: attackerDivisions.length,
      defenderSurvivors: defenderDivisions.length,
      attackerLosses: combat.initialAttackerCount - attackerDivisions.length,
      defenderLosses: combat.initialDefenderCount - defenderDivisions.length,
    });
  }
  
  return {
    combat: {
      ...combat,
      attackerDivisions,
      defenderDivisions,
      currentRound: newRound,
      isComplete: combatEnded,
      victor,
    },
    retreatingDivisions
  };
}

/**
 * Find a valid retreat destination for a division
 * Returns a region ID if a valid retreat exists, null if the division should be destroyed
 */
function findRetreatDestination(
  combatRegionId: string,
  divisionOwner: FactionId,
  regions: RegionState,
  adjacency: Adjacency
): string | null {
  const adjacentRegionIds = adjacency[combatRegionId] || [];
  
  // Filter to friendly regions
  const friendlyNeighbors = adjacentRegionIds.filter(regionId => {
    const region = regions[regionId];
    return region && region.owner === divisionOwner;
  });
  
  if (friendlyNeighbors.length === 0) {
    return null; // No friendly neighbors - division is destroyed
  }
  
  // Pick a random friendly neighbor
  const randomIndex = Math.floor(Math.random() * friendlyNeighbors.length);
  return friendlyNeighbors[randomIndex];
}

/**
 * Check if a combat round should be processed based on game time
 */
export function shouldProcessCombatRound(combat: ActiveCombat, currentTime: Date): boolean {
  if (combat.isComplete) return false;
  
  const hoursSinceLastRound = 
    (currentTime.getTime() - combat.lastRoundTime.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceLastRound >= combat.roundIntervalHours;
}

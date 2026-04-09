import { Division, CombatResult, CountryId, ActiveCombat, ArmyGroup, RegionState, Adjacency, CountryBonuses } from '../types/game';
import { getDivisionStats } from './bonusCalculator';

export function generateDivisionId(): string {
  return `div_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

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
    const anyValidGroup = armyGroups.find(g => g.owner === division.owner);
    if (anyValidGroup) {
      console.log(`Auto-fixing: Reassigning division ${division.id} to ${anyValidGroup.id} (${anyValidGroup.name})`);
      return { division: { ...division, armyGroupId: anyValidGroup.id }, isValid: true, wasFixed: true };
    }
    console.error(`Cannot auto-fix: No army group found for country ${division.owner}`);
    return { division, isValid: false, wasFixed: false };
  }
  
  if (armyGroup.owner !== division.owner) {
    console.error(`Division ${division.id} (${division.name}) owner (${division.owner}) does not match army group ${armyGroup.id} owner (${armyGroup.owner})`);
    return { division, isValid: false, wasFixed: false };
  }
  
  return { division, isValid: true, wasFixed: false };
}

export function createDivision(
  owner: CountryId,
  name: string,
  armyGroupId: string,
  countryBonuses: CountryBonuses,
  options?: {
    hp?: number;
    maxHp?: number;
    attack?: number;
    defence?: number;
  }
): Division {
  const stats = getDivisionStats(owner, countryBonuses);
  const maxHp = options?.maxHp ?? stats.maxHp;
  return {
    id: generateDivisionId(),
    name,
    owner,
    armyGroupId,
    hp: options?.hp ?? maxHp,
    maxHp,
    attack: options?.attack ?? stats.attack,
    defence: options?.defence ?? stats.defence,
  };
}

export function calculateDamage(attacker: Division, defender: Division): number {
  return Math.max(1, attacker.attack - defender.defence);
}

/**
 * Result of applying damage to a division
 */
export type DamageResult = 
  | { type: 'survived'; division: Division }
  | { type: 'retreating'; division: Division };

export function applyDamage(division: Division, damage: number): DamageResult {
  const newHp = division.hp - damage;
  if (newHp <= 0) {
    return { type: 'retreating', division: { ...division, hp: 0 } };
  }
  return { type: 'survived', division: { ...division, hp: newHp } };
}

export function resolveCombat(
  attackers: Division[],
  defenders: Division[]
): CombatResult {
  let attackerDivisions = attackers.map(d => ({ ...d }));
  let defenderDivisions = defenders.map(d => ({ ...d }));
  
  const initialAttackerCount = attackerDivisions.length;
  const initialDefenderCount = defenderDivisions.length;
  
  const maxRounds = 10;
  
  for (let round = 0; round < maxRounds; round++) {
    if (attackerDivisions.length === 0 || defenderDivisions.length === 0) {
      break;
    }
    
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
    
    const damagePerAttacker = Math.ceil(defenderTotalDamage / attackerDivisions.length);
    const attackerResults = attackerDivisions.map(div => applyDamage(div, damagePerAttacker));
    attackerDivisions = attackerResults
      .filter(result => result.type === 'survived')
      .map(result => result.division);
    
    const damagePerDefender = Math.ceil(attackerTotalDamage / defenderDivisions.length);
    const defenderResults = defenderDivisions.map(div => applyDamage(div, damagePerDefender));
    defenderDivisions = defenderResults
      .filter(result => result.type === 'survived')
      .map(result => result.division);
  }
  
  const attackerCasualties = initialAttackerCount - attackerDivisions.length;
  const defenderCasualties = initialDefenderCount - defenderDivisions.length;
  const regionCaptured = defenderDivisions.length === 0 && attackerDivisions.length > 0;
  
  return {
    attackerDivisions,
    defenderDivisions,
    attackerCasualties,
    defenderCasualties,
    regionCaptured,
  };
}

export function getTotalCombatStrength(divisions: Division[]): number {
  return divisions.reduce((sum, div) => {
    const hpRatio = div.hp / div.maxHp;
    return sum + (div.attack + div.defence) * hpRatio;
  }, 0);
}

export function getTotalHp(divisions: Division[]): number {
  return divisions.reduce((sum, div) => sum + div.hp, 0);
}

export function getDivisionCount(divisions: Division[]): number {
  return divisions.length;
}

export function generateCombatId(): string {
  return `combat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createActiveCombat(
  regionId: string,
  regionName: string,
  attackerCountry: CountryId,
  defenderCountry: CountryId,
  attackerDivisions: Division[],
  defenderDivisions: Division[],
  currentTime: Date
): ActiveCombat {
  const attackerDivisionsCopy = attackerDivisions.map(d => ({ ...d }));
  const defenderDivisionsCopy = defenderDivisions.map(d => ({ ...d }));
  const combatId = generateCombatId();
  console.log('[COMBAT STARTED]', { combatId, regionId, regionName, attackerCountry, defenderCountry,
    attackerDivisions: attackerDivisionsCopy.length, defenderDivisions: defenderDivisionsCopy.length,
    attackerTotalHp: getTotalHp(attackerDivisionsCopy), defenderTotalHp: getTotalHp(defenderDivisionsCopy),
    startTime: currentTime.toISOString() });
  
  return {
    id: combatId,
    regionId,
    regionName,
    attackerCountry,
    defenderCountry,
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
 * Process a single combat round for an active combat.
 * Returns the updated combat state and any divisions that retreated.
 * On the final round, winner-side divisions that reached HP=0 are restored
 * to HP=1 so they remain in the victorious region rather than retreating.
 */
export function processCombatRound(
  combat: ActiveCombat,
  regions: RegionState,
  adjacency: Adjacency
): { 
  combat: ActiveCombat; 
  retreatingDivisions: { division: Division; toRegionId: string | null; fromRegionId: string }[] 
} {
  if (combat.isComplete) {
    return { combat, retreatingDivisions: [] };
  }
  
  let attackerDivisions = combat.attackerDivisions.map(d => ({ ...d }));
  let defenderDivisions = combat.defenderDivisions.map(d => ({ ...d }));
  
  if (attackerDivisions.length === 0 || defenderDivisions.length === 0) {
    return {
      combat: {
        ...combat,
        isComplete: true,
        victor: attackerDivisions.length > 0 ? combat.attackerCountry : 
                defenderDivisions.length > 0 ? combat.defenderCountry : null,
      },
      retreatingDivisions: []
    };
  }
  
  const attackerTotalDamage = attackerDivisions.reduce((sum, attacker) => {
    const targetIndex = Math.floor(Math.random() * defenderDivisions.length);
    return sum + calculateDamage(attacker, defenderDivisions[targetIndex]);
  }, 0);
  
  const defenderTotalDamage = defenderDivisions.reduce((sum, defender) => {
    const targetIndex = Math.floor(Math.random() * attackerDivisions.length);
    return sum + calculateDamage(defender, attackerDivisions[targetIndex]);
  }, 0);
  
  const retreatingDivisions: { division: Division; toRegionId: string | null; fromRegionId: string }[] = [];
  
  const damagePerAttacker = Math.ceil(defenderTotalDamage / attackerDivisions.length);
  const attackerResults = attackerDivisions.map(div => applyDamage(div, damagePerAttacker));
  
  attackerDivisions = [];
  attackerResults.forEach(result => {
    if (result.type === 'survived') {
      attackerDivisions.push(result.division);
    } else {
      const retreatTarget = findRetreatDestination(combat.regionId, result.division.owner, regions, adjacency);
      retreatingDivisions.push({ division: result.division, toRegionId: retreatTarget, fromRegionId: combat.regionId });
      if (retreatTarget) {
        console.log(`[RETREAT] ${result.division.name} (${result.division.owner}) retreating from ${combat.regionName} to ${regions[retreatTarget]?.name}`);
      } else {
        console.log(`[DESTROYED] ${result.division.name} (${result.division.owner}) destroyed in ${combat.regionName} (no retreat available)`);
      }
    }
  });
  
  const damagePerDefender = Math.ceil(attackerTotalDamage / defenderDivisions.length);
  const defenderResults = defenderDivisions.map(div => applyDamage(div, damagePerDefender));
  
  defenderDivisions = [];
  defenderResults.forEach(result => {
    if (result.type === 'survived') {
      defenderDivisions.push(result.division);
    } else {
      const retreatTarget = findRetreatDestination(combat.regionId, result.division.owner, regions, adjacency);
      retreatingDivisions.push({ division: result.division, toRegionId: retreatTarget, fromRegionId: combat.regionId });
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
  
  let victor: CountryId | null = null;
  if (combatEnded) {
    victor = (defenderDivisions.length === 0 && attackerDivisions.length > 0)
      ? combat.attackerCountry
      : combat.defenderCountry;

    // Restore winner's HP=0 divisions to HP=1 so they stay in the victorious region.
    const winnerCountry = victor;
    const winnerRetreatingIndices: number[] = [];
    retreatingDivisions.forEach((r, i) => {
      if (r.division.owner === winnerCountry) {
        winnerRetreatingIndices.push(i);
        const restoredDivision = { ...r.division, hp: 1 };
        if (winnerCountry === combat.attackerCountry) {
          attackerDivisions.push(restoredDivision);
        } else {
          defenderDivisions.push(restoredDivision);
        }
        console.log(`[VICTORY RESTORE] ${r.division.name} (${r.division.owner}) restored to HP=1 after winning in ${combat.regionName}`);
      }
    });
    for (let i = winnerRetreatingIndices.length - 1; i >= 0; i--) {
      retreatingDivisions.splice(winnerRetreatingIndices[i], 1);
    }
  }
  
  console.log('[COMBAT PROGRESS]', {
    combatId: combat.id, regionName: combat.regionName, round: newRound,
    attackerCountry: combat.attackerCountry, defenderCountry: combat.defenderCountry,
    attackerDivisionsRemaining: attackerDivisions.length, defenderDivisionsRemaining: defenderDivisions.length,
    attackerHp: getTotalHp(attackerDivisions), defenderHp: getTotalHp(defenderDivisions),
    attackerDamageDealt: attackerTotalDamage, defenderDamageDealt: defenderTotalDamage,
    retreats: retreatingDivisions.length,
  });
  if (combatEnded) {
    console.log('[COMBAT ENDED]', {
      combatId: combat.id, regionName: combat.regionName, totalRounds: newRound, victor,
      attackerSurvivors: attackerDivisions.length, defenderSurvivors: defenderDivisions.length,
      attackerLosses: combat.initialAttackerCount - attackerDivisions.length,
      defenderLosses: combat.initialDefenderCount - defenderDivisions.length,
    });
  }
  return {
    combat: { ...combat, attackerDivisions, defenderDivisions, currentRound: newRound, isComplete: combatEnded, victor },
    retreatingDivisions
  };
}

function findRetreatDestination(
  combatRegionId: string,
  divisionOwner: CountryId,
  regions: RegionState,
  adjacency: Adjacency
): string | null {
  const adjacentRegionIds = adjacency[combatRegionId] || [];
  const friendlyNeighbors = adjacentRegionIds.filter(regionId => {
    const region = regions[regionId];
    return region && region.owner === divisionOwner;
  });
  if (friendlyNeighbors.length === 0) return null;
  return friendlyNeighbors[Math.floor(Math.random() * friendlyNeighbors.length)];
}

export function shouldProcessCombatRound(combat: ActiveCombat, currentTime: Date): boolean {
  if (combat.isComplete) return false;
  const hoursSinceLastRound = (currentTime.getTime() - combat.lastRoundTime.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastRound >= combat.roundIntervalHours;
}

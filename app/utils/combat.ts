import { Division, CombatResult, CountryId, ActiveCombat, ArmyGroup, RegionState, Adjacency, CountryBonuses, DivisionState } from '../types/game';
import { getDivisionStats } from './bonusCalculator';
import { GAME_CONFIG } from '../constants/gameConfig';

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
    regionId: null,
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
  attackerRegionId: string,
  attackerRegionName: string,
  defenderRegionId: string,
  defenderRegionName: string,
  attackerCountry: CountryId,
  defenderCountry: CountryId,
  attackerDivisions: Division[],
  defenderDivisions: Division[],
  currentTime: Date
): ActiveCombat {
  const combatId = generateCombatId();

  return {
    id: combatId,
    attackerRegionId,
    attackerRegionName,
    defenderRegionId,
    defenderRegionName,
    attackerCountry,
    defenderCountry,
    attackerDivisionIds: attackerDivisions.map(d => d.id),
    defenderDivisionIds: defenderDivisions.map(d => d.id),
    initialAttackerCount: attackerDivisions.length,
    initialDefenderCount: defenderDivisions.length,
    initialAttackerHp: getTotalHp(attackerDivisions),
    initialDefenderHp: getTotalHp(defenderDivisions),
    currentRound: 0,
    startTime: new Date(currentTime),
    lastRoundTime: new Date(currentTime),
    roundIntervalHours: GAME_CONFIG.COMBAT.ROUND_INTERVAL_HOURS,
    isComplete: false,
    victor: null,
  };
}

/**
 * Process a single combat round for an active combat.
 * Reads division data from DivisionState. Returns the updated combat state,
 * updated DivisionState (with post-round HP), and retreating division IDs.
 * On the final round, winner-side divisions that reached HP=0 are restored
 * to HP=1 so they remain in the victorious region rather than retreating.
 */
export function processCombatRound(
  combat: ActiveCombat,
  divisions: DivisionState,
  regions: RegionState,
  adjacency: Adjacency
): {
  combat: ActiveCombat;
  updatedDivisions: DivisionState;
  retreatingDivisions: { divisionId: string; toRegionId: string | null; fromRegionId: string }[];
} {
  if (combat.isComplete) {
    return { combat, updatedDivisions: divisions, retreatingDivisions: [] };
  }

  const defenderRegion = regions[combat.defenderRegionId];
  if (defenderRegion && defenderRegion.owner !== combat.defenderCountry) {
    const newOwnerIsAttacker = defenderRegion.owner === combat.attackerCountry;
    if (newOwnerIsAttacker) {
      console.log('[COMBAT CANCELLED]', { combatId: combat.id, reason: 'defender region already captured by attacker' });
      return {
        combat: { ...combat, isComplete: true, victor: combat.attackerCountry },
        updatedDivisions: divisions,
        retreatingDivisions: [],
      };
    } else {
      console.log('[COMBAT CANCELLED]', { combatId: combat.id, reason: 'defender region captured by third party' });
      return {
        combat: { ...combat, isComplete: true, victor: combat.defenderCountry },
        updatedDivisions: divisions,
        retreatingDivisions: combat.attackerDivisionIds.map(id => ({
          divisionId: id,
          toRegionId: combat.attackerRegionId,
          fromRegionId: combat.attackerRegionId,
        })),
      };
    }
  }

  // Build local mutable arrays from DivisionState for damage computation
  let attackerDivisions: Division[] = combat.attackerDivisionIds.map(id => ({ ...divisions[id] })).filter(d => d.id);
  let defenderDivisions: Division[] = combat.defenderDivisionIds.map(id => ({ ...divisions[id] })).filter(d => d.id);

  if (attackerDivisions.length === 0 || defenderDivisions.length === 0) {
    return {
      combat: {
        ...combat,
        isComplete: true,
        victor: attackerDivisions.length > 0 ? combat.attackerCountry :
                defenderDivisions.length > 0 ? combat.defenderCountry : null,
      },
      updatedDivisions: divisions,
      retreatingDivisions: [],
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

  const retreatingDivisions: { divisionId: string; toRegionId: string | null; fromRegionId: string }[] = [];

  const damagePerAttacker = Math.ceil(defenderTotalDamage / attackerDivisions.length);
  const attackerResults = attackerDivisions.map(div => applyDamage(div, damagePerAttacker));

  attackerDivisions = [];
  attackerResults.forEach(result => {
    if (result.type === 'survived') {
      attackerDivisions.push(result.division);
    } else {
      const retreatTarget = findRetreatDestination(combat.defenderRegionId, result.division.owner, regions, adjacency, true, combat.attackerRegionId);
      retreatingDivisions.push({ divisionId: result.division.id, toRegionId: retreatTarget, fromRegionId: combat.attackerRegionId });
      if (retreatTarget) {
        console.log(`[RETREAT] ${result.division.name} (${result.division.owner}) retreating from border at ${combat.defenderRegionName} to ${regions[retreatTarget]?.name ?? retreatTarget}`);
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
      const retreatTarget = findRetreatDestination(combat.defenderRegionId, result.division.owner, regions, adjacency, false, combat.attackerRegionId);
      retreatingDivisions.push({ divisionId: result.division.id, toRegionId: retreatTarget, fromRegionId: combat.defenderRegionId });
      if (retreatTarget) {
        console.log(`[RETREAT] ${result.division.name} (${result.division.owner}) retreating from ${combat.defenderRegionName} to ${regions[retreatTarget]?.name ?? retreatTarget}`);
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

    const winnerCountry = victor;
    const winnerRetreatingIndices: number[] = [];
    retreatingDivisions.forEach((r, i) => {
      const div = divisions[r.divisionId];
      if (div && div.owner === winnerCountry) {
        winnerRetreatingIndices.push(i);
        const restoredDivision = { ...div, hp: 1 };
        if (winnerCountry === combat.attackerCountry) {
          attackerDivisions.push(restoredDivision);
        } else {
          defenderDivisions.push(restoredDivision);
        }
        console.log(`[VICTORY RESTORE] ${div.name} (${div.owner}) restored to HP=1 after winning at border of ${combat.defenderRegionName}`);
      }
    });
    for (let i = winnerRetreatingIndices.length - 1; i >= 0; i--) {
      retreatingDivisions.splice(winnerRetreatingIndices[i], 1);
    }
  }

  if (combatEnded) {
    console.log('[COMBAT ENDED]', {
      combatId: combat.id, defenderRegionName: combat.defenderRegionName, totalRounds: newRound, victor,
      attackerSurvivors: attackerDivisions.length, defenderSurvivors: defenderDivisions.length,
      attackerLosses: combat.initialAttackerCount - attackerDivisions.length,
      defenderLosses: combat.initialDefenderCount - defenderDivisions.length,
    });
  }

  // Apply HP changes to DivisionState
  let updatedDivisions = { ...divisions };
  for (const div of [...attackerDivisions, ...defenderDivisions]) {
    updatedDivisions = { ...updatedDivisions, [div.id]: { ...updatedDivisions[div.id], hp: div.hp } };
  }

  return {
    combat: {
      ...combat,
      attackerDivisionIds: attackerDivisions.map(d => d.id),
      defenderDivisionIds: defenderDivisions.map(d => d.id),
      currentRound: newRound,
      isComplete: combatEnded,
      victor,
    },
    updatedDivisions,
    retreatingDivisions,
  };
}

export function findRetreatDestination(
  combatRegionId: string,
  divisionOwner: CountryId,
  regions: RegionState,
  adjacency: Adjacency,
  isAttacker: boolean,
  attackerRegionId: string
): string | null {
  if (isAttacker) {
    const originRegion = regions[attackerRegionId];
    if (originRegion && originRegion.owner === divisionOwner) {
      return attackerRegionId;
    }
    const adjacentRegionIds = adjacency[attackerRegionId] || [];
    const friendlyNeighbors = adjacentRegionIds.filter(regionId => {
      const region = regions[regionId];
      return region && region.owner === divisionOwner;
    });
    if (friendlyNeighbors.length > 0) {
      return friendlyNeighbors[Math.floor(Math.random() * friendlyNeighbors.length)];
    }
    return null;
  }

  const adjacentRegionIds = adjacency[combatRegionId] || [];
  const friendlyNeighbors = adjacentRegionIds.filter(regionId => {
    if (regionId === attackerRegionId) return false;
    const region = regions[regionId];
    return region && region.owner === divisionOwner;
  });
  if (friendlyNeighbors.length > 0) {
    return friendlyNeighbors[Math.floor(Math.random() * friendlyNeighbors.length)];
  }
  const allFriendly = adjacentRegionIds.filter(regionId => {
    const region = regions[regionId];
    return region && region.owner === divisionOwner;
  });
  if (allFriendly.length > 0) return allFriendly[Math.floor(Math.random() * allFriendly.length)];
  return null;
}

export function shouldProcessCombatRound(combat: ActiveCombat, currentTime: Date): boolean {
  if (combat.isComplete) return false;
  const hoursSinceLastRound = (currentTime.getTime() - combat.lastRoundTime.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastRound >= combat.roundIntervalHours;
}

export { processCombatRounds } from './sharedDefenseProcessing';

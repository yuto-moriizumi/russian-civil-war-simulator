import { Division, CombatResult, CountryId, ActiveCombat, ArmyGroup, CountryBonuses, RegionState, Adjacency } from '../types/game';
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

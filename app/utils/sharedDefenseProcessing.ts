import { ActiveCombat, Division, CountryId, RegionState, Adjacency } from '../types/game';
import { processCombatRound, calculateDamage, applyDamage, DamageResult, findRetreatDestination } from './combat';

interface CombatCalculation {
  combat: ActiveCombat;
  attackerDivisions: Division[];
  defenderDivisions: Division[];
  attackerTotalDamage: number;
  defenderTotalDamage: number;
  needsSharedProcessing: boolean;
}

interface RoundResult {
  combat: ActiveCombat;
  retreatingDivisions: { division: Division; toRegionId: string | null; fromRegionId: string }[];
}

/**
 * Process a round for multiple combats simultaneously, aggregating damage
 * to defenders that are shared across combats (same defenderRegionId).
 * This ensures multi-directional attacks deal cumulative damage rather than
 * each combat dealing independent damage to copies of the same defenders.
 */
export function processCombatRounds(
  combats: ActiveCombat[],
  regions: RegionState,
  adjacency: Adjacency,
  currentTime: Date
): RoundResult[] {
  const results: RoundResult[] = [];

  // Group combats by defenderRegionId
  const groups = new Map<string, ActiveCombat[]>();
  for (const combat of combats) {
    const key = combat.defenderRegionId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(combat);
  }

  for (const [, group] of groups) {
    if (group.length === 1) {
      results.push(
        processCombatRound({ ...group[0], lastRoundTime: new Date(currentTime) }, regions, adjacency)
      );
      continue;
    }
    results.push(...processSharedDefenseRound(group, regions, adjacency, currentTime));
  }

  return results;
}

function processSharedDefenseRound(
  combats: ActiveCombat[],
  regions: RegionState,
  adjacency: Adjacency,
  currentTime: Date
): RoundResult[] {
  const results: RoundResult[] = [];
  const defenderRegion = regions[combats[0].defenderRegionId];

  // Check validity for all combats first
  for (const combat of combats) {
    if (combat.isComplete) {
      results.push({ combat, retreatingDivisions: [] });
      continue;
    }
    if (defenderRegion && defenderRegion.owner !== combat.defenderCountry) {
      const newOwnerIsAttacker = defenderRegion.owner === combat.attackerCountry;
      results.push({
        combat: { ...combat, isComplete: true, victor: newOwnerIsAttacker ? combat.attackerCountry : combat.defenderCountry, lastRoundTime: new Date(currentTime) },
        retreatingDivisions: newOwnerIsAttacker ? [] : combat.attackerDivisions.map(d => ({
          division: d, toRegionId: combat.attackerRegionId, fromRegionId: combat.attackerRegionId,
        })),
      });
      continue;
    }
  }

  const activeCombats = combats.filter(c => !c.isComplete && !(defenderRegion && defenderRegion.owner !== c.defenderCountry));
  if (activeCombats.length === 0) return results;

  const combatCalc = buildCombatCalculations(activeCombats, currentTime);

  // Aggregate total attacker damage across all active combats
  const totalAttackerDamage = combatCalc
    .filter(c => c.needsSharedProcessing)
    .reduce((sum, c) => sum + c.attackerTotalDamage, 0);

  // Build shared defender pool from the first active combat
  const firstActive = combatCalc.find(c => c.needsSharedProcessing)!;
  const sharedDefenderDivisions = firstActive.defenderDivisions.map(d => ({ ...d }));

  // Apply aggregated attacker damage to shared defenders
  const damagePerDefender = Math.ceil(totalAttackerDamage / sharedDefenderDivisions.length);
  const sharedDefenderResults = sharedDefenderDivisions.map((div: Division) => applyDamage(div, damagePerDefender));

  const survivingSharedDefenders = sharedDefenderResults
    .filter((r: DamageResult) => r.type === 'survived')
    .map((r: DamageResult) => r.division);

  const defeatedDefenderDivisions = sharedDefenderResults
    .filter((r: DamageResult) => r.type === 'retreating')
    .map((r: DamageResult) => r.division);

  // Process each combat: apply counter-damage, update defenders, determine retreats
  const firstSharedCombatId = activeCombats.find(c => !c.isComplete && !(defenderRegion && defenderRegion.owner !== c.defenderCountry))?.id;

  for (const calc of combatCalc) {
    if (!calc.needsSharedProcessing) {
      results.push({ combat: calc.combat, retreatingDivisions: [] });
      continue;
    }

    const retreats = processAttackerRound(
      calc, survivingSharedDefenders, defeatedDefenderDivisions,
      calc.combat.id === firstSharedCombatId,
      regions, adjacency, currentTime
    );

    results.push({
      combat: {
        ...calc.combat,
        attackerDivisions: calc.attackerDivisions.filter(d => d.hp > 0),
        defenderDivisions: survivingSharedDefenders,
        currentRound: calc.combat.currentRound + 1,
        isComplete: calc.attackerDivisions.filter(d => d.hp > 0).length === 0 || survivingSharedDefenders.length === 0,
        lastRoundTime: new Date(currentTime),
      },
      retreatingDivisions: retreats,
    });
  }

  return results;
}

function buildCombatCalculations(activeCombats: ActiveCombat[], currentTime: Date): CombatCalculation[] {
  return activeCombats.map(combat => {
    const attackerDivisions = combat.attackerDivisions.map(d => ({ ...d }));
    const defenderDivisions = combat.defenderDivisions.map(d => ({ ...d }));

    if (attackerDivisions.length === 0 || defenderDivisions.length === 0) {
      return {
        combat: {
          ...combat, isComplete: true,
          victor: attackerDivisions.length > 0 ? combat.attackerCountry : combat.defenderCountry,
          attackerDivisions, defenderDivisions,
          currentRound: combat.currentRound + 1,
          lastRoundTime: new Date(currentTime),
        },
        attackerDivisions: [], defenderDivisions: [],
        attackerTotalDamage: 0, defenderTotalDamage: 0,
        needsSharedProcessing: false,
      };
    }

    const attackerTotalDamage = attackerDivisions.reduce((sum, a) => {
      return sum + calculateDamage(a, defenderDivisions[Math.floor(Math.random() * defenderDivisions.length)]);
    }, 0);

    const defenderTotalDamage = defenderDivisions.reduce((sum, d) => {
      return sum + calculateDamage(d, attackerDivisions[Math.floor(Math.random() * attackerDivisions.length)]);
    }, 0);

    return { combat, attackerDivisions, defenderDivisions, attackerTotalDamage, defenderTotalDamage, needsSharedProcessing: true };
  });
}

function processAttackerRound(
  calc: CombatCalculation,
  survivingSharedDefenders: Division[],
  defeatedDefenderDivisions: Division[],
  isFirstInGroup: boolean,
  regions: RegionState,
  adjacency: Adjacency,
  _currentTime: Date
): RoundResult['retreatingDivisions'] {
  const { combat, attackerDivisions, defenderTotalDamage } = calc;
  const retreats: RoundResult['retreatingDivisions'] = [];

  const damagePerAttacker = Math.ceil(defenderTotalDamage / attackerDivisions.length);
  const attackerResults = attackerDivisions.map((div: Division) => applyDamage(div, damagePerAttacker));

  const survivingAttackers: Division[] = [];
  for (const result of attackerResults) {
    if (result.type === 'survived') {
      survivingAttackers.push(result.division);
    } else {
      const retreatTarget = findRetreatDestination(combat.defenderRegionId, result.division.owner, regions, adjacency, true, combat.attackerRegionId);
      retreats.push({ division: result.division, toRegionId: retreatTarget, fromRegionId: combat.attackerRegionId });
      if (retreatTarget) {
        console.log(`[RETREAT] ${result.division.name} (${result.division.owner}) retreating from border at ${combat.defenderRegionName} to ${regions[retreatTarget]?.name ?? retreatTarget}`);
      }
    }
  }

  const combatEnded = survivingAttackers.length === 0 || survivingSharedDefenders.length === 0;
  let victor: CountryId | null = null;

  if (combatEnded) {
    victor = survivingSharedDefenders.length === 0 ? combat.attackerCountry : combat.defenderCountry;

    if (victor === combat.attackerCountry) {
      // Restore defeated attacker divisions to HP=1
      for (const result of attackerResults.filter((r: DamageResult) => r.type === 'retreating')) {
        survivingAttackers.push({ ...result.division, hp: 1 });
        const idx = retreats.findIndex(r => r.division.id === result.division.id);
        if (idx >= 0) retreats.splice(idx, 1);
      }
    } else {
      // Restore defeated defender divisions
      for (const defDiv of defeatedDefenderDivisions) {
        survivingSharedDefenders.push({ ...defDiv, hp: 1 });
      }
    }

    console.log('[COMBAT ENDED]', {
      combatId: combat.id, defenderRegionName: combat.defenderRegionName,
      totalRounds: combat.currentRound + 1, victor,
      attackerSurvivors: survivingAttackers.length, defenderSurvivors: survivingSharedDefenders.length,
      attackerLosses: combat.initialAttackerCount - survivingAttackers.length,
      defenderLosses: combat.initialDefenderCount - survivingSharedDefenders.length,
    });
  }

  // Generate defender retreat events from first combat only to avoid duplicates
  if (isFirstInGroup && defeatedDefenderDivisions.length > 0 && survivingSharedDefenders.length === 0) {
    for (const defDiv of defeatedDefenderDivisions) {
      const retreatTarget = findRetreatDestination(combat.defenderRegionId, defDiv.owner, regions, adjacency, false, combat.attackerRegionId);
      retreats.push({ division: defDiv, toRegionId: retreatTarget, fromRegionId: combat.defenderRegionId });
      if (retreatTarget) {
        console.log(`[RETREAT] ${defDiv.name} (${defDiv.owner}) retreating from ${combat.defenderRegionName} to ${regions[retreatTarget]?.name ?? retreatTarget}`);
      }
    }
  }

  return retreats;
}

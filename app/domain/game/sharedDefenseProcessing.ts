import { ActiveCombat, Division, CountryId, RegionState, Adjacency, DivisionState } from '../../types/game';
import { calculateDamage, applyDamage, DamageResult, findRetreatDestination } from './combat';

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
  updatedDivisions: DivisionState;
  retreatingDivisions: { divisionId: string; toRegionId: string | null; fromRegionId: string }[];
}

/**
 * Process a round for multiple combats simultaneously, aggregating damage
 * to defenders that are shared across combats (same defenderRegionId).
 */
export function processCombatRounds(
  combats: ActiveCombat[],
  regions: RegionState,
  adjacency: Adjacency,
  currentTime: Date,
  divisions: DivisionState
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
        processCombatRound({ ...group[0], lastRoundTime: new Date(currentTime) }, divisions, regions, adjacency)
      );
      continue;
    }
    results.push(...processSharedDefenseRound(group, regions, adjacency, currentTime, divisions));
  }

  return results;
}

function processSharedDefenseRound(
  combats: ActiveCombat[],
  regions: RegionState,
  adjacency: Adjacency,
  currentTime: Date,
  divisions: DivisionState
): RoundResult[] {
  const results: RoundResult[] = [];
  const defenderRegion = regions[combats[0].defenderRegionId];

  // Check validity for all combats first
  for (const combat of combats) {
    if (combat.isComplete) {
      results.push({ combat, updatedDivisions: divisions, retreatingDivisions: [] });
      continue;
    }
    if (defenderRegion && defenderRegion.owner !== combat.defenderCountry) {
      const newOwnerIsAttacker = defenderRegion.owner === combat.attackerCountry;
      results.push({
        combat: { ...combat, isComplete: true, victor: newOwnerIsAttacker ? combat.attackerCountry : combat.defenderCountry, lastRoundTime: new Date(currentTime) },
        updatedDivisions: divisions,
        retreatingDivisions: newOwnerIsAttacker ? [] : combat.attackerDivisionIds.map(id => ({
          divisionId: id, toRegionId: combat.attackerRegionId, fromRegionId: combat.attackerRegionId,
        })),
      });
      continue;
    }
  }

  const activeCombats = combats.filter(c => !c.isComplete && !(defenderRegion && defenderRegion.owner !== c.defenderCountry));
  if (activeCombats.length === 0) return results;

  const combatCalc = buildCombatCalculations(activeCombats, currentTime, divisions);

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

  let runningDivisions = divisions;

  for (const calc of combatCalc) {
    if (!calc.needsSharedProcessing) {
      results.push({ combat: calc.combat, updatedDivisions: runningDivisions, retreatingDivisions: [] });
      continue;
    }

    const retreats = processAttackerRound(
      calc, survivingSharedDefenders, defeatedDefenderDivisions,
      calc.combat.id === firstSharedCombatId,
      regions, adjacency, currentTime
    );

    const survivingAttackerDivisions = calc.attackerDivisions.filter(d => d.hp > 0);
    const combatEnded = survivingAttackerDivisions.length === 0 || survivingSharedDefenders.length === 0;

    // Apply HP changes to DivisionState
    const allLocal = [...survivingAttackerDivisions, ...survivingSharedDefenders];
    for (const div of allLocal) {
      runningDivisions = { ...runningDivisions, [div.id]: { ...runningDivisions[div.id], hp: div.hp } };
    }

    results.push({
      combat: {
        ...calc.combat,
        attackerDivisionIds: survivingAttackerDivisions.map(d => d.id),
        defenderDivisionIds: survivingSharedDefenders.map(d => d.id),
        currentRound: calc.combat.currentRound + 1,
        isComplete: combatEnded,
        victor: combatEnded
          ? (survivingSharedDefenders.length === 0 ? calc.combat.attackerCountry : calc.combat.defenderCountry)
          : null,
        lastRoundTime: new Date(currentTime),
      },
      updatedDivisions: runningDivisions,
      retreatingDivisions: retreats,
    });
  }

  return results;
}

function buildCombatCalculations(activeCombats: ActiveCombat[], currentTime: Date, divisions: DivisionState): CombatCalculation[] {
  return activeCombats.map(combat => {
    const attackerDivisions = combat.attackerDivisionIds.map(id => ({ ...divisions[id] })).filter(d => d.id);
    const defenderDivisions = combat.defenderDivisionIds.map(id => ({ ...divisions[id] })).filter(d => d.id);

    if (attackerDivisions.length === 0 || defenderDivisions.length === 0) {
      return {
        combat: {
          ...combat, isComplete: true,
          victor: attackerDivisions.length > 0 ? combat.attackerCountry : combat.defenderCountry,
          attackerDivisionIds: attackerDivisions.map(d => d.id),
          defenderDivisionIds: defenderDivisions.map(d => d.id),
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
      retreats.push({ divisionId: result.division.id, toRegionId: retreatTarget, fromRegionId: combat.attackerRegionId });
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
      for (const result of attackerResults.filter((r: DamageResult) => r.type === 'retreating')) {
        survivingAttackers.push({ ...result.division, hp: 1 });
        const idx = retreats.findIndex(r => r.divisionId === result.division.id);
        if (idx >= 0) retreats.splice(idx, 1);
      }
    } else {
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
      retreats.push({ divisionId: defDiv.id, toRegionId: retreatTarget, fromRegionId: combat.defenderRegionId });
      if (retreatTarget) {
        console.log(`[RETREAT] ${defDiv.name} (${defDiv.owner}) retreating from ${combat.defenderRegionName} to ${regions[retreatTarget]?.name ?? retreatTarget}`);
      }
    }
  }

  return retreats;
}

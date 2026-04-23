import type { ActiveCombat, CountryId, Division, Movement } from '../../types/game';

export function getCommittedDivisionIds(
  movingUnits: Movement[] = [],
  activeCombats: ActiveCombat[] = [],
): Set<string> {
  const committedDivisionIds = new Set<string>();

  for (const movement of movingUnits) {
    for (const divisionId of movement.divisionIds) {
      committedDivisionIds.add(divisionId);
    }
  }

  for (const combat of activeCombats) {
    if (combat.isComplete) continue;

    for (const divisionId of combat.attackerDivisionIds) {
      committedDivisionIds.add(divisionId);
    }
    for (const divisionId of combat.defenderDivisionIds) {
      committedDivisionIds.add(divisionId);
    }
  }

  return committedDivisionIds;
}

export function findActiveCombatOnBorder(
  combats: ActiveCombat[],
  regionA: string,
  regionB: string,
): ActiveCombat | undefined {
  return combats.find(
    combat =>
      !combat.isComplete &&
      (
        (combat.attackerRegionId === regionA && combat.defenderRegionId === regionB) ||
        (combat.attackerRegionId === regionB && combat.defenderRegionId === regionA)
      ),
  );
}

export function addCombatReinforcements(
  combat: ActiveCombat,
  countryId: CountryId,
  divisions: Division[],
): ActiveCombat {
  if (divisions.length === 0) return combat;

  if (countryId === combat.attackerCountry) {
    const existingIds = new Set(combat.attackerDivisionIds);
    const newDivisions = divisions.filter(division => !existingIds.has(division.id));
    if (newDivisions.length === 0) return combat;

    return {
      ...combat,
      attackerDivisionIds: [...combat.attackerDivisionIds, ...newDivisions.map(division => division.id)],
      initialAttackerCount: combat.initialAttackerCount + newDivisions.length,
      initialAttackerHp: combat.initialAttackerHp + newDivisions.reduce((sum, division) => sum + division.hp, 0),
    };
  }

  if (countryId === combat.defenderCountry) {
    const existingIds = new Set(combat.defenderDivisionIds);
    const newDivisions = divisions.filter(division => !existingIds.has(division.id));
    if (newDivisions.length === 0) return combat;

    return {
      ...combat,
      defenderDivisionIds: [...combat.defenderDivisionIds, ...newDivisions.map(division => division.id)],
      initialDefenderCount: combat.initialDefenderCount + newDivisions.length,
      initialDefenderHp: combat.initialDefenderHp + newDivisions.reduce((sum, division) => sum + division.hp, 0),
    };
  }

  return combat;
}

import type { ActiveCombat, Division, DivisionState, Movement } from '../../types/game';

function putDivision(target: DivisionState, division: Division): void {
  target[division.id] = division;
}

/**
 * Returns all divisions located in the given region.
 * Divisions in movement or combat have regionId=null and are excluded.
 */
export function getDivisionsInRegion(divisions: DivisionState, regionId: string): Division[] {
  return Object.values(divisions).filter(d => d.regionId === regionId);
}

/** Returns all divisions belonging to a movement, looked up from DivisionState. */
export function getMovementDivisions(divisions: DivisionState, movement: Movement): Division[] {
  return movement.divisionIds.flatMap(id => {
    const d = divisions[id];
    return d ? [d] : [];
  });
}

/** Returns attacker divisions for a combat, looked up from DivisionState. */
export function getCombatAttackers(divisions: DivisionState, combat: ActiveCombat): Division[] {
  return combat.attackerDivisionIds.flatMap(id => {
    const d = divisions[id];
    return d ? [d] : [];
  });
}

/** Returns defender divisions for a combat, looked up from DivisionState. */
export function getCombatDefenders(divisions: DivisionState, combat: ActiveCombat): Division[] {
  return combat.defenderDivisionIds.flatMap(id => {
    const d = divisions[id];
    return d ? [d] : [];
  });
}

/**
 * Returns the normalized division map.
 * With DivisionState as the single source of truth this is now an identity
 * function — kept for backwards-compatibility at call sites that are not yet
 * fully migrated.
 */
export function buildDivisionState(
  _movingUnits: Movement[] = [],
  _activeCombats: ActiveCombat[] = [],
  base: DivisionState = {},
): DivisionState {
  return base;
}

export function addDivisionsToState(
  current: DivisionState,
  divisionsToAdd: Division[],
): DivisionState {
  const next = { ...current };
  for (const division of divisionsToAdd) {
    putDivision(next, division);
  }
  return next;
}

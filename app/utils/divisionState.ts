import type { ActiveCombat, Division, DivisionState, Movement } from '../types/game';

function putDivision(target: DivisionState, division: Division): void {
  target[division.id] = division;
}

/**
 * Returns all divisions located in the given region.
 * In-transit divisions keep their fromRegion as regionId, so they appear here too.
 */
export function getDivisionsInRegion(divisions: DivisionState, regionId: string): Division[] {
  return Object.values(divisions).filter(d => d.regionId === regionId);
}

/**
 * Builds the normalized division map from the canonical base plus in-flight overrides.
 * Movement and combat copies win over the base so active HP/stat changes are applied.
 */
export function buildDivisionState(
  movingUnits: Movement[] = [],
  activeCombats: ActiveCombat[] = [],
  base: DivisionState = {},
): DivisionState {
  const divisions: DivisionState = { ...base };

  for (const movement of movingUnits) {
    for (const division of movement.divisions) {
      putDivision(divisions, division);
    }
  }

  for (const combat of activeCombats) {
    for (const division of combat.attackerDivisions) {
      putDivision(divisions, { ...division, regionId: null });
    }
    for (const division of combat.defenderDivisions) {
      putDivision(divisions, { ...division, regionId: null });
    }
  }

  return divisions;
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


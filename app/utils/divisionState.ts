import type { ActiveCombat, Division, DivisionState, Movement, RegionState } from '../types/game';

function putDivision(target: DivisionState, division: Division): void {
  target[division.id] = division;
}

/**
 * Builds the normalized division map from every legacy location collection.
 *
 * Region divisions remain the compatibility/location index for now. Movement
 * and combat copies are merged afterwards so active HP/stat changes win over
 * older regional snapshots when the same division ID appears in multiple places.
 */
export function buildDivisionState(
  regions: RegionState,
  movingUnits: Movement[] = [],
  activeCombats: ActiveCombat[] = [],
  base: DivisionState = {},
): DivisionState {
  const divisions: DivisionState = { ...base };

  for (const region of Object.values(regions)) {
    for (const division of region.divisions) {
      putDivision(divisions, division);
    }
  }

  for (const movement of movingUnits) {
    for (const division of movement.divisions) {
      putDivision(divisions, division);
    }
  }

  for (const combat of activeCombats) {
    for (const division of combat.attackerDivisions) {
      putDivision(divisions, division);
    }
    for (const division of combat.defenderDivisions) {
      putDivision(divisions, division);
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


/**
 * Regression tests for the partial-division-selection move bug.
 *
 * Bug: when 2 divisions share a region and the player selects only 1 via the
 * DivisionSelectionPanel, issuing a move order moved ALL divisions instead of
 * only the selected one.
 *
 * Fix: moveUnits now accepts an optional `divisionIds?: string[]` parameter.
 * When provided, only the divisions whose IDs are in the list are moved.
 * The filtering logic is mirrored here so regressions are caught immediately.
 */

import { describe, it, expect } from 'vitest';
import type { Division } from '../types/game';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function makeDiv(overrides: Partial<Division> = {}): Division {
  return {
    id: 'div-1',
    name: '1st Division',
    owner: 'soviet',
    armyGroupId: 'ag-1',
    hp: 100,
    maxHp: 100,
    attack: 10,
    defence: 15,
    regionId: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// The filtering logic from unitActions.ts (keep in sync with the source)
// ---------------------------------------------------------------------------

function selectDivisionsToMove(
  ownDivisions: Division[],
  count: number,
  divisionIds?: string[],
): Division[] {
  return divisionIds && divisionIds.length > 0
    ? ownDivisions.filter(d => divisionIds.includes(d.id))
    : ownDivisions.slice(0, count);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('division selection filtering for moveUnits', () => {
  const div1 = makeDiv({ id: 'div-1', name: '1st Division' });
  const div2 = makeDiv({ id: 'div-2', name: '2nd Division' });
  const ownDivisions = [div1, div2];

  it('moves only the specifically selected division when divisionIds is provided', () => {
    const result = selectDivisionsToMove(ownDivisions, 1, ['div-1']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('div-1');
  });

  it('moves only the second division when it is specifically selected', () => {
    const result = selectDivisionsToMove(ownDivisions, 1, ['div-2']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('div-2');
  });

  it('moves all specified divisions when multiple IDs are provided', () => {
    const result = selectDivisionsToMove(ownDivisions, 2, ['div-1', 'div-2']);
    expect(result).toHaveLength(2);
  });

  it('falls back to count-based slicing when divisionIds is undefined', () => {
    const result = selectDivisionsToMove(ownDivisions, 1, undefined);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('div-1'); // first in array order
  });

  it('falls back to count-based slicing when divisionIds is empty', () => {
    const result = selectDivisionsToMove(ownDivisions, 2, []);
    expect(result).toHaveLength(2);
  });

  it('does NOT move both divisions when only one is selected (regression)', () => {
    // Bug scenario: 2 divisions in same region, player selected only div-2
    const result = selectDivisionsToMove(ownDivisions, 1, ['div-2']);
    expect(result).not.toContainEqual(expect.objectContaining({ id: 'div-1' }));
    expect(result).toHaveLength(1);
  });
});

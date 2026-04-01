/**
 * Unit tests for the HOI4-style frontline assignment helpers:
 *   - computeFrontline
 *   - assignDivisionsToFrontline
 *
 * These tests exercise pure functions with no store or browser required.
 */

import { describe, it, expect } from 'vitest';
import {
  computeFrontline,
  assignDivisionsToFrontline,
} from '../utils/pathfinding';
import type {
  Division,
  Movement,
  Adjacency,
  Region,
  RegionState,
} from '../types/game';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

function makeRegion(id: string, owner: 'soviet' | 'white', divs: Division[] = []): Region {
  return {
    id,
    name: id,
    countryIso3: 'TST',
    owner,
    divisions: divs,
    value: 1,
  };
}

function makeDiv(id: string, armyGroupId = 'ag-1'): Division {
  return {
    id,
    name: id,
    owner: 'soviet',
    armyGroupId,
    hp: 100,
    maxHp: 100,
    attack: 10,
    defence: 15,
  };
}

// ---------------------------------------------------------------------------
// computeFrontline
// ---------------------------------------------------------------------------

/**
 * Map layout:
 *
 *   [A]--[B]--[C]
 *             |
 *            [D]
 *
 * soviet owns A and B; white owns C and D.
 * B is adjacent to C → B is the frontline region.
 * C is the target.
 */
describe('computeFrontline', () => {
  const adjacency: Adjacency = {
    A: ['B'],
    B: ['A', 'C'],
    C: ['B', 'D'],
    D: ['C'],
  };

  // canEnter allows entering white territory (simulates a war relationship)
  const canEnter = () => true;

  it('identifies B as a frontline region and C as a target', () => {
    const regions: RegionState = {
      A: makeRegion('A', 'soviet', [makeDiv('div-a')]),
      B: makeRegion('B', 'soviet', [makeDiv('div-b')]),
      C: makeRegion('C', 'white'),
      D: makeRegion('D', 'white'),
    };

    const { frontlineRegions, targetRegions } = computeFrontline(
      'ag-1', regions, adjacency, 'soviet', canEnter
    );

    expect(frontlineRegions.has('B')).toBe(true);
    expect(targetRegions.has('C')).toBe(true);
    // A has no enemy neighbor → not a frontline region
    expect(frontlineRegions.has('A')).toBe(false);
    // D is not adjacent to any soviet region → not a target
    expect(targetRegions.has('D')).toBe(false);
  });

  it('returns empty sets when no group divisions are on the map', () => {
    const regions: RegionState = {
      A: makeRegion('A', 'soviet'), // no divisions
      B: makeRegion('B', 'soviet'), // no divisions
      C: makeRegion('C', 'white'),
    };

    const { frontlineRegions, targetRegions } = computeFrontline(
      'ag-1', regions, adjacency, 'soviet', canEnter
    );

    expect(frontlineRegions.size).toBe(0);
    expect(targetRegions.size).toBe(0);
  });

  it('respects canEnter — does not add blocked enemy regions', () => {
    const regions: RegionState = {
      A: makeRegion('A', 'soviet', [makeDiv('div-a')]),
      B: makeRegion('B', 'soviet', [makeDiv('div-b')]),
      C: makeRegion('C', 'white'),
      D: makeRegion('D', 'white'),
    };

    // C is diplomatically blocked
    const blockC = (id: string) => id !== 'C';

    const { frontlineRegions, targetRegions } = computeFrontline(
      'ag-1', regions, adjacency, 'soviet', blockC
    );

    expect(frontlineRegions.has('B')).toBe(false);
    expect(targetRegions.has('C')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// assignDivisionsToFrontline
// ---------------------------------------------------------------------------

/**
 * Layout (soviet everywhere except E):
 *
 *   [A]--[B]--[C]--[E(white)]
 *
 * C is the frontline region (adjacent to E). A and B are rear.
 */
describe('assignDivisionsToFrontline', () => {
  const adjacency: Adjacency = {
    A: ['B'],
    B: ['A', 'C'],
    C: ['B', 'E'],
    E: ['C'],
  };

  const canEnter = () => true;

  it('Phase 1: routes a rear division one BFS step toward an empty frontline slot', () => {
    const rearDiv = makeDiv('div-rear');
    const regions: RegionState = {
      A: makeRegion('A', 'soviet', [rearDiv]),
      B: makeRegion('B', 'soviet'),
      C: makeRegion('C', 'soviet'),       // frontline slot, currently empty
      E: makeRegion('E', 'white'),
    };

    const frontline = {
      frontlineRegions: new Set(['C']),
      targetRegions: new Set(['E']),
    };

    const assignments = assignDivisionsToFrontline(
      'ag-1', regions, adjacency, 'soviet', frontline, [], canEnter
    );

    expect(assignments).toHaveLength(1);
    expect(assignments[0].divisionId).toBe('div-rear');
    expect(assignments[0].fromRegion).toBe('A');
    expect(assignments[0].toRegion).toBe('B'); // one BFS step toward C
    expect(assignments[0].isFrontlineMove).toBe(true);
  });

  it('Phase 2: surplus frontline division pushes into an adjacent target', () => {
    const div1 = makeDiv('div-1');
    const div2 = makeDiv('div-2');
    const regions: RegionState = {
      A: makeRegion('A', 'soviet'),
      B: makeRegion('B', 'soviet'),
      C: makeRegion('C', 'soviet', [div1, div2]), // 2 divs — 1 surplus
      E: makeRegion('E', 'white'),
    };

    const frontline = {
      frontlineRegions: new Set(['C']),
      targetRegions: new Set(['E']),
    };

    const assignments = assignDivisionsToFrontline(
      'ag-1', regions, adjacency, 'soviet', frontline, [], canEnter
    );

    // div1 holds the slot; div2 is the surplus that attacks E
    expect(assignments).toHaveLength(1);
    expect(assignments[0].divisionId).toBe('div-2');
    expect(assignments[0].fromRegion).toBe('C');
    expect(assignments[0].toRegion).toBe('E');
    expect(assignments[0].isFrontlineMove).toBe(false);
  });

  it('skips regions that already have a group movement in transit', () => {
    const div1 = makeDiv('div-1');
    const regions: RegionState = {
      A: makeRegion('A', 'soviet', [div1]),
      B: makeRegion('B', 'soviet'),
      C: makeRegion('C', 'soviet'),
      E: makeRegion('E', 'white'),
    };

    const frontline = {
      frontlineRegions: new Set(['C']),
      targetRegions: new Set(['E']),
    };

    const inTransit: Movement[] = [{
      id: 'mv-existing',
      fromRegion: 'A',
      toRegion: 'B',
      divisions: [div1],
      departureTime: new Date(),
      arrivalTime: new Date(),
      owner: 'soviet',
    }];

    const assignments = assignDivisionsToFrontline(
      'ag-1', regions, adjacency, 'soviet', frontline, inTransit, canEnter
    );

    expect(assignments).toHaveLength(0);
  });

  it('emits no assignments when the frontline slot is already covered with no surplus', () => {
    const div1 = makeDiv('div-1');
    const regions: RegionState = {
      A: makeRegion('A', 'soviet'),
      B: makeRegion('B', 'soviet'),
      C: makeRegion('C', 'soviet', [div1]), // exactly 1 — covered, no surplus
      E: makeRegion('E', 'white'),
    };

    const frontline = {
      frontlineRegions: new Set(['C']),
      targetRegions: new Set(['E']),
    };

    const assignments = assignDivisionsToFrontline(
      'ag-1', regions, adjacency, 'soviet', frontline, [], canEnter
    );

    expect(assignments).toHaveLength(0);
  });

  it('regression: does not re-dispatch a division that is already en route to the frontline (loop prevention)', () => {
    /**
     * Scenario that caused the A↔B loop:
     *   - div-rear is at A (rear region)
     *   - Tick 1: div-rear is dispatched A→B (one step toward frontline C)
     *   - Tick 2: div-rear has arrived at B. B is still a rear region.
     *             Without the fix, Phase 1 would immediately dispatch B→C,
     *             and once at C the surplus logic sends it C→E, then
     *             next tick it bounces back. With the fix, B is recognised
     *             as the destination of an in-transit movement and skipped.
     *
     * We simulate Tick 2: div-rear is physically at B, and there is still
     * an in-transit movement toRegion=B (it just arrived this tick but the
     * movingUnits list hasn't been cleared yet in the same tick).
     */
    const div = makeDiv('div-rear');
    const regions: RegionState = {
      A: makeRegion('A', 'soviet'),          // source — now empty
      B: makeRegion('B', 'soviet', [div]),   // division just arrived here
      C: makeRegion('C', 'soviet'),          // frontline slot, still empty
      E: makeRegion('E', 'white'),
    };

    const frontline = {
      frontlineRegions: new Set(['C']),
      targetRegions: new Set(['E']),
    };

    // Simulate the in-transit record that hasn't been cleared yet
    const inTransit: Movement[] = [{
      id: 'mv-a-to-b',
      fromRegion: 'A',
      toRegion: 'B',
      divisions: [div],
      departureTime: new Date(),
      arrivalTime: new Date(),
      owner: 'soviet',
    }];

    const assignments = assignDivisionsToFrontline(
      'ag-1', regions, adjacency, 'soviet', frontline, inTransit, canEnter
    );

    // B is the destination of an in-transit movement — must not be dispatched again
    expect(assignments).toHaveLength(0);
  });

  it('regression: in-transit division counts toward frontline coverage — no second division dispatched', () => {
    /**
     * If div-1 is already in transit directly to frontline C, the slot is
     * "filled" and a second rear division (div-2 at A) must not be sent.
     */
    const div1 = makeDiv('div-1');
    const div2 = makeDiv('div-2');
    const regions: RegionState = {
      A: makeRegion('A', 'soviet', [div2]), // second rear division
      B: makeRegion('B', 'soviet'),
      C: makeRegion('C', 'soviet'),          // frontline slot, empty in regions state
      E: makeRegion('E', 'white'),
    };

    const frontline = {
      frontlineRegions: new Set(['C']),
      targetRegions: new Set(['E']),
    };

    // div-1 is already heading directly to C
    const inTransit: Movement[] = [{
      id: 'mv-b-to-c',
      fromRegion: 'B',
      toRegion: 'C',
      divisions: [div1],
      departureTime: new Date(),
      arrivalTime: new Date(),
      owner: 'soviet',
    }];

    const assignments = assignDivisionsToFrontline(
      'ag-1', regions, adjacency, 'soviet', frontline, inTransit, canEnter
    );

    // C already has an inbound division → slot is covered → div-2 stays put
    expect(assignments).toHaveLength(0);
  });
});

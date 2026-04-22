/**
 * Unit tests for the movement system — adjacency helpers, travel time, and
 * processMovements tick logic.
 *
 * These tests cover pure logic functions so they run in milliseconds
 * without a browser or dev server.
 *
 * Tests for applyCompletedMovements and applyFinishedCombats live in
 * movementApplication.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { canMoveTo, getAdjacentRegions } from '../utils/mapUtils';
import { calculateTravelTime, MOVEMENT_SPEED_KM_PER_HOUR } from '../utils/distance';
import { processMovements } from '../store/game/tickHelpers/movementProcessing';
import { findPath, getNextStepToward, buildCanEnterPredicate } from '../utils/pathfinding';
import type {
  Division,
  Movement,
  ActiveCombat,
  Adjacency,
  Region,
  RegionState,
  Relationship,
  DivisionState,
} from '../types/game';

// ---------------------------------------------------------------------------
// Shared test fixtures
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

function makeMovement(overrides: Partial<Movement> = {}): Movement {
  const now = new Date('1918-01-01T00:00:00Z');
  const arrivalTime = new Date(now);
  arrivalTime.setHours(arrivalTime.getHours() + 12);
  const div = makeDiv();
  return {
    id: 'mv-1',
    fromRegion: 'A',
    toRegion: 'B',
    divisionIds: [div.id],
    departureTime: now,
    arrivalTime,
    owner: 'soviet',
    ...overrides,
  };
}

function makeCombat(overrides: Partial<ActiveCombat> = {}): ActiveCombat {
  const now = new Date('1918-01-01T00:00:00Z');
  return {
    id: 'combat-1',
    attackerRegionId: 'A',
    attackerRegionName: 'A',
    defenderRegionId: 'B',
    defenderRegionName: 'B',
    attackerCountry: 'soviet',
    defenderCountry: 'white',
    attackerDivisionIds: [makeDiv({ id: 'div-atk' }).id],
    defenderDivisionIds: [makeDiv({ id: 'div-def', owner: 'white' }).id],
    initialAttackerCount: 1,
    initialDefenderCount: 1,
    initialAttackerHp: 100,
    initialDefenderHp: 100,
    currentRound: 0,
    startTime: now,
    lastRoundTime: now,
    roundIntervalHours: 1,
    isComplete: false,
    victor: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. canMoveTo / getAdjacentRegions (pure adjacency helpers)
// ---------------------------------------------------------------------------

describe('canMoveTo', () => {
  const adjacency: Adjacency = {
    A: ['B', 'C'],
    B: ['A'],
    C: ['A'],
  };

  it('returns true for adjacent regions', () => {
    expect(canMoveTo(adjacency, 'A', 'B')).toBe(true);
  });

  it('returns false for non-adjacent regions', () => {
    expect(canMoveTo(adjacency, 'B', 'C')).toBe(false);
  });

  it('returns false for unknown source region', () => {
    expect(canMoveTo(adjacency, 'Z', 'A')).toBe(false);
  });

  it('adjacency is not assumed symmetric unless defined in both directions', () => {
    // B→A is defined, A→B is defined; B→C is NOT defined even though C→A is
    expect(canMoveTo(adjacency, 'B', 'C')).toBe(false);
  });
});

describe('getAdjacentRegions', () => {
  const adjacency: Adjacency = {
    A: ['B', 'C'],
    B: ['A'],
  };

  it('returns the correct neighbor list', () => {
    expect(getAdjacentRegions(adjacency, 'A')).toEqual(['B', 'C']);
  });

  it('returns an empty array for unknown region', () => {
    expect(getAdjacentRegions(adjacency, 'Z')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. calculateTravelTime
// ---------------------------------------------------------------------------

describe('calculateTravelTime', () => {
  it('calculates correct hours at normal speed', () => {
    // 400 km / 4 km·h⁻¹ = 100 h
    expect(calculateTravelTime(400)).toBe(100);
  });

  it('is twice as fast on retreat', () => {
    const normal = calculateTravelTime(400, false);
    const retreat = calculateTravelTime(400, true);
    expect(retreat).toBe(normal / 2);
  });

  it('returns 0 for 0 km distance', () => {
    expect(calculateTravelTime(0)).toBe(0);
  });

  it('uses MOVEMENT_SPEED_KM_PER_HOUR constant', () => {
    expect(calculateTravelTime(MOVEMENT_SPEED_KM_PER_HOUR)).toBe(1); // exactly 1 hour
  });
});

// ---------------------------------------------------------------------------
// 3. processMovements
// ---------------------------------------------------------------------------

describe('processMovements', () => {
  it('puts a movement into completedMovements when arrivalTime has passed', () => {
    const now = new Date('1918-01-01T12:00:00Z');
    const mv = makeMovement({
      arrivalTime: new Date('1918-01-01T10:00:00Z'), // in the past
    });

    const { completedMovements, remainingMovements } = processMovements([mv], now);

    expect(completedMovements).toHaveLength(1);
    expect(remainingMovements).toHaveLength(0);
  });

  it('keeps a movement in remainingMovements when arrivalTime is in the future', () => {
    const now = new Date('1918-01-01T06:00:00Z');
    const mv = makeMovement({
      arrivalTime: new Date('1918-01-01T18:00:00Z'), // in the future
    });

    const { completedMovements, remainingMovements } = processMovements([mv], now);

    expect(completedMovements).toHaveLength(0);
    expect(remainingMovements).toHaveLength(1);
  });

  it('regenerates HP for divisions in transit (+10 per tick, capped at maxHp)', () => {
    const now = new Date('1918-01-01T18:00:00Z');
    const div = makeDiv({ hp: 80, maxHp: 100, regionId: null });
    const divisions: DivisionState = { [div.id]: div };
    const mv = makeMovement({
      arrivalTime: new Date('1918-01-01T20:00:00Z'),
      divisionIds: [div.id],
    });

    const { remainingMovements, updatedDivisions } = processMovements([mv], now, [], {}, [], divisions);

    expect(remainingMovements).toHaveLength(1);
    expect(updatedDivisions[div.id].hp).toBe(90);
  });

  it('caps HP at maxHp when regen would overflow', () => {
    const now = new Date('1918-01-01T18:00:00Z');
    const div = makeDiv({ hp: 95, maxHp: 100, regionId: null });
    const divisions: DivisionState = { [div.id]: div };
    const mv = makeMovement({
      arrivalTime: new Date('1918-01-01T20:00:00Z'),
      divisionIds: [div.id],
    });

    const { remainingMovements, updatedDivisions } = processMovements([mv], now, [], {}, [], divisions);

    expect(remainingMovements).toHaveLength(1);
    expect(updatedDivisions[div.id].hp).toBe(100);
  });

  it('pauses movement and extends arrivalTime by 1h when linked combat is still active', () => {
    const now = new Date('1918-01-01T12:00:00Z');
    const originalArrival = new Date('1918-01-01T10:00:00Z'); // already in the past!
    const combat = makeCombat({ id: 'combat-active', isComplete: false });

    const mv = makeMovement({
      arrivalTime: originalArrival,
      pendingCombatId: 'combat-active',
    });

    const { completedMovements, remainingMovements } = processMovements(
      [mv],
      now,
      [combat]
    );

    // Should NOT complete despite arrival time being in the past
    expect(completedMovements).toHaveLength(0);
    expect(remainingMovements).toHaveLength(1);

    // arrivalTime should have been pushed 1h into the future
    const newArrival = remainingMovements[0].arrivalTime;
    const expectedMs = originalArrival.getTime() + 60 * 60 * 1000;
    expect(newArrival.getTime()).toBe(expectedMs);
  });

  it('allows movement to complete when linked combat is finished', () => {
    const now = new Date('1918-01-01T12:00:00Z');
    const combat = makeCombat({
      id: 'combat-done',
      isComplete: true,
      victor: 'soviet',
    });

    const mv = makeMovement({
      arrivalTime: new Date('1918-01-01T10:00:00Z'), // in the past
      pendingCombatId: 'combat-done',
    });

    const { completedMovements } = processMovements([mv], now, [combat]);

    expect(completedMovements).toHaveLength(1);
  });

  it('handles multiple movements independently', () => {
    const now = new Date('1918-01-01T12:00:00Z');
    const done = makeMovement({
      id: 'mv-done',
      arrivalTime: new Date('1918-01-01T10:00:00Z'),
    });
    const pending = makeMovement({
      id: 'mv-pending',
      arrivalTime: new Date('1918-01-01T18:00:00Z'),
    });

    const { completedMovements, remainingMovements } = processMovements(
      [done, pending],
      now
    );

    expect(completedMovements).toHaveLength(1);
    expect(completedMovements[0].id).toBe('mv-done');
    expect(remainingMovements).toHaveLength(1);
    expect(remainingMovements[0].id).toBe('mv-pending');
  });
});

// ---------------------------------------------------------------------------
// 4. findPath / getNextStepToward (multi-step pathfinding)
// ---------------------------------------------------------------------------

describe('findPath', () => {
  //  A - B - C
  const adjacency: Adjacency = {
    A: ['B'],
    B: ['A', 'C'],
    C: ['B'],
  };

  it('returns empty array when source equals destination', () => {
    expect(findPath('A', 'A', adjacency)).toEqual([]);
  });

  it('returns direct hop for adjacent regions', () => {
    expect(findPath('A', 'B', adjacency)).toEqual(['B']);
  });

  it('returns two-hop path when connected via intermediate', () => {
    // A is not directly adjacent to C; must go via B
    expect(findPath('A', 'C', adjacency)).toEqual(['B', 'C']);
  });

  it('returns null when destination is unreachable', () => {
    const isolated: Adjacency = { A: ['B'], B: ['A'], D: [] };
    expect(findPath('A', 'D', isolated)).toBeNull();
  });

  it('respects canEnter predicate to block specific regions', () => {
    //  A - B - C   (B is blocked)
    const canEnter = (id: string) => id !== 'B';
    // Cannot route through B, so C is unreachable
    expect(findPath('A', 'C', adjacency, canEnter)).toBeNull();
  });

  it('finds longer path around a blocked region', () => {
    //  A - B - C
    //  |       |
    //  D ------+  (D is an alternative route from A to C avoiding B)
    const adj2: Adjacency = {
      A: ['B', 'D'],
      B: ['A', 'C'],
      C: ['B', 'D'],
      D: ['A', 'C'],
    };
    const canEnter = (id: string) => id !== 'B';
    // Should route A → D → C
    expect(findPath('A', 'C', adj2, canEnter)).toEqual(['D', 'C']);
  });
});

describe('getNextStepToward', () => {
  const adjacency: Adjacency = {
    A: ['B'],
    B: ['A', 'C'],
    C: ['B'],
  };

  it('returns the first hop toward a distant destination', () => {
    // A → C should return B as first step
    expect(getNextStepToward('A', 'C', adjacency)).toBe('B');
  });

  it('returns destination directly if adjacent', () => {
    expect(getNextStepToward('A', 'B', adjacency)).toBe('B');
  });

  it('returns null when destination is unreachable', () => {
    const isolated: Adjacency = { A: ['B'], B: ['A'], D: [] };
    expect(getNextStepToward('A', 'D', isolated)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. redirectMovement – logic helpers
//
// redirectMovement is a store action, but its core logic is: given a movement
// currently on hop (fromRegion → toRegion) with an optional remainingPath, use
// findPath to compute a new remaining path from toRegion (the next stop that
// the in-flight divisions will reach) to the new destination.  We test that
// contract through findPath + buildCanEnterPredicate directly, which is exactly
// what the implementation does.
// ---------------------------------------------------------------------------

function makeRegion(id: string, owner: 'soviet' | 'white' | 'neutral' = 'soviet'): Region {
  return { id, name: id, countryIso3: 'RUS', owner };
}

describe('redirectMovement – path computation logic', () => {
  // Map:  A - B - C - D
  const adjacency: Adjacency = {
    A: ['B'],
    B: ['A', 'C'],
    C: ['B', 'D'],
    D: ['C'],
  };

  const allSoviet: RegionState = {
    A: makeRegion('A'),
    B: makeRegion('B'),
    C: makeRegion('C'),
    D: makeRegion('D'),
  };

  const noRelationships: Relationship[] = [];

  it('computes a new remainingPath from currentHop to a new destination', () => {
    // Divisions are en route: A → B (currentHop = B)
    // Player wants to redirect to D instead of the original destination.
    // Expected new path from B to D:  ['C', 'D']
    const canEnter = buildCanEnterPredicate('soviet', allSoviet, noRelationships);
    const newPath = findPath('B', 'D', adjacency, canEnter);
    expect(newPath).toEqual(['C', 'D']);
  });

  it('returns empty array (no remaining hops) when new destination is the currentHop itself', () => {
    // Divisions are en route to B; player right-clicks B — no additional hops needed
    const canEnter = buildCanEnterPredicate('soviet', allSoviet, noRelationships);
    const newPath = findPath('B', 'B', adjacency, canEnter);
    expect(newPath).toEqual([]);
  });

  it('returns null when new destination is unreachable from currentHop', () => {
    // Region X is completely isolated
    const isolated: RegionState = {
      ...allSoviet,
      X: makeRegion('X'),
    };
    const adjWithX: Adjacency = { ...adjacency, X: [] };
    const canEnter = buildCanEnterPredicate('soviet', isolated, noRelationships);
    const newPath = findPath('B', 'X', adjWithX, canEnter);
    expect(newPath).toBeNull();
  });

  it('respects canEnter predicate: redirecting through enemy territory requires war', () => {
    // C is enemy territory and there is no war, so path B → D must go through C but is blocked
    const mixedRegions: RegionState = {
      ...allSoviet,
      C: makeRegion('C', 'white'), // enemy
    };
    const canEnter = buildCanEnterPredicate('soviet', mixedRegions, noRelationships);
    // B → D is only possible via C; C is blocked (no war declared)
    const newPath = findPath('B', 'D', adjacency, canEnter);
    expect(newPath).toBeNull();
  });

  it('allows redirect through enemy territory when at war', () => {
    const mixedRegions: RegionState = {
      ...allSoviet,
      C: makeRegion('C', 'white'), // enemy
      D: makeRegion('D', 'white'), // enemy
    };
    const atWar: Relationship[] = [
      { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
    ];
    const canEnter = buildCanEnterPredicate('soviet', mixedRegions, atWar);
    const newPath = findPath('B', 'D', adjacency, canEnter);
    expect(newPath).toEqual(['C', 'D']);
  });

  it('a redirected movement carries the correct finalDestination and remainingPath', () => {
    // Simulate what redirectMovement does to the Movement object
    const canEnter = buildCanEnterPredicate('soviet', allSoviet, noRelationships);
    const movement: Movement = {
      id: 'mv-test',
      fromRegion: 'A',
      toRegion: 'B',          // current in-flight hop
      divisionIds: [],
      departureTime: new Date('1918-01-01T00:00:00Z'),
      arrivalTime: new Date('1918-01-01T12:00:00Z'),
      owner: 'soviet',
      remainingPath: ['C'],   // old remaining path (was heading to C)
      finalDestination: 'C',
    };

    const newDest = 'D';
    const newRemainingPath = findPath(movement.toRegion, newDest, adjacency, canEnter);

    expect(newRemainingPath).not.toBeNull();
    const redirected: Movement = {
      ...movement,
      remainingPath: newRemainingPath!,
      finalDestination: newDest,
    };

    // The current hop is unchanged
    expect(redirected.toRegion).toBe('B');
    // New path from B leads through C to D
    expect(redirected.remainingPath).toEqual(['C', 'D']);
    expect(redirected.finalDestination).toBe('D');
  });
});



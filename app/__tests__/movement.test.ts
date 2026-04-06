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
import { findPath, getNextStepToward } from '../utils/pathfinding';
import type {
  Division,
  Movement,
  ActiveCombat,
  Adjacency,
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
    ...overrides,
  };
}

function makeMovement(overrides: Partial<Movement> = {}): Movement {
  const now = new Date('1918-01-01T00:00:00Z');
  const arrivalTime = new Date(now);
  arrivalTime.setHours(arrivalTime.getHours() + 12);
  return {
    id: 'mv-1',
    fromRegion: 'A',
    toRegion: 'B',
    divisions: [makeDiv()],
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
    regionId: 'B',
    regionName: 'B',
    attackerCountry: 'soviet',
    defenderCountry: 'white',
    attackerDivisions: [makeDiv({ id: 'div-atk' })],
    defenderDivisions: [makeDiv({ id: 'div-def', owner: 'white' })],
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
    const mv = makeMovement({
      arrivalTime: new Date('1918-01-01T20:00:00Z'),
      divisions: [makeDiv({ hp: 80, maxHp: 100 })],
    });

    const { remainingMovements } = processMovements([mv], now);

    expect(remainingMovements[0].divisions[0].hp).toBe(90);
  });

  it('caps HP at maxHp when regen would overflow', () => {
    const now = new Date('1918-01-01T18:00:00Z');
    const mv = makeMovement({
      arrivalTime: new Date('1918-01-01T20:00:00Z'),
      divisions: [makeDiv({ hp: 95, maxHp: 100 })],
    });

    const { remainingMovements } = processMovements([mv], now);

    expect(remainingMovements[0].divisions[0].hp).toBe(100);
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


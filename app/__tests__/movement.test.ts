/**
 * Unit tests for the movement system.
 *
 * These tests cover pure logic functions so they run in milliseconds
 * without a browser or dev server.
 */

import { describe, it, expect, vi } from 'vitest';
import { canMoveTo, getAdjacentRegions } from '../utils/mapUtils';
import { calculateTravelTime, MOVEMENT_SPEED_KM_PER_HOUR } from '../utils/distance';
import { processMovements } from '../store/game/tickHelpers/movementProcessing';
import {
  applyCompletedMovements,
  applyFinishedCombats,
} from '../store/game/tickHelpers/movementApplication';
import type {
  Division,
  Movement,
  Region,
  RegionState,
  Adjacency,
  ActiveCombat,
  Relationship,
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
    attack: 20,
    defence: 10,
    ...overrides,
  };
}

function makeRegion(id: string, overrides: Partial<Region> = {}): Region {
  return {
    id,
    name: id,
    countryIso3: 'RUS',
    owner: 'soviet',
    divisions: [],
    value: 1,
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
// 4. applyCompletedMovements
// ---------------------------------------------------------------------------

describe('applyCompletedMovements', () => {
  const now = new Date('1918-01-01T12:00:00Z');
  const noRelationships: Relationship[] = [];

  it('adds divisions to friendly region without changing ownership', () => {
    const regions: RegionState = {
      A: makeRegion('A', { owner: 'soviet' }),
      B: makeRegion('B', { owner: 'soviet', divisions: [makeDiv({ id: 'existing' })] }),
    };

    const mv = makeMovement({
      toRegion: 'B',
      owner: 'soviet',
      divisions: [makeDiv({ id: 'arriving' })],
    });

    const { nextRegions } = applyCompletedMovements(
      [mv],
      [mv],
      { regions, combats: [], events: [], notifications: [], relationships: noRelationships },
      now
    );

    expect(nextRegions['B'].owner).toBe('soviet');
    expect(nextRegions['B'].divisions).toHaveLength(2);
  });

  it('captures an undefended enemy region', () => {
    const regions: RegionState = {
      A: makeRegion('A', { owner: 'soviet' }),
      B: makeRegion('B', { owner: 'white', divisions: [] }), // no defenders
    };

    const mv = makeMovement({
      toRegion: 'B',
      owner: 'soviet',
      divisions: [makeDiv({ id: 'attacker' })],
    });

    const { nextRegions } = applyCompletedMovements(
      [mv],
      [mv],
      { regions, combats: [], events: [], notifications: [], relationships: noRelationships },
      now
    );

    expect(nextRegions['B'].owner).toBe('soviet');
    expect(nextRegions['B'].divisions).toHaveLength(1);
  });

  it('emits a region_captured event when capturing an undefended region', () => {
    const regions: RegionState = {
      B: makeRegion('B', { owner: 'white', divisions: [] }),
    };

    const mv = makeMovement({
      toRegion: 'B',
      owner: 'soviet',
      divisions: [makeDiv()],
    });

    const { nextEvents } = applyCompletedMovements(
      [mv],
      [mv],
      { regions, combats: [], events: [], notifications: [], relationships: noRelationships },
      now
    );

    const captureEvent = nextEvents.find(e => e.type === 'region_captured');
    expect(captureEvent).toBeDefined();
    expect(captureEvent?.country).toBe('soviet');
  });

  it('starts a new combat when moving into a defended enemy region', () => {
    const regions: RegionState = {
      B: makeRegion('B', {
        owner: 'white',
        divisions: [makeDiv({ id: 'defender', owner: 'white' })],
      }),
    };

    const mv = makeMovement({
      toRegion: 'B',
      owner: 'soviet',
      divisions: [makeDiv({ id: 'attacker' })],
    });

    const { nextCombats, nextRegions } = applyCompletedMovements(
      [mv],
      [mv],
      { regions, combats: [], events: [], notifications: [], relationships: noRelationships },
      now
    );

    expect(nextCombats).toHaveLength(1);
    expect(nextCombats[0].attackerCountry).toBe('soviet');
    expect(nextCombats[0].defenderCountry).toBe('white');
    expect(nextCombats[0].isComplete).toBe(false);
    // Defenders are removed from region when combat starts
    expect(nextRegions['B'].divisions).toHaveLength(0);
  });

  it('allows movement into region with military_access relationship', () => {
    const regions: RegionState = {
      B: makeRegion('B', { owner: 'white', divisions: [] }),
    };

    const militaryAccess: Relationship[] = [
      { fromCountry: 'white', toCountry: 'soviet', type: 'military_access' },
    ];

    const mv = makeMovement({
      toRegion: 'B',
      owner: 'soviet',
      divisions: [makeDiv({ id: 'transit' })],
    });

    const { nextRegions, nextCombats } = applyCompletedMovements(
      [mv],
      [mv],
      {
        regions,
        combats: [],
        events: [],
        notifications: [],
        relationships: militaryAccess,
      },
      now
    );

    // Should enter without combat and without capturing
    expect(nextCombats).toHaveLength(0);
    expect(nextRegions['B'].owner).toBe('white'); // not captured
    expect(nextRegions['B'].divisions).toHaveLength(1); // just added
  });

  it('reinforces the attacker side in an ongoing combat', () => {
    const regions: RegionState = {
      B: makeRegion('B', { owner: 'white', divisions: [] }),
    };

    const ongoingCombat = makeCombat({
      regionId: 'B',
      attackerCountry: 'soviet',
      defenderCountry: 'white',
      attackerDivisions: [makeDiv({ id: 'original-attacker' })],
      defenderDivisions: [makeDiv({ id: 'defender', owner: 'white' })],
      initialAttackerCount: 1,
    });

    const mv = makeMovement({
      id: 'mv-reinforce',
      toRegion: 'B',
      owner: 'soviet',
      divisions: [makeDiv({ id: 'reinforcement' })],
    });

    const { nextCombats } = applyCompletedMovements(
      [mv],
      [mv],
      {
        regions,
        combats: [ongoingCombat],
        events: [],
        notifications: [],
        relationships: noRelationships,
      },
      now
    );

    // Should not create a new combat, just update the existing one
    expect(nextCombats).toHaveLength(1);
    expect(nextCombats[0].attackerDivisions).toHaveLength(2);
    expect(nextCombats[0].initialAttackerCount).toBe(2);
  });

  it('skips movement that has a pendingCombatId pointing to a known combat', () => {
    const regions: RegionState = {
      B: makeRegion('B', { owner: 'white', divisions: [] }),
    };

    const linkedCombat = makeCombat({ id: 'combat-linked', regionId: 'B', isComplete: true });

    const mv = makeMovement({
      toRegion: 'B',
      owner: 'soviet',
      pendingCombatId: 'combat-linked',
    });

    const { nextCombats } = applyCompletedMovements(
      [mv],
      [mv],
      {
        regions,
        combats: [],
        finishedCombats: [linkedCombat],
        events: [],
        notifications: [],
        relationships: noRelationships,
      },
      now
    );

    // pendingCombatId movements are handled by applyFinishedCombats, not here
    expect(nextCombats).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. applyFinishedCombats
// ---------------------------------------------------------------------------

describe('applyFinishedCombats', () => {
  it('transfers region ownership to attacker on attacker victory', () => {
    const regions: RegionState = {
      B: makeRegion('B', { owner: 'white', divisions: [] }),
    };

    const combat = makeCombat({
      regionId: 'B',
      attackerCountry: 'soviet',
      defenderCountry: 'white',
      attackerDivisions: [makeDiv({ id: 'winner' })],
      defenderDivisions: [],
      isComplete: true,
      victor: 'soviet',
    });

    const nextRegions = applyFinishedCombats([combat], regions);

    expect(nextRegions['B'].owner).toBe('soviet');
    expect(nextRegions['B'].divisions).toHaveLength(1);
    expect(nextRegions['B'].divisions[0].id).toBe('winner');
  });

  it('keeps region under defender ownership when defender wins', () => {
    const regions: RegionState = {
      B: makeRegion('B', { owner: 'white', divisions: [] }),
    };

    const combat = makeCombat({
      regionId: 'B',
      attackerCountry: 'soviet',
      defenderCountry: 'white',
      attackerDivisions: [],
      defenderDivisions: [makeDiv({ id: 'surviving-defender', owner: 'white' })],
      isComplete: true,
      victor: 'white',
    });

    const nextRegions = applyFinishedCombats([combat], regions);

    expect(nextRegions['B'].owner).toBe('white');
    expect(nextRegions['B'].divisions[0].id).toBe('surviving-defender');
  });

  it('does not mutate original regions object', () => {
    const regions: RegionState = {
      B: makeRegion('B', { owner: 'white' }),
    };

    const combat = makeCombat({
      regionId: 'B',
      attackerCountry: 'soviet',
      defenderCountry: 'white',
      isComplete: true,
      victor: 'soviet',
    });

    applyFinishedCombats([combat], regions);

    // Original should be unchanged
    expect(regions['B'].owner).toBe('white');
  });

  it('handles an empty combats list without error', () => {
    const regions: RegionState = {
      B: makeRegion('B', { owner: 'white' }),
    };

    const nextRegions = applyFinishedCombats([], regions);

    expect(nextRegions['B'].owner).toBe('white');
  });
});

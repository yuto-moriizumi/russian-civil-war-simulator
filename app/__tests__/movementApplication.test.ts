/**
 * Unit tests for applyCompletedMovements and applyFinishedCombats.
 * Pure logic — no browser or dev server needed.
 */

import { describe, it, expect } from 'vitest';
import {
  applyCompletedMovements,
  applyFinishedCombats,
} from '../store/game/tickHelpers/movementApplication';
import type { Division, Movement, Region, RegionState, ActiveCombat, Relationship } from '../types/game';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const D0 = new Date('1918-01-01T00:00:00Z');
const NOW = new Date('1918-01-01T12:00:00Z');
const NO_REL: Relationship[] = [];

function makeDiv(overrides: Partial<Division> = {}): Division {
  return { id: 'div-1', name: '1st', owner: 'soviet', armyGroupId: 'ag-1',
    hp: 100, maxHp: 100, attack: 10, defence: 15, ...overrides };
}

function makeRegion(id: string, overrides: Partial<Region> = {}): Region {
  return { id, name: id, countryIso3: 'RUS', owner: 'soviet', divisions: [], value: 1, ...overrides };
}

function makeMovement(overrides: Partial<Movement> = {}): Movement {
  const arr = new Date(D0);
  arr.setHours(arr.getHours() + 12);
  return { id: 'mv-1', fromRegion: 'A', toRegion: 'B', divisions: [makeDiv()],
    departureTime: D0, arrivalTime: arr, owner: 'soviet', ...overrides };
}

function makeCombat(overrides: Partial<ActiveCombat> = {}): ActiveCombat {
  return { id: 'combat-1', regionId: 'B', regionName: 'B',
    attackerCountry: 'soviet', defenderCountry: 'white',
    attackerDivisions: [makeDiv({ id: 'div-atk' })],
    defenderDivisions: [makeDiv({ id: 'div-def', owner: 'white' })],
    initialAttackerCount: 1, initialDefenderCount: 1,
    initialAttackerHp: 100, initialDefenderHp: 100,
    currentRound: 0, startTime: D0, lastRoundTime: D0,
    roundIntervalHours: 1, isComplete: false, victor: null, ...overrides };
}

function ctx(regions: RegionState, combats: ActiveCombat[] = [], rel = NO_REL, finished: ActiveCombat[] = []) {
  return { regions, combats, events: [], notifications: [], relationships: rel, finishedCombats: finished };
}

// ---------------------------------------------------------------------------
// 1. applyCompletedMovements
// ---------------------------------------------------------------------------

describe('applyCompletedMovements', () => {
  it('adds divisions to friendly region without changing ownership', () => {
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { divisions: [makeDiv({ id: 'existing' })] }),
    };
    const mv = makeMovement({ toRegion: 'B', divisions: [makeDiv({ id: 'arriving' })] });
    const { nextRegions } = applyCompletedMovements([mv], [mv], ctx(regions), NOW);
    expect(nextRegions['B'].owner).toBe('soviet');
    expect(nextRegions['B'].divisions).toHaveLength(2);
  });

  it('captures an undefended enemy region', () => {
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { owner: 'white', divisions: [] }),
    };
    const mv = makeMovement({ toRegion: 'B', divisions: [makeDiv({ id: 'attacker' })] });
    const { nextRegions } = applyCompletedMovements([mv], [mv], ctx(regions), NOW);
    expect(nextRegions['B'].owner).toBe('soviet');
    expect(nextRegions['B'].divisions).toHaveLength(1);
  });

  it('emits a region_captured event when capturing an undefended region', () => {
    const regions: RegionState = { B: makeRegion('B', { owner: 'white', divisions: [] }) };
    const mv = makeMovement({ toRegion: 'B' });
    const { nextEvents } = applyCompletedMovements([mv], [mv], ctx(regions), NOW);
    const ev = nextEvents.find(e => e.type === 'region_captured');
    expect(ev).toBeDefined();
    expect(ev?.country).toBe('soviet');
  });

  it('starts a new combat when moving into a defended enemy region', () => {
    const regions: RegionState = {
      B: makeRegion('B', { owner: 'white', divisions: [makeDiv({ id: 'defender', owner: 'white' })] }),
    };
    const mv = makeMovement({ toRegion: 'B', divisions: [makeDiv({ id: 'attacker' })] });
    const { nextCombats, nextRegions } = applyCompletedMovements([mv], [mv], ctx(regions), NOW);
    expect(nextCombats).toHaveLength(1);
    expect(nextCombats[0].attackerCountry).toBe('soviet');
    expect(nextCombats[0].defenderCountry).toBe('white');
    expect(nextCombats[0].isComplete).toBe(false);
    expect(nextRegions['B'].divisions).toHaveLength(0);
  });

  it('allows movement into region with military_access relationship', () => {
    const regions: RegionState = { B: makeRegion('B', { owner: 'white', divisions: [] }) };
    const rel: Relationship[] = [{ fromCountry: 'white', toCountry: 'soviet', type: 'military_access' }];
    const mv = makeMovement({ toRegion: 'B', divisions: [makeDiv({ id: 'transit' })] });
    const { nextRegions, nextCombats } = applyCompletedMovements([mv], [mv], ctx(regions, [], rel), NOW);
    expect(nextCombats).toHaveLength(0);
    expect(nextRegions['B'].owner).toBe('white');
    expect(nextRegions['B'].divisions).toHaveLength(1);
  });

  it('reinforces the attacker side in an ongoing combat', () => {
    const regions: RegionState = { B: makeRegion('B', { owner: 'white', divisions: [] }) };
    const ongoing = makeCombat({
      regionId: 'B', attackerCountry: 'soviet', defenderCountry: 'white',
      attackerDivisions: [makeDiv({ id: 'original-attacker' })],
      defenderDivisions: [makeDiv({ id: 'defender', owner: 'white' })],
      initialAttackerCount: 1,
    });
    const mv = makeMovement({ id: 'mv-reinforce', toRegion: 'B', divisions: [makeDiv({ id: 'reinforcement' })] });
    const { nextCombats } = applyCompletedMovements([mv], [mv], ctx(regions, [ongoing]), NOW);
    expect(nextCombats).toHaveLength(1);
    expect(nextCombats[0].attackerDivisions).toHaveLength(2);
    expect(nextCombats[0].initialAttackerCount).toBe(2);
  });

  it('skips movement that has a pendingCombatId pointing to a known combat', () => {
    const regions: RegionState = { B: makeRegion('B', { owner: 'white', divisions: [] }) };
    const linked = makeCombat({ id: 'combat-linked', regionId: 'B', isComplete: true });
    const mv = makeMovement({ toRegion: 'B', pendingCombatId: 'combat-linked' });
    const { nextCombats } = applyCompletedMovements([mv], [mv], ctx(regions, [], NO_REL, [linked]), NOW);
    expect(nextCombats).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Multi-step movement (remainingPath)
// ---------------------------------------------------------------------------

describe('multi-step movement (remainingPath)', () => {
  it('dispatches next hop instead of landing in an intermediate friendly region', () => {
    // A → B (intermediate, friendly) → C (final, friendly)
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B'), // friendly intermediate
      C: makeRegion('C'), // friendly final
    };
    const div = makeDiv({ id: 'div-traveller' });
    // Movement arrives at B with C still remaining
    const mv = makeMovement({
      fromRegion: 'A',
      toRegion: 'B',
      divisions: [div],
      remainingPath: ['C'],
      finalDestination: 'C',
    });

    const { nextRegions, newHopMovements } = applyCompletedMovements(
      [mv], [mv], ctx(regions), NOW
    );

    // B should NOT have the divisions landed (still in transit)
    expect(nextRegions['B'].divisions).toHaveLength(0);
    // A new movement for B → C should have been dispatched
    expect(newHopMovements).toHaveLength(1);
    expect(newHopMovements[0].fromRegion).toBe('B');
    expect(newHopMovements[0].toRegion).toBe('C');
    expect(newHopMovements[0].divisions).toHaveLength(1);
    // Next hop has no more remaining path (it's the last hop)
    expect(newHopMovements[0].remainingPath).toBeUndefined();
  });

  it('lands divisions at the final destination (no remainingPath)', () => {
    const regions: RegionState = {
      B: makeRegion('B'),
      C: makeRegion('C'),
    };
    const div = makeDiv({ id: 'div-final' });
    // This is the last hop — no remainingPath
    const mv = makeMovement({
      fromRegion: 'B',
      toRegion: 'C',
      divisions: [div],
      // no remainingPath
    });

    const { nextRegions, newHopMovements } = applyCompletedMovements(
      [mv], [mv], ctx(regions), NOW
    );

    // Divisions should land in C
    expect(nextRegions['C'].divisions).toHaveLength(1);
    expect(newHopMovements).toHaveLength(0);
  });

  it('dispatches a 3-hop chain, carrying remainingPath forward', () => {
    // A → B → C → D  (all friendly)
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B'),
      C: makeRegion('C'),
      D: makeRegion('D'),
    };
    const div = makeDiv({ id: 'div-multi' });
    const mv = makeMovement({
      fromRegion: 'A',
      toRegion: 'B',
      divisions: [div],
      remainingPath: ['C', 'D'],
      finalDestination: 'D',
    });

    const { nextRegions, newHopMovements } = applyCompletedMovements(
      [mv], [mv], ctx(regions), NOW
    );

    // B should remain empty
    expect(nextRegions['B'].divisions).toHaveLength(0);
    // One new hop dispatched: B → C
    expect(newHopMovements).toHaveLength(1);
    const hop = newHopMovements[0];
    expect(hop.fromRegion).toBe('B');
    expect(hop.toRegion).toBe('C');
    // Remaining path still contains D
    expect(hop.remainingPath).toEqual(['D']);
    expect(hop.finalDestination).toBe('D');
  });

  it('halts multi-step movement when an intermediate region is defended by the enemy', () => {
    // A → B (enemy defended) → C  — should start combat at B, NOT continue to C
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { owner: 'white', divisions: [makeDiv({ id: 'defender', owner: 'white' })] }),
      C: makeRegion('C'),
    };
    const div = makeDiv({ id: 'div-attacker' });
    const mv = makeMovement({
      fromRegion: 'A',
      toRegion: 'B',
      divisions: [div],
      remainingPath: ['C'],
      finalDestination: 'C',
    });

    const { nextCombats, newHopMovements } = applyCompletedMovements(
      [mv], [mv], ctx(regions), NOW
    );

    // Combat should have started at B
    expect(nextCombats).toHaveLength(1);
    expect(nextCombats[0].regionId).toBe('B');
    // Multi-step should be halted — no next hop dispatched
    expect(newHopMovements).toHaveLength(0);
  });

  it('continues multi-step after capturing an undefended enemy region on the path', () => {
    // A → B (undefended enemy) → C (friendly)
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { owner: 'white', divisions: [] }), // undefended enemy
      C: makeRegion('C'),
    };
    const div = makeDiv({ id: 'div-attacker' });
    const mv = makeMovement({
      fromRegion: 'A',
      toRegion: 'B',
      divisions: [div],
      remainingPath: ['C'],
      finalDestination: 'C',
    });

    const { nextRegions, newHopMovements, nextEvents } = applyCompletedMovements(
      [mv], [mv], ctx(regions), NOW
    );

    // B should have been captured
    expect(nextRegions['B'].owner).toBe('soviet');
    // A capture event should exist
    expect(nextEvents.find(e => e.type === 'region_captured')).toBeDefined();
    // And the next hop B → C should have been dispatched
    expect(newHopMovements).toHaveLength(1);
    expect(newHopMovements[0].fromRegion).toBe('B');
    expect(newHopMovements[0].toRegion).toBe('C');
  });

  it('passes through a military-access region and continues to next hop', () => {
    // A → B (military access, foreign) → C (friendly)
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { owner: 'white', divisions: [] }),
      C: makeRegion('C'),
    };
    const rel: Relationship[] = [{ fromCountry: 'white', toCountry: 'soviet', type: 'military_access' }];
    const div = makeDiv({ id: 'div-transit' });
    const mv = makeMovement({
      fromRegion: 'A',
      toRegion: 'B',
      divisions: [div],
      remainingPath: ['C'],
      finalDestination: 'C',
    });

    const { nextRegions, newHopMovements } = applyCompletedMovements(
      [mv], [mv], ctx(regions, [], rel), NOW
    );

    // B should still be under white ownership (no capture)
    expect(nextRegions['B'].owner).toBe('white');
    // B should NOT have the divisions (they're in transit to C)
    expect(nextRegions['B'].divisions).toHaveLength(0);
    // Next hop dispatched: B → C
    expect(newHopMovements).toHaveLength(1);
    expect(newHopMovements[0].fromRegion).toBe('B');
    expect(newHopMovements[0].toRegion).toBe('C');
  });
});

// ---------------------------------------------------------------------------
// 2. applyFinishedCombats
// ---------------------------------------------------------------------------

describe('applyFinishedCombats', () => {
  it('transfers region ownership to attacker on attacker victory', () => {
    const regions: RegionState = { B: makeRegion('B', { owner: 'white', divisions: [] }) };
    const combat = makeCombat({
      regionId: 'B', attackerDivisions: [makeDiv({ id: 'winner' })],
      defenderDivisions: [], isComplete: true, victor: 'soviet',
    });
    const nextRegions = applyFinishedCombats([combat], regions);
    expect(nextRegions['B'].owner).toBe('soviet');
    expect(nextRegions['B'].divisions).toHaveLength(1);
    expect(nextRegions['B'].divisions[0].id).toBe('winner');
  });

  it('keeps region under defender ownership when defender wins', () => {
    const regions: RegionState = { B: makeRegion('B', { owner: 'white', divisions: [] }) };
    const combat = makeCombat({
      regionId: 'B', attackerDivisions: [],
      defenderDivisions: [makeDiv({ id: 'surviving-defender', owner: 'white' })],
      isComplete: true, victor: 'white',
    });
    const nextRegions = applyFinishedCombats([combat], regions);
    expect(nextRegions['B'].owner).toBe('white');
    expect(nextRegions['B'].divisions[0].id).toBe('surviving-defender');
  });

  it('does not mutate original regions object', () => {
    const regions: RegionState = { B: makeRegion('B', { owner: 'white' }) };
    const combat = makeCombat({ regionId: 'B', isComplete: true, victor: 'soviet' });
    applyFinishedCombats([combat], regions);
    expect(regions['B'].owner).toBe('white');
  });

  it('handles an empty combats list without error', () => {
    const regions: RegionState = { B: makeRegion('B', { owner: 'white' }) };
    expect(applyFinishedCombats([], regions)['B'].owner).toBe('white');
  });

  it('defender wins when both sides are eliminated simultaneously (attacker loses draw)', () => {
    // Both sides reach 0 divisions in the same round — attacker is the loser.
    // Region ownership must stay with the defender; no attacker divisions remain.
    const regions: RegionState = { B: makeRegion('B', { owner: 'white', divisions: [] }) };
    const combat = makeCombat({
      regionId: 'B',
      attackerDivisions: [],
      defenderDivisions: [],
      isComplete: true,
      victor: 'white', // defender wins the draw
    });
    const nextRegions = applyFinishedCombats([combat], regions);
    expect(nextRegions['B'].owner).toBe('white');
    expect(nextRegions['B'].divisions).toHaveLength(0);
  });
});

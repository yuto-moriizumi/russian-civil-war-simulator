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

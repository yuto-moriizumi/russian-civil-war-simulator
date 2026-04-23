/* eslint-disable max-lines */
/**
 * Unit tests for applyCompletedMovements and applyFinishedCombats.
 * Pure logic — no browser or dev server needed.
 */

import { describe, it, expect } from 'vitest';
import {
  applyCompletedMovements,
  applyFinishedCombats,
} from '../domain/game/logic/movementApplication';
import type { Division, DivisionState, Movement, Region, RegionState, ActiveCombat, Relationship } from '../types/game';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const D0 = new Date('1918-01-01T00:00:00Z');
const NOW = new Date('1918-01-01T12:00:00Z');
const NO_REL: Relationship[] = [];

function makeDiv(overrides: Partial<Division> = {}): Division {
  return { id: 'div-1', name: '1st', owner: 'soviet', armyGroupId: 'ag-1',
    hp: 100, maxHp: 100, attack: 10, defence: 15, regionId: null, ...overrides };
}

function makeRegion(id: string, overrides: Partial<Region> = {}): Region {
  return { id, name: id, countryIso3: 'RUS', owner: 'soviet', ...overrides };
}

function makeMovement(overrides: Partial<Movement> = {}): Movement {
  const arr = new Date(D0);
  arr.setHours(arr.getHours() + 12);
  const div = makeDiv();
  return { id: 'mv-1', fromRegion: 'A', toRegion: 'B', divisionIds: [div.id],
    departureTime: D0, arrivalTime: arr, owner: 'soviet', ...overrides };
}

function makeCombat(overrides: Partial<ActiveCombat> = {}): ActiveCombat {
  const atkDiv = makeDiv({ id: 'div-atk' });
  const defDiv = makeDiv({ id: 'div-def', owner: 'white' });
  return { id: 'combat-1', attackerRegionId: 'A', attackerRegionName: 'A', defenderRegionId: 'B', defenderRegionName: 'B',
    attackerCountry: 'soviet', defenderCountry: 'white',
    attackerDivisionIds: [atkDiv.id],
    defenderDivisionIds: [defDiv.id],
    initialAttackerCount: 1, initialDefenderCount: 1,
    initialAttackerHp: 100, initialDefenderHp: 100,
    currentRound: 0, startTime: D0, lastRoundTime: D0,
    roundIntervalHours: 1, isComplete: false, victor: null, ...overrides };
}

function ctx(regions: RegionState, divisions: DivisionState, combats: ActiveCombat[] = [], rel = NO_REL, finished: ActiveCombat[] = []) {
  return { regions, divisions, combats, events: [], notifications: [], relationships: rel, finishedCombats: finished };
}

// ---------------------------------------------------------------------------
// 1. applyCompletedMovements
// ---------------------------------------------------------------------------

describe('applyCompletedMovements', () => {
  it('adds divisions to friendly region without changing ownership', () => {
    const arriving = makeDiv({ id: 'arriving', regionId: 'A' });
    const existing = makeDiv({ id: 'existing', regionId: 'B' });
    const divisions: DivisionState = { 'arriving': arriving, 'existing': existing };
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B'),
    };
    const mv = makeMovement({ toRegion: 'B', divisionIds: [arriving.id] });
    const { nextRegions, nextDivisions } = applyCompletedMovements([mv], [mv], ctx(regions, divisions), NOW);
    expect(nextRegions['B'].owner).toBe('soviet');
    expect(Object.values(nextDivisions).filter(d => d.regionId === 'B')).toHaveLength(2);
  });

  it('captures an undefended enemy region', () => {
    const attacker = makeDiv({ id: 'attacker', regionId: 'A' });
    const divisions: DivisionState = { 'attacker': attacker };
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { owner: 'white' }),
    };
    const mv = makeMovement({ toRegion: 'B', divisionIds: [attacker.id] });
    const { nextRegions, nextDivisions } = applyCompletedMovements([mv], [mv], ctx(regions, divisions), NOW);
    expect(nextRegions['B'].owner).toBe('soviet');
    expect(Object.values(nextDivisions).filter(d => d.regionId === 'B')).toHaveLength(1);
  });

  it('emits a region_captured event when capturing an undefended region', () => {
    const div = makeDiv({ id: 'div-1', regionId: 'A' });
    const divisions: DivisionState = { 'div-1': div };
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { owner: 'white' }),
    };
    const mv = makeMovement({ toRegion: 'B', divisionIds: [div.id] });
    const { nextEvents } = applyCompletedMovements([mv], [mv], ctx(regions, divisions), NOW);
    const ev = nextEvents.find(e => e.type === 'region_captured');
    expect(ev).toBeDefined();
    expect(ev?.country).toBe('soviet');
  });

  it('starts a new combat when moving into a defended enemy region', () => {
    const attacker = makeDiv({ id: 'attacker', regionId: 'A' });
    const defender = makeDiv({ id: 'defender', owner: 'white', regionId: 'B' });
    const divisions: DivisionState = { 'attacker': attacker, 'defender': defender };
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { owner: 'white' }),
    };
    const mv = makeMovement({ toRegion: 'B', divisionIds: [attacker.id] });
    const { nextCombats, nextRegions } = applyCompletedMovements([mv], [mv], ctx(regions, divisions), NOW);
    expect(nextCombats).toHaveLength(1);
    expect(nextCombats[0].attackerCountry).toBe('soviet');
    expect(nextCombats[0].defenderCountry).toBe('white');
    expect(nextCombats[0].isComplete).toBe(false);
    expect(Object.values(nextRegions).filter(() => false)).toHaveLength(0);
  });

  it('allows movement into region with military_access relationship', () => {
    const transit = makeDiv({ id: 'transit', regionId: 'A' });
    const divisions: DivisionState = { 'transit': transit };
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { owner: 'white' }),
    };
    const rel: Relationship[] = [{ fromCountry: 'white', toCountry: 'soviet', type: 'military_access' }];
    const mv = makeMovement({ toRegion: 'B', divisionIds: [transit.id] });
    const { nextRegions, nextCombats, nextDivisions } = applyCompletedMovements([mv], [mv], ctx(regions, divisions, [], rel), NOW);
    expect(nextCombats).toHaveLength(0);
    expect(nextRegions['B'].owner).toBe('white');
    expect(Object.values(nextDivisions).filter(d => d.regionId === 'B')).toHaveLength(1);
  });

  it('reinforces the attacker side in an ongoing combat', () => {
    const reinforcement = makeDiv({ id: 'reinforcement', regionId: 'A' });
    const divisions: DivisionState = { 'reinforcement': reinforcement };
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { owner: 'white' }),
    };
    const originalAtk = makeDiv({ id: 'original-attacker' });
    const ongoing = makeCombat({
      defenderRegionId: 'B', attackerCountry: 'soviet', defenderCountry: 'white',
      attackerDivisionIds: [originalAtk.id],
      defenderDivisionIds: [makeDiv({ id: 'defender', owner: 'white' }).id],
      initialAttackerCount: 1,
    });
    const mv = makeMovement({ id: 'mv-reinforce', toRegion: 'B', divisionIds: [reinforcement.id] });
    const { nextCombats } = applyCompletedMovements([mv], [mv], ctx(regions, divisions, [ongoing]), NOW);
    expect(nextCombats).toHaveLength(1);
    expect(nextCombats[0].attackerDivisionIds).toHaveLength(2);
    expect(nextCombats[0].initialAttackerCount).toBe(2);
  });

  it('skips movement that has a pendingCombatId pointing to a known combat', () => {
    const div = makeDiv({ id: 'div-1', regionId: 'A' });
    const divisions: DivisionState = { 'div-1': div };
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { owner: 'white' }),
    };
    const linked = makeCombat({ id: 'combat-linked', defenderRegionId: 'B', isComplete: true });
    const mv = makeMovement({ toRegion: 'B', pendingCombatId: 'combat-linked', divisionIds: [div.id] });
    const { nextCombats } = applyCompletedMovements([mv], [mv], ctx(regions, divisions, [], NO_REL, [linked]), NOW);
    expect(nextCombats).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Multi-step movement (remainingPath)
// ---------------------------------------------------------------------------

describe('multi-step movement (remainingPath)', () => {
  it('dispatches next hop instead of landing in an intermediate friendly region', () => {
    const div = makeDiv({ id: 'div-traveller', regionId: 'A' });
    const divisions: DivisionState = { 'div-traveller': div };
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B'),
      C: makeRegion('C'),
    };
    const mv = makeMovement({
      fromRegion: 'A',
      toRegion: 'B',
      divisionIds: [div.id],
      remainingPath: ['C'],
      finalDestination: 'C',
    });

    const { newHopMovements, nextDivisions } = applyCompletedMovements(
      [mv], [mv], ctx(regions, divisions), NOW
    );

    expect(Object.values(nextDivisions).filter(d => d.regionId === 'B')).toHaveLength(1);
    expect(newHopMovements).toHaveLength(1);
    expect(newHopMovements[0].fromRegion).toBe('B');
    expect(newHopMovements[0].toRegion).toBe('C');
    expect(newHopMovements[0].divisionIds).toHaveLength(1);
    expect(newHopMovements[0].remainingPath).toBeUndefined();
  });

  it('lands divisions at the final destination (no remainingPath)', () => {
    const div = makeDiv({ id: 'div-final', regionId: 'B' });
    const divisions: DivisionState = { 'div-final': div };
    const regions: RegionState = {
      B: makeRegion('B'),
      C: makeRegion('C'),
    };
    const mv = makeMovement({
      fromRegion: 'B',
      toRegion: 'C',
      divisionIds: [div.id],
    });

    const { newHopMovements, nextDivisions } = applyCompletedMovements(
      [mv], [mv], ctx(regions, divisions), NOW
    );

    expect(Object.values(nextDivisions).filter(d => d.regionId === 'C')).toHaveLength(1);
    expect(newHopMovements).toHaveLength(0);
  });

  it('dispatches a 3-hop chain, carrying remainingPath forward', () => {
    const div = makeDiv({ id: 'div-multi', regionId: 'A' });
    const divisions: DivisionState = { 'div-multi': div };
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B'),
      C: makeRegion('C'),
      D: makeRegion('D'),
    };
    const mv = makeMovement({
      fromRegion: 'A',
      toRegion: 'B',
      divisionIds: [div.id],
      remainingPath: ['C', 'D'],
      finalDestination: 'D',
    });

    const { newHopMovements, nextDivisions } = applyCompletedMovements(
      [mv], [mv], ctx(regions, divisions), NOW
    );

    expect(Object.values(nextDivisions).filter(d => d.regionId === 'B')).toHaveLength(1);
    expect(newHopMovements).toHaveLength(1);
    const hop = newHopMovements[0];
    expect(hop.fromRegion).toBe('B');
    expect(hop.toRegion).toBe('C');
    expect(hop.remainingPath).toEqual(['D']);
    expect(hop.finalDestination).toBe('D');
  });

  it('halts multi-step movement when an intermediate region is defended by the enemy', () => {
    const div = makeDiv({ id: 'div-attacker', regionId: 'A' });
    const defender = makeDiv({ id: 'defender', owner: 'white', regionId: 'B' });
    const divisions: DivisionState = { 'div-attacker': div, 'defender': defender };
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { owner: 'white' }),
      C: makeRegion('C'),
    };
    const mv = makeMovement({
      fromRegion: 'A',
      toRegion: 'B',
      divisionIds: [div.id],
      remainingPath: ['C'],
      finalDestination: 'C',
    });

    const { nextCombats, newHopMovements } = applyCompletedMovements(
      [mv], [mv], ctx(regions, divisions), NOW
    );

    expect(nextCombats).toHaveLength(1);
    expect(nextCombats[0].defenderRegionId).toBe('B');
    expect(newHopMovements).toHaveLength(0);
  });

  it('continues multi-step after capturing an undefended enemy region on the path', () => {
    const div = makeDiv({ id: 'div-attacker', regionId: 'A' });
    const divisions: DivisionState = { 'div-attacker': div };
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { owner: 'white' }),
      C: makeRegion('C'),
    };
    const mv = makeMovement({
      fromRegion: 'A',
      toRegion: 'B',
      divisionIds: [div.id],
      remainingPath: ['C'],
      finalDestination: 'C',
    });

    const { nextRegions, newHopMovements, nextEvents } = applyCompletedMovements(
      [mv], [mv], ctx(regions, divisions), NOW
    );

    expect(nextRegions['B'].owner).toBe('soviet');
    expect(nextEvents.find(e => e.type === 'region_captured')).toBeDefined();
    expect(newHopMovements).toHaveLength(1);
    expect(newHopMovements[0].fromRegion).toBe('B');
    expect(newHopMovements[0].toRegion).toBe('C');
  });

  it('passes through a military-access region and continues to next hop', () => {
    const div = makeDiv({ id: 'div-transit', regionId: 'A' });
    const divisions: DivisionState = { 'div-transit': div };
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { owner: 'white' }),
      C: makeRegion('C'),
    };
    const rel: Relationship[] = [{ fromCountry: 'white', toCountry: 'soviet', type: 'military_access' }];
    const mv = makeMovement({
      fromRegion: 'A',
      toRegion: 'B',
      divisionIds: [div.id],
      remainingPath: ['C'],
      finalDestination: 'C',
    });

    const { nextRegions, newHopMovements, nextDivisions } = applyCompletedMovements(
      [mv], [mv], ctx(regions, divisions, [], rel), NOW
    );

    expect(nextRegions['B'].owner).toBe('white');
    expect(Object.values(nextDivisions).filter(d => d.regionId === 'B')).toHaveLength(1);
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
    const winner = makeDiv({ id: 'winner' });
    const divisions: DivisionState = { 'winner': winner };
    const regions: RegionState = { B: makeRegion('B', { owner: 'white' }) };
    const combat = makeCombat({
      defenderRegionId: 'B', attackerDivisionIds: ['winner'],
      defenderDivisionIds: [], isComplete: true, victor: 'soviet',
    });
    const { nextRegions, nextDivisions } = applyFinishedCombats([combat], regions, divisions);
    expect(nextRegions['B'].owner).toBe('soviet');
    expect(Object.values(nextDivisions).filter(d => d.regionId === 'B')).toHaveLength(1);
    expect(nextDivisions['winner'].id).toBe('winner');
  });

  it('keeps region under defender ownership when defender wins', () => {
    const survivingDefender = makeDiv({ id: 'surviving-defender', owner: 'white' });
    const divisions: DivisionState = { 'surviving-defender': survivingDefender };
    const regions: RegionState = { A: makeRegion('A'), B: makeRegion('B', { owner: 'white' }) };
    const combat = makeCombat({
      defenderRegionId: 'B', attackerDivisionIds: [],
      defenderDivisionIds: ['surviving-defender'],
      isComplete: true, victor: 'white',
    });
    const { nextRegions, nextDivisions } = applyFinishedCombats([combat], regions, divisions);
    expect(nextRegions['B'].owner).toBe('white');
    expect(nextDivisions['surviving-defender'].id).toBe('surviving-defender');
  });

  it('does not duplicate victorious attacker divisions already present in the captured region', () => {
    const postCombatWinner = makeDiv({ id: 'winner', hp: 42 });
    const divisions: DivisionState = { 'winner': postCombatWinner };
    const regions: RegionState = {
      A: makeRegion('A'),
      B: makeRegion('B', { owner: 'white' }),
    };
    const combat = makeCombat({
      attackerRegionId: 'A',
      defenderRegionId: 'B',
      attackerDivisionIds: ['winner'],
      defenderDivisionIds: [],
      isComplete: true,
      victor: 'soviet',
    });

    const { nextRegions, nextDivisions } = applyFinishedCombats([combat], regions, divisions);

    expect(Object.values(nextDivisions).filter(d => d.regionId === 'A')).toHaveLength(0);
    expect(nextRegions['B'].owner).toBe('soviet');
    expect(Object.values(nextDivisions).filter(d => d.regionId === 'B')).toHaveLength(1);
    expect(nextDivisions['winner'].id).toBe('winner');
    expect(nextDivisions['winner'].hp).toBe(42);
  });

  it('does not mutate original regions object', () => {
    const regions: RegionState = { A: makeRegion('A'), B: makeRegion('B', { owner: 'white' }) };
    const combat = makeCombat({ defenderRegionId: 'B', isComplete: true, victor: 'soviet' });
    applyFinishedCombats([combat], regions, {});
    expect(regions['B'].owner).toBe('white');
  });

  it('handles an empty combats list without error', () => {
    const regions: RegionState = { B: makeRegion('B', { owner: 'white' }) };
    expect(applyFinishedCombats([], regions, {})['nextRegions']['B'].owner).toBe('white');
  });

  it('defender wins when both sides are eliminated simultaneously (attacker loses draw)', () => {
    const divisions: DivisionState = {};
    const regions: RegionState = { B: makeRegion('B', { owner: 'white' }) };
    const combat = makeCombat({
      defenderRegionId: 'B',
      attackerDivisionIds: [],
      defenderDivisionIds: [],
      isComplete: true,
      victor: 'white',
    });
    const { nextRegions, nextDivisions } = applyFinishedCombats([combat], regions, divisions);
    expect(nextRegions['B'].owner).toBe('white');
    expect(Object.values(nextDivisions).filter(d => d.regionId === 'B')).toHaveLength(0);
  });
});

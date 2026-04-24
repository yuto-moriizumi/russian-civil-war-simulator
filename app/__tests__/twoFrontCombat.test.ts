/**
 * Tests for combat triggered when an enemy enters a region whose defender
 * is already committed to an outbound attack (has pendingCombatId),
 * and for second attacks on a defender region whose divisions were already
 * cleared by a prior combat (multi-front attack bug fix).
 */

import { describe, it, expect } from 'vitest';
import { applyCompletedMovements } from '../domain/game/logic/movementApplication';
import { createUnitActions } from '../store/game/unitActions';
import type { Division, DivisionState, Movement, Region, RegionState, ActiveCombat, Relationship, CountryId } from '../types/game';
import type { GameStore } from '../store/game/types';

const D0 = new Date('1918-01-01T00:00:00Z');
const NOW = new Date('1918-01-01T12:00:00Z');

function makeDiv(overrides: Partial<Division> = {}): Division {
  return { id: 'div-1', name: '1st', owner: 'soviet', armyGroupId: 'ag-1',
    hp: 100, maxHp: 100, attack: 10, defence: 15, regionId: 'test-region', ...overrides };
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

const WAR_REL: Relationship[] = [
  { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
  { fromCountry: 'white', toCountry: 'soviet', type: 'war' },
];

// ---------------------------------------------------------------------------
// Helper: build a minimal GameStore stub for moveUnits tests
// ---------------------------------------------------------------------------
function makeStoreStub(overrides: Partial<GameStore>): { get: () => GameStore; set: (p: Partial<GameStore>) => void; captured: Partial<GameStore> } {
  const captured: Partial<GameStore> = {};
  const base: Partial<GameStore> = {
    adjacency: {},
    regions: {},
    divisions: {},
    selectedCountry: { id: 'soviet' as CountryId } as GameStore['selectedCountry'],
    dateTime: D0,
    movingUnits: [],
    relationships: WAR_REL,
    activeCombats: [],
    gameEvents: [],
    notifications: [],
    regionCentroids: { A: [0, 0], B: [1, 0], C: [2, 0] },
    armyGroups: [],
    ...overrides,
  };
  const get = () => ({ ...base, ...captured } as GameStore);
  const set = (partial: Partial<GameStore>) => { Object.assign(captured, partial); };
  return { get, set, captured };
}

describe('two-front combat: second attack on defender whose divisions are already cleared', () => {
  it('creates a new combat when attacking a region that is already defending (divisions cleared)', () => {
    const sovA = makeDiv({ id: 'sov-a', owner: 'soviet', regionId: 'A' });
    const sovietDivB = makeDiv({ id: 'sov-b', owner: 'soviet', regionId: 'B' });
    const whiteDefC = makeDiv({ id: 'wht-c', owner: 'white', regionId: 'test-region' });
    const divisions: DivisionState = { 'sov-a': sovA, 'sov-b': sovietDivB, 'wht-c': whiteDefC };
    const regions: RegionState = {
      A: makeRegion('A', { owner: 'soviet' }),
      B: makeRegion('B', { owner: 'soviet' }),
      C: makeRegion('C', { owner: 'white' }),
    };
    const existingCombat = makeCombat({
      id: 'combat-a-c',
      attackerRegionId: 'A', defenderRegionId: 'C',
      attackerCountry: 'soviet', defenderCountry: 'white',
      attackerDivisionIds: ['sov-a'],
      defenderDivisionIds: ['wht-c'],
    });
    const adjacency = { A: ['B', 'C'], B: ['A', 'C'], C: ['A', 'B'] };

    const { get, set, captured } = makeStoreStub({ regions, divisions, adjacency, activeCombats: [existingCombat] });
    const actions = createUnitActions(set as Parameters<typeof createUnitActions>[0], get as Parameters<typeof createUnitActions>[1]);
    actions.moveUnits('B', 'C', 1);

    const combats = (captured.activeCombats ?? []) as ActiveCombat[];
    const newCombat = combats.find(c => c.id !== 'combat-a-c');
    expect(newCombat).toBeDefined();
    expect(newCombat!.attackerRegionId).toBe('B');
    expect(newCombat!.defenderRegionId).toBe('C');
    expect(newCombat!.defenderDivisionIds).toHaveLength(1);
    expect(newCombat!.defenderDivisionIds[0]).toBe('wht-c');
  });
});

describe('two-front combat: enemy enters a region whose defender is attacking elsewhere', () => {
  it('initiates combat rather than undefended capture when defender has pendingCombatId', () => {
    const sovietDiv = makeDiv({ id: 'soviet-div', owner: 'soviet', regionId: 'A' });
    const whiteDiv = makeDiv({ id: 'white-div-c', owner: 'white', regionId: 'C' });
    const divisions: DivisionState = { 'soviet-div': sovietDiv, 'white-div-c': whiteDiv };
    const regions: RegionState = {
      A: makeRegion('A', { owner: 'soviet' }),
      B: makeRegion('B', { owner: 'white' }),
      C: makeRegion('C', { owner: 'white' }),
    };

    const attackCombat = makeCombat({
      id: 'combat-a-b',
      attackerRegionId: 'A',
      defenderRegionId: 'B',
      attackerCountry: 'soviet',
      defenderCountry: 'white',
      attackerDivisionIds: ['soviet-div'],
      defenderDivisionIds: [],
    });
    const sovietAttackMovement = makeMovement({
      id: 'mv-soviet-attack',
      fromRegion: 'A', toRegion: 'B',
      owner: 'soviet',
      divisionIds: ['soviet-div'],
      pendingCombatId: 'combat-a-b',
    });
    const whiteMovement = makeMovement({
      id: 'mv-white-invade',
      fromRegion: 'C', toRegion: 'A',
      owner: 'white',
      divisionIds: ['white-div-c'],
    });

    const { nextCombats, nextRegions } = applyCompletedMovements(
      [whiteMovement],
      [sovietAttackMovement, whiteMovement],
      { regions, divisions, combats: [attackCombat], events: [], notifications: [], relationships: WAR_REL },
      NOW
    );

    expect(nextRegions['A'].owner).toBe('soviet');
    const newCombat = nextCombats.find(c => c.defenderRegionId === 'A' && c.id !== 'combat-a-b');
    expect(newCombat).toBeDefined();
    expect(newCombat!.attackerCountry).toBe('white');
    expect(newCombat!.defenderCountry).toBe('soviet');
    expect(newCombat!.defenderDivisionIds).toHaveLength(1);
  });
});

describe('two-front combat: reverse move on an already engaged border', () => {
  it('does not dispatch the lone defending division into a second reverse combat', () => {
    const sovietDiv = makeDiv({ id: 'soviet-div', owner: 'soviet', regionId: 'A' });
    const whiteDiv = makeDiv({ id: 'white-div', owner: 'white', regionId: 'B' });
    const divisions: DivisionState = {
      'soviet-div': sovietDiv,
      'white-div': whiteDiv,
    };
    const regions: RegionState = {
      A: makeRegion('A', { owner: 'soviet' }),
      B: makeRegion('B', { owner: 'white' }),
    };
    const existingCombat = makeCombat({
      id: 'combat-a-b',
      attackerRegionId: 'A',
      defenderRegionId: 'B',
      attackerCountry: 'soviet',
      defenderCountry: 'white',
      attackerDivisionIds: ['soviet-div'],
      defenderDivisionIds: ['white-div'],
    });
    const adjacency = { A: ['B'], B: ['A'] };

    const { get, set, captured } = makeStoreStub({
      regions,
      divisions,
      adjacency,
      activeCombats: [existingCombat],
      selectedCountry: { id: 'white' as CountryId } as GameStore['selectedCountry'],
    });
    const actions = createUnitActions(
      set as Parameters<typeof createUnitActions>[0],
      get as Parameters<typeof createUnitActions>[1],
    );

    actions.moveUnits('B', 'A', 1);

    expect(captured.movingUnits).toBeUndefined();
    expect(captured.activeCombats).toBeUndefined();
  });
});

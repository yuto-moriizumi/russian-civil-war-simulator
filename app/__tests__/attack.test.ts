/**
 * Unit tests for attackArmyGroup — the attack-mode two-phase strategy.
 *
 * Phase 1: Same as defendArmyGroup — allocate divisions to border regions.
 * Phase 2: Surplus divisions at border regions advance into adjacent enemy territory.
 */

import { describe, it, expect } from 'vitest';
import { attackArmyGroup } from '../store/game/armyGroupAttack';
import type {
  Division,
  Movement,
  ArmyGroup,
  ActiveCombat,
  Theater,
  Region,
  RegionState,
  Adjacency,
  Relationship,
} from '../types/game';
import type { GameStore } from '../store/game/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function makeEnemyDiv(id: string): Division {
  return {
    id,
    name: id,
    owner: 'white',
    armyGroupId: undefined,
    hp: 100,
    maxHp: 100,
    attack: 10,
    defence: 15,
  };
}

function makeRegion(id: string, owner: 'soviet' | 'white', divs: Division[] = []): Region {
  return { id, name: id, countryIso3: 'TST', owner, divisions: divs, value: 1 };
}

function makeGroup(overrides: Partial<ArmyGroup> = {}): ArmyGroup {
  return {
    id: 'ag-1',
    name: 'Test Group',
    regionIds: [],
    color: '#fff',
    owner: 'soviet',
    theaterId: null,
    mode: 'advance',
    ...overrides,
  };
}

function makeState(
  regions: RegionState,
  adjacency: Adjacency,
  armyGroups: ArmyGroup[],
  movingUnits: Movement[] = [],
  theaters: Theater[] = [],
  relationships: Relationship[] = [],
  activeCombats: ActiveCombat[] = []
): GameStore {
  return {
    regions,
    adjacency,
    armyGroups,
    movingUnits,
    theaters,
    relationships,
    activeCombats,
    gameEvents: [],
    dateTime: new Date('1918-01-01T00:00:00Z'),
    selectedUnitRegion: null,
    regionCentroids: {},
  } as unknown as GameStore;
}

const WAR: Relationship[] = [
  { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
];

// ---------------------------------------------------------------------------
// Scenario 1: Under-staffed border → Phase 1 fills it; no Phase 2 advance
//
//   REAR --- B1 --- ENEMY
//
//   B1 is a border with 0 divisions. REAR has 2 divisions.
//   allocationTarget for B1 = 2. B1 committed = 0 → needy.
//   Phase 1 should dispatch 2 divisions toward B1.
//   Phase 2 should NOT advance (B1 was a needy border, gets marked).
// ---------------------------------------------------------------------------

describe('attackArmyGroup – Phase 1 fills under-staffed border', () => {
  const adjacency: Adjacency = {
    REAR: ['B1'],
    B1: ['REAR', 'ENEMY'],
    ENEMY: ['B1'],
  };

  const divs = [makeDiv('d1'), makeDiv('d2')];

  const regions: RegionState = {
    REAR: makeRegion('REAR', 'soviet', divs),
    B1: makeRegion('B1', 'soviet'),
    ENEMY: makeRegion('ENEMY', 'white'),
  };

  const group = makeGroup({ regionIds: ['REAR', 'B1'] });

  it('dispatches movements from REAR toward B1 (needy border)', () => {
    const state = makeState(regions, adjacency, [group], [], [], WAR);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, p => { captured = p; });

    expect(captured.movingUnits).toBeDefined();
    const movements = captured.movingUnits as Movement[];
    expect(movements.length).toBeGreaterThan(0);
    // All movements should be Phase 1 fill movements toward B1
    movements.forEach(m => expect(m.fromRegion).toBe('REAR'));
    // No combat should be created (Phase 1 only moves within own territory)
    expect((captured.activeCombats as ActiveCombat[] ?? []).length).toBe(0);
  });

  it('does not advance into enemy territory when border is under-staffed', () => {
    const state = makeState(regions, adjacency, [group], [], [], WAR);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, p => { captured = p; });

    const movements = (captured.movingUnits ?? []) as Movement[];
    // No movement should target ENEMY (Phase 2 skipped because B1 was needy)
    movements.forEach(m => expect(m.toRegion).not.toBe('ENEMY'));
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Fully-staffed border with surplus → Phase 2 advances
//
//   B1 (4 divs, target=2) --- ENEMY (no defenders)
//
//   allocationTarget = 4/1 = 4... Wait, 1 border × 4 divs → target = 4.
//   surplus = 4 - 4 = 0. Let's use 2 borders with 4 total divs in B1.
//
//   B1 (4 divs) --- ENEMY
//   B2 (0 divs) --- ENEMY_2
//
//   allocationTarget = 4/2 = 2.
//   B1 committed = 4 → surplus = 2; B2 committed = 0 → needy.
//   Phase 1: sends 2 from B1 toward B2.
//   Phase 2: B1 now has 2 stationary, target = 2 → no surplus → no advance.
//   Wait... after Phase 1 takes 2 from B1, B1 has 2 left = target. Surplus = 0.
//
// Let's redesign: 1 border with more than target.
//   B1 (5 divs) --- ENEMY (no defenders)
//   No other borders. allocationTarget = 5. surplus = 5 - 5 = 0.
//   Still no surplus. For surplus we need MORE than the target.
//
// Better scenario: 2 divisions, 1 border → target = 2, committed = 2, surplus = 0.
//   Oops still no surplus.
//
// For surplus to exist: divisions > borders * targetPerBorder.
//   Example: 3 divisions, 1 border → target = 3, surplus = 0.
//   We need the committed AFTER Phase 1 to exceed target.
//   Phase 1 only moves excess AWAY, so after Phase 1 a border has exactly target.
//   Surplus in Phase 2 exists when a border STARTS with more than target AND
//   Phase 1 doesn't run (no needy borders).
//
// Correct scenario for Phase 2:
//   1 border (B1) with 5 divisions, 1 border (B2) with 5 divisions.
//   allocationTarget = 10/2 = 5 each. All borders already at target → no needy.
//   Phase 1 does nothing.
//   Phase 2: B1 has 5 stationary, target = 5, surplus = 0. Still 0!
//
// Surplus only exists when a border has MORE than its target.
//   Example: 11 divisions, 2 borders → target = 5 each (11/2=5, remainder=1).
//   B1 target = 6, B2 target = 5.
//   If B1 has 8 divs and B2 has 3 divs:
//     B1 surplus = 8-6=2 available for Phase 1 to send to B2.
//     After Phase 1: B1 = 6 (keeps target), B2 = 5. No surplus.
//   But if BOTH borders are already AT target and one has extra:
//     B1: 8 divs, target=6 → excess=2 available for Phase 1.
//     If B2 is already at target (5 divs), NO needy borders exist.
//     Phase 1 skips entirely.
//     Phase 2: B1 has 8 divs, target=6 → surplus=2 → ADVANCES!
// ---------------------------------------------------------------------------

describe('attackArmyGroup – Phase 2 advances surplus from fully-staffed border', () => {
  // 2 borders, both at or above target, one has surplus
  // B1: 8 divs, B2: 5 divs → total 13, target B1=7, B2=6 (13/2=6 rem 1)
  // B1 surplus = 8-7=1; B2 surplus = 5-6 → -1 → 0 but B2 is needy!
  //
  // Let me use: B1=7 divs, B2=6 divs → total=13, target B1=7, B2=6. Both exact. No needy. No surplus.
  // Need a case where border > target AND no needy borders.
  // B1=9, B2=6 → total=15, target=7 each (15/2=7 rem 1) → B1 target=8, B2=7.
  // B1 committed=9 > target=8 → surplus=1. B2 committed=6 < target=7 → needy!
  // So Phase 1 runs. After Phase 1: B1 sends 1 to B2. B1=8, B2=7. No surplus.
  //
  // ONLY way to get Phase 2: both borders at or above target.
  // B1=8, B2=7 → total=15, B1 target=8, B2 target=7. Both exact. No surplus, no needy.
  // B1=9, B2=7 → total=16, targets=8 each. B1 surplus=1, B2 exact. B2 NOT needy.
  // → Phase 1 skips (no needy borders). Phase 2: B1 has 9, target=8, surplus=1 → ADVANCE!

  const adjacency: Adjacency = {
    B1: ['B2', 'ENEMY_1'],
    B2: ['B1', 'ENEMY_2'],
    ENEMY_1: ['B1'],
    ENEMY_2: ['B2'],
  };

  // B1: 9 divs, B2: 7 divs → total=16, target=8 each
  const b1Divs = Array.from({ length: 9 }, (_, i) => makeDiv(`d-b1-${i + 1}`));
  const b2Divs = Array.from({ length: 7 }, (_, i) => makeDiv(`d-b2-${i + 1}`));

  const regions: RegionState = {
    B1: makeRegion('B1', 'soviet', b1Divs),
    B2: makeRegion('B2', 'soviet', b2Divs),
    ENEMY_1: makeRegion('ENEMY_1', 'white'),
    ENEMY_2: makeRegion('ENEMY_2', 'white'),
  };

  const group = makeGroup({ regionIds: ['B1', 'B2'] });

  it('advances surplus division from B1 into ENEMY_1', () => {
    const state = makeState(regions, adjacency, [group], [], [], WAR);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, p => { captured = p; });

    expect(captured.movingUnits).toBeDefined();
    const movements = captured.movingUnits as Movement[];

    // There should be exactly 1 movement: 1 surplus division from B1 → ENEMY_1
    expect(movements.length).toBe(1);
    expect(movements[0].fromRegion).toBe('B1');
    expect(movements[0].toRegion).toBe('ENEMY_1');
    expect(movements[0].divisions.length).toBe(1);
  });

  it('leaves exactly target divisions at B1 after advancing', () => {
    const state = makeState(regions, adjacency, [group], [], [], WAR);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, p => { captured = p; });

    const b1After = (captured.regions as RegionState)['B1'];
    // target = 8; 1 surplus advanced; 8 remain
    expect(b1After.divisions.length).toBe(8);
  });

  it('does not move B2 (exactly at target, no surplus)', () => {
    const state = makeState(regions, adjacency, [group], [], [], WAR);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, p => { captured = p; });

    const movements = (captured.movingUnits ?? []) as Movement[];
    movements.forEach(m => expect(m.fromRegion).not.toBe('B2'));
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Phase 2 creates combat when enemy region has defenders
// ---------------------------------------------------------------------------

describe('attackArmyGroup – Phase 2 creates combat against defended enemy region', () => {
  const adjacency: Adjacency = {
    B1: ['B2', 'ENEMY'],
    B2: ['B1', 'ENEMY_2'],
    ENEMY: ['B1'],
    ENEMY_2: ['B2'],
  };

  // B1=9 divs (surplus=1), B2=7 (exact). ENEMY has 1 defender.
  const b1Divs = Array.from({ length: 9 }, (_, i) => makeDiv(`d-b1-${i + 1}`));
  const b2Divs = Array.from({ length: 7 }, (_, i) => makeDiv(`d-b2-${i + 1}`));
  const enemyDiv = makeEnemyDiv('enemy-def');

  const regions: RegionState = {
    B1: makeRegion('B1', 'soviet', b1Divs),
    B2: makeRegion('B2', 'soviet', b2Divs),
    ENEMY: makeRegion('ENEMY', 'white', [enemyDiv]),
    ENEMY_2: makeRegion('ENEMY_2', 'white'),
  };

  const group = makeGroup({ regionIds: ['B1', 'B2'] });

  it('creates an ActiveCombat when advancing into a defended region', () => {
    const state = makeState(regions, adjacency, [group], [], [], WAR);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, p => { captured = p; });

    const combats = (captured.activeCombats ?? []) as ActiveCombat[];
    expect(combats.length).toBe(1);
    expect(combats[0].regionId).toBe('ENEMY');
  });

  it('sets pendingCombatId on the movement', () => {
    const state = makeState(regions, adjacency, [group], [], [], WAR);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, p => { captured = p; });

    const movements = (captured.movingUnits ?? []) as Movement[];
    const combats = (captured.activeCombats ?? []) as ActiveCombat[];
    expect(movements[0].pendingCombatId).toBe(combats[0].id);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: No movement when group is at exact allocation with no surplus
// ---------------------------------------------------------------------------

describe('attackArmyGroup – no movement when all borders exactly at target', () => {
  const adjacency: Adjacency = {
    B1: ['ENEMY'],
    ENEMY: ['B1'],
  };

  // 3 divs, 1 border → target=3, committed=3 → no surplus, no needy
  const divs = [makeDiv('d1'), makeDiv('d2'), makeDiv('d3')];

  const regions: RegionState = {
    B1: makeRegion('B1', 'soviet', divs),
    ENEMY: makeRegion('ENEMY', 'white'),
  };

  const group = makeGroup({ regionIds: ['B1'] });

  it('does not dispatch any movements when all borders meet their target exactly', () => {
    const state = makeState(regions, adjacency, [group], [], [], WAR);
    let called = false;
    attackArmyGroup('ag-1', state, () => { called = true; });
    expect(called).toBe(false);
  });
});

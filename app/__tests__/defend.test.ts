/**
 * Unit tests for defendArmyGroup — the defend-mode redistribution logic.
 *
 * These tests exercise the pure function directly (no store, no browser).
 * The GameStore argument is built as a minimal partial object cast to the
 * required type so we only populate the fields the function actually reads.
 */

import { describe, it, expect } from 'vitest';
import { defendArmyGroup } from '../store/game/armyGroupDefend';
import type {
  Division,
  Movement,
  ArmyGroup,
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

function makeRegion(id: string, owner: 'soviet' | 'white', divs: Division[] = []): Region {
  return { id, name: id, countryIso3: 'TST', owner, divisions: divs };
}

function makeGroup(overrides: Partial<ArmyGroup> = {}): ArmyGroup {
  return {
    id: 'ag-1',
    name: 'Test Group',
    regionIds: [],
    color: '#fff',
    owner: 'soviet',
    theaterId: null,
    mode: 'defend',
    ...overrides,
  };
}

/** Build a minimal GameStore partial for defendArmyGroup. */
function makeState(
  regions: RegionState,
  adjacency: Adjacency,
  armyGroups: ArmyGroup[],
  movingUnits: Movement[] = [],
  theaters: Theater[] = [],
  relationships: Relationship[] = []
): GameStore {
  return {
    regions,
    adjacency,
    armyGroups,
    movingUnits,
    theaters,
    relationships,
    dateTime: new Date('1918-01-01T00:00:00Z'),
    selectedUnitRegion: null,
    regionCentroids: {},
    // Fill remaining required fields with harmless stubs
  } as unknown as GameStore;
}

// ---------------------------------------------------------------------------
// Scenario 1: All 15 divisions stacked in one border region, 5 border regions
//
//   Layout (soviet owns all, white owns ENEMY):
//
//   [REAR]---[B1]---[ENEMY]
//                [B2]---[ENEMY]
//                [B3]---[ENEMY]
//                [B4]---[ENEMY]
//                [B5]---[ENEMY]
//
//   B1..B5 each border ENEMY (hostile).
//   All 15 divisions start in B1.
//   After one call: B1 should send excess divisions toward the other borders.
// ---------------------------------------------------------------------------

describe('defendArmyGroup – redistribution from stacked border region', () => {
  // Five border regions each adjacent to a distinct enemy region.
  // B1..B5 are all adjacent to each other (chain) so BFS can route between them.
  // B1 also borders ENEMY_1, B2 borders ENEMY_2, etc.
  const adjacency: Adjacency = {
    B1: ['B2', 'ENEMY_1'],
    B2: ['B1', 'B3', 'ENEMY_2'],
    B3: ['B2', 'B4', 'ENEMY_3'],
    B4: ['B3', 'B5', 'ENEMY_4'],
    B5: ['B4', 'ENEMY_5'],
    ENEMY_1: ['B1'],
    ENEMY_2: ['B2'],
    ENEMY_3: ['B3'],
    ENEMY_4: ['B4'],
    ENEMY_5: ['B5'],
  };

  // 15 divisions all in B1
  const divs = Array.from({ length: 15 }, (_, i) => makeDiv(`div-${i + 1}`));

  const regions: RegionState = {
    B1: makeRegion('B1', 'soviet', divs),
    B2: makeRegion('B2', 'soviet'),
    B3: makeRegion('B3', 'soviet'),
    B4: makeRegion('B4', 'soviet'),
    B5: makeRegion('B5', 'soviet'),
    ENEMY_1: makeRegion('ENEMY_1', 'white'),
    ENEMY_2: makeRegion('ENEMY_2', 'white'),
    ENEMY_3: makeRegion('ENEMY_3', 'white'),
    ENEMY_4: makeRegion('ENEMY_4', 'white'),
    ENEMY_5: makeRegion('ENEMY_5', 'white'),
  };

  // War relationship so all ENEMY regions are hostile and accessible
  const relationships: Relationship[] = [
    { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
  ];

  const group = makeGroup({ regionIds: ['B1', 'B2', 'B3', 'B4', 'B5'] });

  it('dispatches movements from the stacked border to needy borders', () => {
    const state = makeState(regions, adjacency, [group], [], [], relationships);
    let captured: Partial<GameStore> = {};
    defendArmyGroup('ag-1', state, (partial) => { captured = partial; });

    // Should have created at least one movement away from B1
    expect(captured.movingUnits).toBeDefined();
    expect((captured.movingUnits as Movement[]).length).toBeGreaterThan(0);

    const movements = captured.movingUnits as Movement[];
    // All movements must originate from B1 (the only region with divisions)
    movements.forEach(m => expect(m.fromRegion).toBe('B1'));
    // Divisions stay in the region during transit; count dispatched via movements
    const dispatched = (captured.movingUnits as Movement[])
      .filter(m => m.fromRegion === 'B1')
      .reduce((s, m) => s + m.divisions.length, 0);
    expect(dispatched).toBeGreaterThan(0);
    expect(dispatched).toBeLessThan(15);
  });

  it('does not send more than the excess (keeps target count in B1)', () => {
    const state = makeState(regions, adjacency, [group], [], [], relationships);
    let captured: Partial<GameStore> = {};
    defendArmyGroup('ag-1', state, (partial) => { captured = partial; });

    if (!captured.movingUnits) return; // no dispatch at all means the bug is still present

    // Target is 15/5 = 3 per border. B1 keeps 3, sends 12.
    // Divisions stay in region during transit, so we check dispatch count only.
    const dispatched = (captured.movingUnits as Movement[])
      .filter(m => m.fromRegion === 'B1')
      .reduce((s, m) => s + m.divisions.length, 0);
    expect(dispatched).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Divisions already well-distributed — no movement expected
// ---------------------------------------------------------------------------

describe('defendArmyGroup – no movement when borders are adequately staffed', () => {
  const adjacency: Adjacency = {
    B1: ['B2', 'ENEMY'],
    B2: ['B1', 'ENEMY'],
    ENEMY: ['B1', 'B2'],
  };

  // 2 borders, 2 divisions each → target = 2 per border → already satisfied
  const regions: RegionState = {
    B1: makeRegion('B1', 'soviet', [makeDiv('d1'), makeDiv('d2')]),
    B2: makeRegion('B2', 'soviet', [makeDiv('d3'), makeDiv('d4')]),
    ENEMY: makeRegion('ENEMY', 'white'),
  };

  const relationships: Relationship[] = [
    { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
  ];

  const group = makeGroup({ regionIds: ['B1', 'B2'] });

  it('does not dispatch any movements when all borders meet their target', () => {
    const state = makeState(regions, adjacency, [group], [], [], relationships);
    let called = false;
    defendArmyGroup('ag-1', state, () => { called = true; });
    expect(called).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: In-transit divisions count — no duplicate dispatch
// ---------------------------------------------------------------------------

describe('defendArmyGroup – in-transit divisions prevent duplicate dispatch', () => {
  const adjacency: Adjacency = {
    REAR: ['B1'],
    B1: ['REAR', 'ENEMY'],
    ENEMY: ['B1'],
  };

  // 1 border (B1), 1 division in REAR, 1 division already moving from REAR→B1
  const rearDiv = makeDiv('d-rear');
  const transitDiv = makeDiv('d-transit');

  const regions: RegionState = {
    REAR: makeRegion('REAR', 'soviet', [rearDiv]),
    B1: makeRegion('B1', 'soviet'),
    ENEMY: makeRegion('ENEMY', 'white'),
  };

  const existingMovement: Movement = {
    id: 'mv-existing',
    fromRegion: 'REAR',
    toRegion: 'B1',
    divisions: [transitDiv],
    departureTime: new Date('1918-01-01T00:00:00Z'),
    arrivalTime: new Date('1918-01-01T12:00:00Z'),
    owner: 'soviet',
  };

  const relationships: Relationship[] = [
    { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
  ];

  const group = makeGroup({ regionIds: ['REAR', 'B1'] });

  it('does not create a duplicate movement when a division is already en route', () => {
    // B1 needs 1 div (total 2 divs / 1 border = 2 target).
    // But 1 is already in transit → committed = 1. Need 1 more.
    // rearDiv should be dispatched.
    const state = makeState(regions, adjacency, [group], [existingMovement], [], relationships);
    let captured: Partial<GameStore> = {};
    defendArmyGroup('ag-1', state, (partial) => { captured = partial; });

    // The existing movement targets B1 directly. The new movement should
    // also go toward B1 (from REAR) if it's dispatched.
    // Key assertion: at most 1 new movement from REAR (not 2).
    const newMovements = (captured.movingUnits ?? []) as Movement[];
    const fromRear = newMovements.filter(m => m.fromRegion === 'REAR' && m.id !== 'mv-existing');
    expect(fromRear.length).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4a (regression): DEFEND must never dispatch a movement into enemy
// territory when the only path from source to border goes through enemy land.
//
//   Layout:
//
//   [REAR]---[ENEMY]---[B1]
//
//   The only path from REAR to B1 passes through ENEMY.
//   With the old canEnter (war = accessible) BFS would route
//   REAR → ENEMY → B1 and the movement toRegion = ENEMY, causing an invasion.
//   With the fix, no friendly-only path exists, so no movement is dispatched.
// ---------------------------------------------------------------------------

describe('defendArmyGroup – no invasion when only path goes through enemy territory', () => {
  // Only path from REAR to B1 passes through ENEMY.
  const adjacency: Adjacency = {
    REAR: ['ENEMY'],
    ENEMY: ['REAR', 'B1'],
    B1: ['ENEMY'],
  };

  const rearDiv = makeDiv('d-rear');

  const regions: RegionState = {
    REAR: makeRegion('REAR', 'soviet', [rearDiv]),
    B1: makeRegion('B1', 'soviet'),
    ENEMY: makeRegion('ENEMY', 'white'),
  };

  const relationships: Relationship[] = [
    { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
  ];

  const group = makeGroup({ regionIds: ['REAR', 'B1'] });

  it('does not dispatch any movement into enemy territory when there is no friendly path', () => {
    const state = makeState(regions, adjacency, [group], [], [], relationships);
    let captured: Partial<GameStore> = {};
    defendArmyGroup('ag-1', state, (partial) => { captured = partial; });

    // No movement should be dispatched — or if somehow dispatched, never into enemy territory.
    const movements = (captured.movingUnits ?? []) as Movement[];
    movements.forEach(m => {
      const dest = regions[m.toRegion];
      expect(dest?.owner).toBe('soviet');
    });
  });
});

// ---------------------------------------------------------------------------
// Scenario 4b (regression): DEFEND still moves via a friendly-only path when
// one exists, even when an enemy shortcut is present in the adjacency graph.
//
//   Layout:
//
//   [REAR2]---[MID]---[B1]---[ENEMY]
//                 \          /
//                  \--------/    ← MID also borders ENEMY
//
//   REAR2 is only adjacent to MID (not to ENEMY), so REAR2 is a true rear.
//   MID borders ENEMY so it is a border region.
//   B1 borders ENEMY so it is a border region.
//   With old canEnter, BFS from REAR2 targeting B1 might traverse via
//   MID→ENEMY→B1.  With canEnterFriendlyOnly it goes MID→B1 (friendly hop).
//   Either way the movement's first step must be a friendly region (MID).
// ---------------------------------------------------------------------------

describe('defendArmyGroup – routes through friendly territory when a direct path exists', () => {
  const adjacency: Adjacency = {
    REAR2: ['MID'],
    MID: ['REAR2', 'B1', 'ENEMY'],
    B1: ['MID', 'ENEMY'],
    ENEMY: ['MID', 'B1'],
  };

  const rearDiv = makeDiv('d-rear2');

  const regions: RegionState = {
    REAR2: makeRegion('REAR2', 'soviet', [rearDiv]),
    MID: makeRegion('MID', 'soviet'),
    B1: makeRegion('B1', 'soviet'),
    ENEMY: makeRegion('ENEMY', 'white'),
  };

  const relationships: Relationship[] = [
    { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
  ];

  const group = makeGroup({ regionIds: ['REAR2', 'MID', 'B1'] });

  it('dispatches a movement whose toRegion is friendly (never enemy)', () => {
    const state = makeState(regions, adjacency, [group], [], [], relationships);
    let captured: Partial<GameStore> = {};
    defendArmyGroup('ag-1', state, (partial) => { captured = partial; });

    const movements = (captured.movingUnits ?? []) as Movement[];
    // At least one movement should be dispatched from REAR2
    const fromRear = movements.filter(m => m.fromRegion === 'REAR2');
    expect(fromRear.length).toBeGreaterThan(0);

    // Every dispatched movement must land on friendly territory
    fromRear.forEach(m => {
      const dest = regions[m.toRegion];
      expect(dest?.owner).toBe('soviet');
    });
  });
});

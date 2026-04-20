/**
 * Unit tests for attackArmyGroup — the attack-mode two-phase strategy.
 *
 * Phase 1: identical to defendArmyGroup — distributes divisions proportionally
 *   to border regions (own regions adjacent to hostile territory).
 *
 * Phase 2: border regions with surplus stationary divisions (present > target)
 *   advance the surplus directly into adjacent accessible hostile regions.
 *   Phase 1 is the gate: if in-transit divisions already cover all needy-border
 *   deficits the Phase 1 block is skipped, leaving borders untouched so their
 *   surplus remains available for Phase 2.
 *
 * Phase 2 trigger mechanism
 * ─────────────────────────
 * Allocation target = totalGroupDivisions / numBorders.  In-transit divisions
 * going to border B2 count in "committed(B2)" AND in totalGroupDivisions, so
 * they raise the target for every border without raising B1's stationaryDivs.
 * If those transit divisions also satisfy B2's entire deficit, Phase 1 is
 * skipped (inTransitDivisionIds.size ≥ totalDeficit) and B1's stationaryDivs
 * can legitimately exceed its target → surplus → Phase 2 advances from B1.
 *
 * Concrete example (Scenario 3 / 4):
 *   B1=10 present, B2=3 present, 4 transit→B2 → total=17, N=2
 *   target(B1)=9, target(B2)=8
 *   committed(B1)=10>9 (not needy), committed(B2)=3+4=7<8 (needy, deficit=1)
 *   inTransit.size=4 ≥ totalDeficit=1  →  Phase 1 SKIPPED
 *   Phase 2: B1.stationaryDivs=10 > target=9 → surplus=1 → ADVANCE ✓
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

function makeDiv(
  id: string,
  armyGroupId = 'ag-1',
  owner: 'soviet' | 'white' = 'soviet'
): Division {
  return {
    id,
    name: id,
    owner,
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
    mode: 'advance',
    ...overrides,
  };
}

/** Build a minimal GameStore partial for attackArmyGroup. */
function makeState(
  regions: RegionState,
  adjacency: Adjacency,
  armyGroups: ArmyGroup[],
  movingUnits: Movement[] = [],
  theaters: Theater[] = [],
  relationships: Relationship[] = [],
  activeCombats: ActiveCombat[] = [],
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

// ---------------------------------------------------------------------------
// Scenario 1: Phase 1 — same redistribution behaviour as defend mode
//
//   Layout (soviet owns all, white owns ENEMY_*):
//
//   [B1 (15 divs)]──[ENEMY_1]
//        │
//   [B2]──[ENEMY_2]
//   [B3]──[ENEMY_3]
//   [B4]──[ENEMY_4]
//   [B5]──[ENEMY_5]
//
//   All 15 divisions start in B1.  Phase 1 should redistribute excess toward
//   the other empty borders (identical to defend mode).  Phase 2 will be
//   skipped for B1 because it was a Phase 1 source (movedRegions.has(B1)).
// ---------------------------------------------------------------------------

describe('attackArmyGroup – Phase 1 redistributes from stacked border region', () => {
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

  const relationships: Relationship[] = [
    { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
  ];

  const group = makeGroup({ regionIds: ['B1', 'B2', 'B3', 'B4', 'B5'] });

  it('dispatches movements from the stacked border to needy borders, then advances remaining divisions', () => {
    const state = makeState(regions, adjacency, [group], [], [], relationships);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, (partial) => { captured = partial; });

    expect(captured.movingUnits).toBeDefined();
    expect((captured.movingUnits as Movement[]).length).toBeGreaterThan(0);

    const movements = captured.movingUnits as Movement[];
    movements.forEach(m => expect(m.fromRegion).toBe('B1'));

    // Divisions stay in region during transit; check dispatch count via movements.
    const reinforcementDispatched = (captured.movingUnits as Movement[])
      .filter(m => m.fromRegion === 'B1' && m.toRegion !== 'ENEMY_1')
      .reduce((s, m) => s + m.divisions.length, 0);
    const advanced = (captured.movingUnits as Movement[])
      .filter(m => m.fromRegion === 'B1' && m.toRegion === 'ENEMY_1')
      .reduce((s, m) => s + m.divisions.length, 0);
    expect(reinforcementDispatched).toBeGreaterThan(0);
    expect(reinforcementDispatched).toBeLessThan(15);
    expect(advanced).toBe(3);
  });

  it('sends only the excess to needy borders before single-enemy auto-advance uses the remainder', () => {
    const state = makeState(regions, adjacency, [group], [], [], relationships);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, (partial) => { captured = partial; });

    if (!captured.movingUnits) return;

    // target = 15/5 = 3 per border.  B1 sends 12 to needy borders, then the
    // single-enemy rule advances the remaining 3 to ENEMY_1.
    const reinforcementDispatched = (captured.movingUnits as Movement[])
      .filter(m => m.fromRegion === 'B1' && m.toRegion !== 'ENEMY_1')
      .reduce((s, m) => s + m.divisions.length, 0);
    const advanced = (captured.movingUnits as Movement[])
      .filter(m => m.fromRegion === 'B1' && m.toRegion === 'ENEMY_1')
      .reduce((s, m) => s + m.divisions.length, 0);
    expect(reinforcementDispatched).toBe(12);
    expect(advanced).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Single-enemy auto-advance when borders meet their targets
//
//   2 borders, 2 divisions each → target = 2 → surplus = 0.
//   Phase 1: no needy borders.
//   Phase 2: each border has exactly 1 adjacent hostile target → ADVANCE.
//   Each border advances all stationary divisions to ENEMY.
// ---------------------------------------------------------------------------

describe('attackArmyGroup – single-enemy auto-advance when borders meet target', () => {
  const adjacency: Adjacency = {
    B1: ['B2', 'ENEMY'],
    B2: ['B1', 'ENEMY'],
    ENEMY: ['B1', 'B2'],
  };

  const regions: RegionState = {
    B1: makeRegion('B1', 'soviet', [makeDiv('d1'), makeDiv('d2')]),
    B2: makeRegion('B2', 'soviet', [makeDiv('d3'), makeDiv('d4')]),
    ENEMY: makeRegion('ENEMY', 'white'),
  };

  const relationships: Relationship[] = [
    { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
  ];

  const group = makeGroup({ regionIds: ['B1', 'B2'] });

  it('advances all divisions per border even when surplus=0', () => {
    const state = makeState(regions, adjacency, [group], [], [], relationships);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, (partial) => { captured = partial; });
    const movements = (captured.movingUnits ?? []) as Movement[];
    const advances = movements.filter(m => m.toRegion === 'ENEMY');
    // Both B1 and B2 advance all stationary divisions to the single enemy target.
    expect(advances.length).toBe(2);
    advances.forEach(adv => expect(adv.divisions.length).toBe(2));
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Phase 2 creates combat when a border has surplus divisions and
//             the enemy region is defended.
//
//   Layout:
//     REAR (empty) ──→ B2 (3 divs, border) ← 4 transit divs already en route
//     B1 (10 divs, border) ──[ENEMY_1 (1 white div)]
//     B2 ──[ENEMY_2 (empty)]
//
//   Math:
//     total = 10 + 3 + 4 = 17, N=2 borders
//     target(B1) = ⌊17/2⌋ + 1 = 9  (i=0 gets the remainder)
//     target(B2) = ⌊17/2⌋     = 8
//     committed(B1) = 10 > 9  → not needy
//     committed(B2) = 3 + 4 = 7 < 8  → needy, deficit = 1
//     inTransit.size = 4 ≥ totalDeficit = 1  →  Phase 1 SKIPPED
//     Phase 2: B1.stationaryDivs = 10 > target = 9  →  surplus = 1  →  ADVANCE!
// ---------------------------------------------------------------------------

describe('attackArmyGroup – Phase 2 advances surplus into defended enemy region', () => {
  const b1Divs = Array.from({ length: 10 }, (_, i) => makeDiv(`b1-${i + 1}`));
  const b2Divs = Array.from({ length: 3 }, (_, i) => makeDiv(`b2-${i + 1}`));
  const transitDivs = Array.from({ length: 4 }, (_, i) => makeDiv(`tr-${i + 1}`));
  const enemyDefender = makeDiv('e-def-1', 'ag-enemy', 'white');

  const adjacency: Adjacency = {
    B1: ['B2', 'ENEMY_1'],
    B2: ['B1', 'ENEMY_2'],
    ENEMY_1: ['B1'],
    ENEMY_2: ['B2'],
    REAR: ['B2'],
  };

  const regions: RegionState = {
    B1: makeRegion('B1', 'soviet', b1Divs),
    B2: makeRegion('B2', 'soviet', b2Divs),
    ENEMY_1: makeRegion('ENEMY_1', 'white', [enemyDefender]),
    ENEMY_2: makeRegion('ENEMY_2', 'white'),
    REAR: makeRegion('REAR', 'soviet'),
  };

  const relationships: Relationship[] = [
    { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
  ];

  // 4 transit divisions already heading from REAR → B2.
  // They inflate totalGroupDivisions (raising targets) without being present
  // in B1's region, so B1.stationaryDivs (10) > target (9).
  const existingMovement: Movement = {
    id: 'mv-transit-to-b2',
    fromRegion: 'REAR',
    toRegion: 'B2',
    divisions: transitDivs,
    departureTime: new Date('1918-01-01T00:00:00Z'),
    arrivalTime: new Date('1918-01-01T12:00:00Z'),
    owner: 'soviet',
  };

  const group = makeGroup({ regionIds: ['B1', 'B2', 'REAR'] });

  it('creates a movement from the surplus border into the enemy region', () => {
    const state = makeState(regions, adjacency, [group], [existingMovement], [], relationships);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, (partial) => { captured = partial; });

    const movements = (captured.movingUnits ?? []) as Movement[];
    const advance = movements.find(m => m.fromRegion === 'B1' && m.toRegion === 'ENEMY_1');
    expect(advance).toBeDefined();
    expect(advance!.divisions.length).toBe(10);
  });

  it('creates an ActiveCombat when advancing into a defended region', () => {
    const state = makeState(regions, adjacency, [group], [existingMovement], [], relationships);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, (partial) => { captured = partial; });

    const combats = (captured.activeCombats ?? []) as ActiveCombat[];
    expect(combats.length).toBe(1);
    expect(combats[0].defenderRegionId).toBe('ENEMY_1');
  });

  it('sets pendingCombatId on the advance movement', () => {
    const state = makeState(regions, adjacency, [group], [existingMovement], [], relationships);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, (partial) => { captured = partial; });

    const combats = (captured.activeCombats ?? []) as ActiveCombat[];
    const movements = (captured.movingUnits ?? []) as Movement[];
    const advance = movements.find(m => m.fromRegion === 'B1' && m.toRegion === 'ENEMY_1');
    expect(advance).toBeDefined();
    expect(advance!.pendingCombatId).toBe(combats[0]?.id);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Phase 2 advances into an undefended enemy region — no combat
//
//   Same layout as Scenario 3 but ENEMY_1 has no divisions.
//   The surplus division from B1 should advance (movement created) but no
//   ActiveCombat should be created.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Scenario 5: Single-enemy auto-advance
//
//   A border region has exactly 1 stationary division AND exactly 1 adjacent
//   hostile region.  Even though stationaryDivs.length (1) == target (1),
//   surplus = 0, the lone division MUST auto-advance.
//
//   Layout:
//     BORDER (1 div) ──[ENEMY (1 white div)]
//     target = 1/1 = 1 → surplus = 0, but single-enemy rule fires.
// ---------------------------------------------------------------------------

describe('attackArmyGroup – Phase 2 advances into undefended enemy without creating combat', () => {
  const b1Divs = Array.from({ length: 10 }, (_, i) => makeDiv(`b1-${i + 1}`));
  const b2Divs = Array.from({ length: 3 }, (_, i) => makeDiv(`b2-${i + 1}`));
  const transitDivs = Array.from({ length: 4 }, (_, i) => makeDiv(`tr-${i + 1}`));

  const adjacency: Adjacency = {
    B1: ['B2', 'ENEMY_1'],
    B2: ['B1', 'ENEMY_2'],
    ENEMY_1: ['B1'],
    ENEMY_2: ['B2'],
    REAR: ['B2'],
  };

  const regions: RegionState = {
    B1: makeRegion('B1', 'soviet', b1Divs),
    B2: makeRegion('B2', 'soviet', b2Divs),
    ENEMY_1: makeRegion('ENEMY_1', 'white'),   // no defenders
    ENEMY_2: makeRegion('ENEMY_2', 'white'),
    REAR: makeRegion('REAR', 'soviet'),
  };

  const relationships: Relationship[] = [
    { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
  ];

  const existingMovement: Movement = {
    id: 'mv-transit-to-b2',
    fromRegion: 'REAR',
    toRegion: 'B2',
    divisions: transitDivs,
    departureTime: new Date('1918-01-01T00:00:00Z'),
    arrivalTime: new Date('1918-01-01T12:00:00Z'),
    owner: 'soviet',
  };

  const group = makeGroup({ regionIds: ['B1', 'B2', 'REAR'] });

  it('creates a movement from B1 into the undefended enemy region', () => {
    const state = makeState(regions, adjacency, [group], [existingMovement], [], relationships);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, (partial) => { captured = partial; });

    const movements = (captured.movingUnits ?? []) as Movement[];
    const advance = movements.find(m => m.fromRegion === 'B1' && m.toRegion === 'ENEMY_1');
    expect(advance).toBeDefined();
  });

  it('does not create any combat when the target is undefended', () => {
    const state = makeState(regions, adjacency, [group], [existingMovement], [], relationships);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, (partial) => { captured = partial; });

    const combats = (captured.activeCombats ?? []) as ActiveCombat[];
    expect(combats.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Single-enemy auto-advance
//
//   A border region has exactly 1 stationary division AND exactly 1 adjacent
//   hostile region.  Even though surplus = 0 (stationaryDivs == target),
//   the lone division MUST auto-advance.
//
//   Layout:
//     BORDER (1 soviet div) ──[ENEMY (1 white div)]
//     total=1, N=1 border → target=1 → surplus=0 normally, but auto-advance fires.
// ---------------------------------------------------------------------------

describe('attackArmyGroup – Phase 2 single-enemy auto-advance', () => {
  const adjacency: Adjacency = {
    BORDER: ['ENEMY'],
    ENEMY: ['BORDER'],
  };

  const relationships: Relationship[] = [
    { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
  ];

  it('auto-advances the lone division when there is exactly 1 adjacent enemy', () => {
    const regions: RegionState = {
      BORDER: makeRegion('BORDER', 'soviet', [makeDiv('lone-div')]),
      ENEMY: makeRegion('ENEMY', 'white', [makeDiv('e-def', 'ag-enemy', 'white')]),
    };
    const group = makeGroup({ regionIds: ['BORDER'] });
    const state = makeState(regions, adjacency, [group], [], [], relationships);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, (partial) => { captured = partial; });

    const movements = (captured.movingUnits ?? []) as Movement[];
    const advance = movements.find(m => m.fromRegion === 'BORDER' && m.toRegion === 'ENEMY');
    expect(advance).toBeDefined();
    expect(advance!.divisions.length).toBe(1);
  });

  it('creates an ActiveCombat when auto-advancing into a defended enemy region', () => {
    const regions: RegionState = {
      BORDER: makeRegion('BORDER', 'soviet', [makeDiv('lone-div')]),
      ENEMY: makeRegion('ENEMY', 'white', [makeDiv('e-def', 'ag-enemy', 'white')]),
    };
    const group = makeGroup({ regionIds: ['BORDER'] });
    const state = makeState(regions, adjacency, [group], [], [], relationships);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, (partial) => { captured = partial; });

    const combats = (captured.activeCombats ?? []) as ActiveCombat[];
    expect(combats.length).toBe(1);
    expect(combats[0].defenderRegionId).toBe('ENEMY');
  });

  it('does NOT auto-advance when there are 2 adjacent enemy regions (ambiguous front)', () => {
    const adjacency2: Adjacency = {
      BORDER: ['ENEMY_1', 'ENEMY_2'],
      ENEMY_1: ['BORDER'],
      ENEMY_2: ['BORDER'],
    };
    const regions: RegionState = {
      BORDER: makeRegion('BORDER', 'soviet', [makeDiv('lone-div')]),
      ENEMY_1: makeRegion('ENEMY_1', 'white'),
      ENEMY_2: makeRegion('ENEMY_2', 'white'),
    };
    const group = makeGroup({ regionIds: ['BORDER'] });
    const state = makeState(regions, adjacency2, [group], [], [], relationships);
    let called = false;
    attackArmyGroup('ag-1', state, () => { called = true; });
    // surplus=0 and NOT single-enemy → no movement
    expect(called).toBe(false);
  });

  it('auto-advances all divisions when there are 2 stationary divisions and 1 adjacent enemy', () => {
    const regions: RegionState = {
      BORDER: makeRegion('BORDER', 'soviet', [makeDiv('div-1'), makeDiv('div-2')]),
      ENEMY: makeRegion('ENEMY', 'white'),
    };
    const group = makeGroup({ regionIds: ['BORDER'] });
    const state = makeState(regions, adjacency, [group], [], [], relationships);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, (partial) => { captured = partial; });
    // total=2, N=1 border → target=2 → surplus=0, but the single-enemy rule advances both.
    const movements = (captured.movingUnits ?? []) as Movement[];
    const advance = movements.find(m => m.fromRegion === 'BORDER' && m.toRegion === 'ENEMY');
    expect(advance).toBeDefined();
    expect(advance!.divisions.length).toBe(2);
  });

  it('auto-advances stationary divisions even when Phase 1 also sends reinforcements to that border', () => {
    const adjacency2: Adjacency = { B1: ['B2', 'ENEMY_1'], B2: ['B1', 'ENEMY_2'], ENEMY_1: ['B1'], ENEMY_2: ['B2'] };
    const regions: RegionState = {
      B1: makeRegion('B1', 'soviet', [makeDiv('b1-stationary')]),
      B2: makeRegion('B2', 'soviet', [makeDiv('b2-1'), makeDiv('b2-2'), makeDiv('b2-3')]),
      ENEMY_1: makeRegion('ENEMY_1', 'white'),
      ENEMY_2: makeRegion('ENEMY_2', 'white'),
    };
    const group = makeGroup({ regionIds: ['B1', 'B2'] });
    const state = makeState(regions, adjacency2, [group], [], [], relationships);
    let captured: Partial<GameStore> = {};
    attackArmyGroup('ag-1', state, (partial) => { captured = partial; });

    const movements = (captured.movingUnits ?? []) as Movement[];
    const reinforcement = movements.find(m => m.fromRegion === 'B2' && m.toRegion === 'B1');
    const advance = movements.find(m => m.fromRegion === 'B1' && m.toRegion === 'ENEMY_1');

    expect(reinforcement).toBeDefined();
    expect(advance).toBeDefined();
    expect(advance!.divisions.map(d => d.id)).toEqual(['b1-stationary']);
  });
});

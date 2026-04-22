/**
 * Unit tests for detectTheaters — verifies that theaters are only created
 * against countries the player is actively at war with.
 *
 * Regression: Soviet theater must NOT form against autonomy servants or
 * military-access partners (e.g. Iskolat / Latvian Soviet Republic).
 */

import { describe, it, expect } from 'vitest';
import { detectTheaters } from '../utils/theaterDetection';
import type {
  CountryId,
  Division,
  Adjacency,
  Region,
  RegionState,
  Relationship,
} from '../types/game';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRegion(
  id: string,
  owner: CountryId,
  _divs: Division[] = []
): Region {
  return { id, name: id, countryIso3: 'TST', owner };
}

/**
 * Map layout:
 *
 *   [soviet-A]--[soviet-B]--[iskolat-C]--[iskolat-D]
 *
 * soviet owns A and B; iskolat (Latvian Soviet Republic) owns C and D.
 * soviet-B is the only soviet region bordering iskolat territory.
 */
const adjacency: Adjacency = {
  'soviet-A':  ['soviet-B'],
  'soviet-B':  ['soviet-A', 'iskolat-C'],
  'iskolat-C': ['soviet-B', 'iskolat-D'],
  'iskolat-D': ['iskolat-C'],
};

const regions: RegionState = {
  'soviet-A':  makeRegion('soviet-A',  'soviet'),
  'soviet-B':  makeRegion('soviet-B',  'soviet'),
  'iskolat-C': makeRegion('iskolat-C', 'iskolat'),
  'iskolat-D': makeRegion('iskolat-D', 'iskolat'),
};

/**
 * Map layout for neutral-country tests:
 *
 *   [soviet-X]--[soviet-Y]--[neutral-Z]--[neutral-W]
 *
 * soviet owns X and Y; the special 'neutral' country owns Z and W.
 * soviet-Y is the only soviet region bordering neutral territory.
 */
const adjacencyNeutral: Adjacency = {
  'soviet-X':  ['soviet-Y'],
  'soviet-Y':  ['soviet-X', 'neutral-Z'],
  'neutral-Z': ['soviet-Y', 'neutral-W'],
  'neutral-W': ['neutral-Z'],
};

const regionsNeutral: RegionState = {
  'soviet-X':  makeRegion('soviet-X',  'soviet'),
  'soviet-Y':  makeRegion('soviet-Y',  'soviet'),
  'neutral-Z': makeRegion('neutral-Z', 'neutral'),
  'neutral-W': makeRegion('neutral-W', 'neutral'),
};

// ---------------------------------------------------------------------------
// detectTheaters — friendly/vassal country regression
// ---------------------------------------------------------------------------

describe('detectTheaters', () => {
  it('creates no theater when Iskolat is an autonomy servant (no war)', () => {
    const relationships: Relationship[] = [
      { fromCountry: 'soviet', toCountry: 'iskolat', type: 'autonomy' },
    ];

    const theaters = detectTheaters(regions, adjacency, 'soviet', [], relationships);
    expect(theaters).toHaveLength(0);
  });

  it('creates no theater when Iskolat granted military_access to soviet (no war)', () => {
    const relationships: Relationship[] = [
      { fromCountry: 'iskolat', toCountry: 'soviet', type: 'military_access' },
    ];

    const theaters = detectTheaters(regions, adjacency, 'soviet', [], relationships);
    expect(theaters).toHaveLength(0);
  });

  it('creates a theater when relationships are empty (Iskolat is a neutral neighbor)', () => {
    // No relationship at all means the foreign country is a neutral — theaters
    // now form against neutral countries too, not just war adversaries.
    const theaters = detectTheaters(regions, adjacency, 'soviet', [], []);
    expect(theaters).toHaveLength(1);
    expect(theaters[0].frontlineRegions).toContain('soviet-B');
    expect(theaters[0].enemyCountry).toBe('iskolat');
  });

  it('creates a theater when soviet declared war on Iskolat', () => {
    const relationships: Relationship[] = [
      { fromCountry: 'soviet', toCountry: 'iskolat', type: 'war' },
    ];

    const theaters = detectTheaters(regions, adjacency, 'soviet', [], relationships);
    expect(theaters).toHaveLength(1);
    expect(theaters[0].frontlineRegions).toContain('soviet-B');
    expect(theaters[0].enemyCountry).toBe('iskolat');
  });

  it('creates a theater when Iskolat declared war on soviet', () => {
    const relationships: Relationship[] = [
      { fromCountry: 'iskolat', toCountry: 'soviet', type: 'war' },
    ];

    const theaters = detectTheaters(regions, adjacency, 'soviet', [], relationships);
    expect(theaters).toHaveLength(1);
    expect(theaters[0].frontlineRegions).toContain('soviet-B');
  });
});

// ---------------------------------------------------------------------------
// detectTheaters — puppet territory included in player's frontline
// ---------------------------------------------------------------------------

describe('detectTheaters — puppet territory on frontline', () => {
  /**
   * Map layout:
   *
   *   [soviet-A]--[iskolat-B]--[white-C]
   *
   * soviet owns A, iskolat (puppet) owns B, white (enemy) owns C.
   * iskolat-B borders the enemy but is not owned by the player.
   * With autonomy relationship, iskolat-B should be included in soviet's front.
   */
  const adj: Adjacency = {
    'soviet-A':  ['iskolat-B'],
    'iskolat-B': ['soviet-A', 'white-C'],
    'white-C':   ['iskolat-B'],
  };

  const regs: RegionState = {
    'soviet-A':  makeRegion('soviet-A', 'soviet'),
    'iskolat-B': makeRegion('iskolat-B', 'iskolat'),
    'white-C':   makeRegion('white-C', 'white'),
  };

  it('includes puppet territory in frontline when puppet borders enemy', () => {
    const relationships: Relationship[] = [
      { fromCountry: 'soviet', toCountry: 'iskolat', type: 'autonomy' },
      { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
    ];

    const theaters = detectTheaters(regs, adj, 'soviet', [], relationships);
    expect(theaters).toHaveLength(1);
    expect(theaters[0].frontlineRegions).toContain('iskolat-B');
    expect(theaters[0].enemyCountry).toBe('white');
  });

  it('connects player and puppet frontline regions through allied territory', () => {
    /**
     * Map layout:
     *
     *   [soviet-A]--[soviet-D]--[iskolat-B]--[white-C]
     *
     * soviet-A and soviet-D are not adjacent to enemy.
     * iskolat-B (puppet) borders enemy white-C.
     * soviet-A should NOT be in frontline, but iskolat-B should.
     * All should be connected in the same theater through allied territory.
     */
    const adj2: Adjacency = {
      'soviet-A':  ['soviet-D'],
      'soviet-D':  ['soviet-A', 'iskolat-B'],
      'iskolat-B': ['soviet-D', 'white-C'],
      'white-C':   ['iskolat-B'],
    };

    const regs2: RegionState = {
      'soviet-A':  makeRegion('soviet-A', 'soviet'),
      'soviet-D':  makeRegion('soviet-D', 'soviet'),
      'iskolat-B': makeRegion('iskolat-B', 'iskolat'),
      'white-C':   makeRegion('white-C', 'white'),
    };

    const relationships: Relationship[] = [
      { fromCountry: 'soviet', toCountry: 'iskolat', type: 'autonomy' },
      { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
    ];

    const theaters = detectTheaters(regs2, adj2, 'soviet', [], relationships);
    expect(theaters).toHaveLength(1);
    expect(theaters[0].frontlineRegions).toContain('iskolat-B');
    expect(theaters[0].enemyCountry).toBe('white');
  });

  it('does not include puppet territory when there is no autonomy relationship', () => {
    const relationships: Relationship[] = [
      { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
      // No autonomy relationship with iskolat
    ];

    const theaters = detectTheaters(regs, adj, 'soviet', [], relationships);
    // iskolat is a neutral country with no relationship — it gets its own theater
    expect(theaters.length).toBeGreaterThanOrEqual(1);
    const whiteTheater = theaters.find(t => t.enemyCountry === 'white');
    expect(whiteTheater).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// detectTheaters — neutral country (unowned territory) regression
// ---------------------------------------------------------------------------

describe('detectTheaters — neutral territory', () => {
  it('creates a theater when player borders neutral-owned (unowned) territory', () => {
    // 'neutral' country owns adjacent regions — theater should form even with no
    // explicit war relationship, because neutral territory can always be advanced into.
    const theaters = detectTheaters(regionsNeutral, adjacencyNeutral, 'soviet', [], []);
    expect(theaters).toHaveLength(1);
    expect(theaters[0].frontlineRegions).toContain('soviet-Y');
    expect(theaters[0].enemyCountry).toBe('neutral');
  });

  it('creates a theater when a real foreign country has no war relationship (neutral)', () => {
    // Foreign country 'iskolat' with no explicit relationship is treated as a
    // neutral — theaters now form against neutral countries, not just war enemies.
    const theaters = detectTheaters(regions, adjacency, 'soviet', [], []);
    expect(theaters).toHaveLength(1);
    expect(theaters[0].frontlineRegions).toContain('soviet-B');
    expect(theaters[0].enemyCountry).toBe('iskolat');
  });
});

// ---------------------------------------------------------------------------
// detectTheaters — neutral A/B vs enemy C/D split
// ---------------------------------------------------------------------------

describe('detectTheaters — neutral vs war theater split', () => {
  /**
   * Map layout:
   *
   *   [neutral-A] \
   *   [neutral-B]  -- [soviet-X] -- [enemy-C]
   *   [enemy-D]   /
   *
   * soviet-X is adjacent to neutral A, neutral B, war enemy C, and war enemy D.
   * Expected: 3 theaters — vs-A, vs-B, vs-CD (war).
   */
  // Reuse valid CountryId values: finland and ukraine as neutrals, white and don as war enemies
  const adj: Adjacency = {
    'soviet-X':   ['neutral-fin', 'neutral-ukr', 'enemy-wht', 'enemy-don'],
    'neutral-fin': ['soviet-X'],
    'neutral-ukr': ['soviet-X'],
    'enemy-wht':   ['soviet-X'],
    'enemy-don':   ['soviet-X'],
  };

  const regs: RegionState = {
    'soviet-X':   makeRegion('soviet-X',   'soviet'),
    'neutral-fin': makeRegion('neutral-fin', 'finland'),
    'neutral-ukr': makeRegion('neutral-ukr', 'ukraine'),
    'enemy-wht':   makeRegion('enemy-wht',   'white'),
    'enemy-don':   makeRegion('enemy-don',   'don'),
  };

  const rels: Relationship[] = [
    { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
    { fromCountry: 'soviet', toCountry: 'don',   type: 'war' },
    // finland and ukraine have no relationship → neutral
  ];

  it('produces 3 theaters: one per neutral country, one combined war theater', () => {
    const theaters = detectTheaters(regs, adj, 'soviet', [], rels);
    expect(theaters).toHaveLength(3);

    const warTheater = theaters.find(t => t.enemyCountry === 'white' || t.enemyCountry === 'don');
    expect(warTheater).toBeDefined();

    const theaterEnemies = theaters.map(t => t.enemyCountry);
    expect(theaterEnemies).toContain('finland');
    expect(theaterEnemies).toContain('ukraine');
  });

  it('neutral countries each get their own theater', () => {
    const theaters = detectTheaters(regs, adj, 'soviet', [], rels);
    const finTheater = theaters.find(t => t.enemyCountry === 'finland');
    const ukrTheater = theaters.find(t => t.enemyCountry === 'ukraine');
    expect(finTheater).toBeDefined();
    expect(ukrTheater).toBeDefined();
    expect(finTheater?.id).not.toBe(ukrTheater?.id);
  });

  it('war enemies are grouped into one theater', () => {
    const theaters = detectTheaters(regs, adj, 'soviet', [], rels);
    const warTheaters = theaters.filter(
      t => t.enemyCountry === 'white' || t.enemyCountry === 'don'
    );
    expect(warTheaters).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// detectTheaters — non-contiguous frontline regions must not be merged
// ---------------------------------------------------------------------------

describe('detectTheaters — non-contiguous frontline split', () => {
  /**
   * Map layout:
   *
   *   [a(A)] -- [c1(C)] -- [c2(C)] -- [c3(C)] -- [b(B)]
   *
   * A owns a, B (puppet of A) owns b, C owns c1/c2/c3.
   * C is at war with A. c2 is NOT adjacent to any enemy → not a frontline region.
   * c1 and c3 are frontline but separated by non-frontline c2.
   * Expected: 2 separate theaters (one for c1, one for c3).
   */
  const adj: Adjacency = {
    'a':  ['c1'],
    'c1': ['a', 'c2'],
    'c2': ['c1', 'c3'],
    'c3': ['c2', 'b'],
    'b':  ['c3'],
  };

  const regs: RegionState = {
    'a':  makeRegion('a',  'A' as CountryId),
    'c1': makeRegion('c1', 'C' as CountryId),
    'c2': makeRegion('c2', 'C' as CountryId),
    'c3': makeRegion('c3', 'C' as CountryId),
    'b':  makeRegion('b',  'B' as CountryId),
  };

  const rels: Relationship[] = [
    { fromCountry: 'A' as CountryId, toCountry: 'B' as CountryId, type: 'autonomy' },
    { fromCountry: 'A' as CountryId, toCountry: 'C' as CountryId, type: 'war' },
  ];

  it('creates 2 theaters — one for c1, one for c3 — not merged through c2', () => {
    const theaters = detectTheaters(regs, adj, 'C' as CountryId, [], rels);
    expect(theaters).toHaveLength(2);
    const allFrontline = theaters.flatMap(t => t.frontlineRegions);
    expect(allFrontline).toContain('c1');
    expect(allFrontline).toContain('c3');
    expect(allFrontline).not.toContain('c2');
  });

  it('does not include non-frontline c2 in any theater', () => {
    const theaters = detectTheaters(regs, adj, 'C' as CountryId, [], rels);
    for (const t of theaters) {
      expect(t.frontlineRegions).not.toContain('c2');
    }
  });
});

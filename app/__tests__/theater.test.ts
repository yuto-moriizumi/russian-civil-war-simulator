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
  divs: Division[] = []
): Region {
  return { id, name: id, countryIso3: 'TST', owner, divisions: divs, value: 1 };
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

  it('creates no theater when relationships are empty (Iskolat is a neutral neighbor)', () => {
    // No relationship at all means neutral — should not trigger a theater
    const theaters = detectTheaters(regions, adjacency, 'soviet', [], []);
    expect(theaters).toHaveLength(0);
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

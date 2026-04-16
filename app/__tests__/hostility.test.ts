import { describe, it, expect } from 'vitest';
import { buildIsHostilePredicate } from '../utils/pathfinding';
import type { Adjacency, Region, RegionState, Relationship } from '../types/game';

function makeRegionSimple(id: string, owner: 'soviet' | 'white' | 'germany'): Region {
  return { id, name: id, countryIso3: 'TST', owner, divisions: [] };
}

describe('buildIsHostilePredicate', () => {
  const adjacency: Adjacency = {
    A: ['B'],
    B: ['A', 'C'],
    C: ['B', 'D'],
    D: ['C'],
  };

  it('returns false for regions with no war relationship (defend mode must not trigger)', () => {
    const regions: RegionState = {
      A: makeRegionSimple('A', 'soviet'),
      B: makeRegionSimple('B', 'soviet'),
      C: makeRegionSimple('C', 'white'),
    };

    const relationships: Relationship[] = [
      { fromCountry: 'white', toCountry: 'soviet', type: 'military_access' },
    ];

    const isHostile = buildIsHostilePredicate('soviet', regions, relationships);
    expect(isHostile('C')).toBe(false);
  });

  it('returns false for autonomy puppets without war', () => {
    const regions: RegionState = {
      A: makeRegionSimple('A', 'soviet'),
      B: makeRegionSimple('B', 'white'),
    };

    const relationships: Relationship[] = [
      { fromCountry: 'soviet', toCountry: 'white', type: 'autonomy' },
    ];

    const isHostile = buildIsHostilePredicate('soviet', regions, relationships);
    expect(isHostile('B')).toBe(false);
  });

  it('returns true when we declared war on the target country', () => {
    const regions: RegionState = {
      A: makeRegionSimple('A', 'soviet'),
      B: makeRegionSimple('B', 'white'),
    };

    const relationships: Relationship[] = [
      { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
    ];

    const isHostile = buildIsHostilePredicate('soviet', regions, relationships);
    expect(isHostile('B')).toBe(true);
  });

  it('returns true when the target country declared war on us', () => {
    const regions: RegionState = {
      A: makeRegionSimple('A', 'soviet'),
      B: makeRegionSimple('B', 'white'),
    };

    const relationships: Relationship[] = [
      { fromCountry: 'white', toCountry: 'soviet', type: 'war' },
    ];

    const isHostile = buildIsHostilePredicate('soviet', regions, relationships);
    expect(isHostile('B')).toBe(true);
  });

  it('regression: defend mode does not detect a hostile border without war', () => {
    const regions: RegionState = {
      A: makeRegionSimple('A', 'soviet'),
      B: makeRegionSimple('B', 'soviet'),
      C: makeRegionSimple('C', 'germany'),
    };

    const relationships: Relationship[] = [
      { fromCountry: 'germany', toCountry: 'soviet', type: 'military_access' },
    ];

    const isHostile = buildIsHostilePredicate('soviet', regions, relationships);
    const hasHostileNeighborForB = (adjacency.B ?? []).some(
      nId => regions[nId]?.owner !== 'soviet' && isHostile(nId)
    );

    expect(hasHostileNeighborForB).toBe(false);
  });
});

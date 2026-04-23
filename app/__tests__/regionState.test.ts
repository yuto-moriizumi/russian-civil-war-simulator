import { describe, expect, it } from 'vitest';
import type { RegionState } from '../types/game';
import {
  buildRegionUpdate,
  composeRegionState,
  createRegionStatePatch,
  extractRegionOwners,
} from '../utils/regionState';

describe('region state split helpers', () => {
  const regions: RegionState = {
    A: { id: 'A', name: 'Alpha', countryIso3: 'AAA', owner: 'soviet' },
    B: { id: 'B', name: 'Beta', countryIso3: 'BBB', owner: 'white' },
  };

  it('splits static region definitions from dynamic owners', () => {
    const patch = createRegionStatePatch(regions);

    expect(patch.regionDefinitions).toEqual({
      A: { id: 'A', name: 'Alpha', countryIso3: 'AAA' },
      B: { id: 'B', name: 'Beta', countryIso3: 'BBB' },
    });
    expect(patch.regionOwners).toEqual({
      A: 'soviet',
      B: 'white',
    });
  });

  it('can compose legacy RegionState from definitions and owners', () => {
    const patch = createRegionStatePatch(regions);
    const nextRegions = composeRegionState(
      patch.regionDefinitions,
      { ...patch.regionOwners, B: 'soviet' },
      regions
    );

    expect(nextRegions.B).toEqual({
      id: 'B',
      name: 'Beta',
      countryIso3: 'BBB',
      owner: 'soviet',
    });
  });

  it('buildRegionUpdate derives regions from regionOwners (not the reverse)', () => {
    const patch = createRegionStatePatch(regions);
    const newOwners = { A: 'white' as const, B: 'white' as const };

    const update = buildRegionUpdate(patch.regionDefinitions, newOwners);

    expect(update.regionOwners).toEqual(newOwners);
    expect(update.regions.A).toEqual({
      id: 'A',
      name: 'Alpha',
      countryIso3: 'AAA',
      owner: 'white',
    });
    expect(extractRegionOwners(update.regions)).toEqual(newOwners);
  });
});

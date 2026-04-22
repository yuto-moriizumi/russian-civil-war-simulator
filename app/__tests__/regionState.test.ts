import { describe, expect, it } from 'vitest';
import type { RegionState } from '../types/game';
import {
  composeRegionState,
  createRegionOwnersPatch,
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

  it('owner-only patches leave map definitions out of simulation updates', () => {
    const changed: RegionState = {
      ...regions,
      A: { ...regions.A, owner: 'white' },
    };

    expect(createRegionOwnersPatch(changed)).toEqual({
      regions: changed,
      regionOwners: {
        A: 'white',
        B: 'white',
      },
    });
    expect(extractRegionOwners(changed)).toEqual({
      A: 'white',
      B: 'white',
    });
  });
});

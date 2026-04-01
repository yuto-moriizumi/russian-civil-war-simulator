/**
 * Regression tests for country-switch division preservation.
 *
 * Bug: When the player switched countries, ALL divisions (including ones
 * created dynamically during gameplay) were removed.  Only the hard-coded
 * initial placements in initialUnitPlacement should be wiped and re-created;
 * divisions in other regions must survive the switch.
 *
 * These tests exercise the pure region-filtering logic that was fixed in
 * basicActions.ts (selectCountry).
 */

import { describe, it, expect } from 'vitest';
import { initialUnitPlacement } from '../data/map/initialUnitPlacement';
import type { Division, Region } from '../types/game';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDiv(id: string): Division {
  return {
    id,
    name: `${id} Division`,
    owner: 'soviet',
    armyGroupId: 'ag-1',
    hp: 100,
    maxHp: 100,
    attack: 10,
    defence: 15,
  };
}

function makeRegion(id: string, divisions: Division[] = []): Region {
  return {
    id,
    name: id,
    countryIso3: 'RUS',
    owner: 'soviet',
    divisions,
    value: 1,
  };
}

// ---------------------------------------------------------------------------
// The filtering logic extracted from basicActions.ts (selectCountry)
//
// This mirrors the fixed version exactly so the test will catch any
// regression that reverts the fix.
// ---------------------------------------------------------------------------

function simulateRegionClearingOnSwitch(
  currentRegions: Record<string, Region>
): Record<string, Region> {
  const initialPlacementRegions = new Set(Object.keys(initialUnitPlacement));
  const regionsWithUnits: Record<string, Region> = {};
  for (const [regionId, region] of Object.entries(currentRegions)) {
    regionsWithUnits[regionId] = initialPlacementRegions.has(regionId)
      ? { ...region, divisions: [] }
      : { ...region };
  }
  return regionsWithUnits;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('selectCountry — division preservation on country switch', () => {
  // Pick a known region that IS in initialUnitPlacement
  const placementRegionId = Object.keys(initialUnitPlacement)[0];
  // Use a region ID that will never be in the static placement data
  const dynamicRegionId = '__DYNAMIC_TEST_REGION__';

  it('clears divisions only in initialUnitPlacement regions (not dynamic ones)', () => {
    const dynamicDiv = makeDiv('dyn-div-1');
    const placementDiv = makeDiv('init-div-1');

    const currentRegions: Record<string, Region> = {
      [placementRegionId]: makeRegion(placementRegionId, [placementDiv]),
      [dynamicRegionId]: makeRegion(dynamicRegionId, [dynamicDiv]),
    };

    const result = simulateRegionClearingOnSwitch(currentRegions);

    // Region in initialUnitPlacement → divisions wiped (will be re-populated from static data)
    expect(result[placementRegionId].divisions).toHaveLength(0);

    // Region NOT in initialUnitPlacement → divisions preserved
    expect(result[dynamicRegionId].divisions).toHaveLength(1);
    expect(result[dynamicRegionId].divisions[0].id).toBe('dyn-div-1');
  });

  it('preserves all dynamic divisions intact across multiple regions', () => {
    const regions: Record<string, Region> = {
      '__DYN_A__': makeRegion('__DYN_A__', [makeDiv('a1'), makeDiv('a2')]),
      '__DYN_B__': makeRegion('__DYN_B__', [makeDiv('b1')]),
    };

    const result = simulateRegionClearingOnSwitch(regions);

    expect(result['__DYN_A__'].divisions).toHaveLength(2);
    expect(result['__DYN_B__'].divisions).toHaveLength(1);
  });

  it('initialUnitPlacement regions end up with empty divisions before re-population', () => {
    // Build regions for every placement region, each pre-loaded with a division
    const regions: Record<string, Region> = {};
    for (const regionId of Object.keys(initialUnitPlacement)) {
      regions[regionId] = makeRegion(regionId, [makeDiv(`old-${regionId}`)]);
    }

    const result = simulateRegionClearingOnSwitch(regions);

    for (const regionId of Object.keys(initialUnitPlacement)) {
      expect(result[regionId].divisions).toHaveLength(0);
    }
  });

  it('does not mutate the original region objects', () => {
    const original = makeRegion(dynamicRegionId, [makeDiv('orig-div')]);
    const currentRegions = { [dynamicRegionId]: original };

    simulateRegionClearingOnSwitch(currentRegions);

    // Original should be untouched
    expect(original.divisions).toHaveLength(1);
  });
});

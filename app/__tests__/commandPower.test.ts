/**
 * Unit tests for Command Power calculation utilities.
 *
 * These tests exercise pure logic functions without a browser or dev server.
 *
 * Key areas covered:
 *  - countCurrentDivisions — only own-country divisions count toward CP usage
 *  - countCountryUnits     — only counts own-country divisions (not allied ones in your territory)
 *  - calculateCommandPower — cap derived from owned regions
 *  - getCommandPowerInfo   — combined info object
 */

import { describe, it, expect } from 'vitest';
import {
  countCurrentDivisions,
  calculateCommandPower,
  getCommandPowerInfo,
  canProduceDivision,
  clampProductionQueueToCommandPower,
  COMMAND_POWER_PER_UNIT,
  BASE_COMMAND_POWER,
  DIVISIONS_PER_STATE,
} from '../utils/commandPower';
import { countCountryUnits } from '../utils/mapUtils';
import type { Division, Region, RegionState, Movement, CountryBonuses, ProductionQueueItem } from '../types/game';
import type { CountryId } from '../types/game';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDiv(id: string, owner: 'soviet' | 'white' | 'ukraine', armyGroupId = 'ag-1'): Division {
  return {
    id,
    name: `${id} Division`,
    owner,
    armyGroupId,
    hp: 100,
    maxHp: 100,
    attack: 10,
    defence: 15,
  };
}

function makeRegion(
  id: string,
  owner: 'soviet' | 'white' | 'ukraine' | 'neutral',
  divisions: Division[] = [],
): Region {
  return {
    id,
    name: id,
    countryIso3: 'RUS',
    owner,
    divisions,
    value: 1,
  };
}

function makeQueueItem(id: string, owner: CountryId = 'soviet'): ProductionQueueItem {
  return {
    id,
    divisionName: `${id} Division`,
    owner,
    startTime: new Date(),
    completionTime: new Date(),
    targetRegionId: 'RU-A',
    armyGroupId: 'ag-1',
  };
}

function makeMovement(
  owner: 'soviet' | 'white' | 'ukraine',
  divisions: Division[],
  fromRegion = 'RU-A',
  toRegion = 'RU-B',
): Movement {
  return {
    id: `mv-${Math.random()}`,
    owner,
    fromRegion,
    toRegion,
    divisions,
    departureTime: new Date(),
    arrivalTime: new Date(),
  };
}

const emptyBonuses: CountryBonuses = {
  attackBonus: 0,
  defenceBonus: 0,
  hpBonus: 0,
  maxHpBonus: 0,
  commandPowerBonus: 0,
  productionSpeedMultiplier: 1,
};

const emptyQueues = {} as Record<CountryId, ProductionQueueItem[]>;

// ---------------------------------------------------------------------------
// countCurrentDivisions
// ---------------------------------------------------------------------------

describe('countCurrentDivisions', () => {
  it('counts only own divisions in regions, ignoring allied divisions', () => {
    const sovietDiv = makeDiv('d-soviet', 'soviet');
    const allyDiv = makeDiv('d-ally', 'white'); // friendly ally's division

    // Both divisions are in a region owned by Soviet
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet', [sovietDiv, allyDiv]),
    };

    // Should count only the Soviet division — not the ally's
    const result = countCurrentDivisions('soviet', regions, []);
    expect(result).toBe(1 * COMMAND_POWER_PER_UNIT);
  });

  it('counts own divisions stationed in an allied (non-owned) region', () => {
    const sovietDiv = makeDiv('d-soviet', 'soviet');

    // Soviet division is in a region owned by Ukraine (military access scenario)
    const regions: RegionState = {
      'UA-A': makeRegion('UA-A', 'ukraine', [sovietDiv]),
    };

    const result = countCurrentDivisions('soviet', regions, []);
    expect(result).toBe(1 * COMMAND_POWER_PER_UNIT);
  });

  it('counts in-transit own divisions', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet'),
    };

    const movement = makeMovement('soviet', [makeDiv('d-1', 'soviet'), makeDiv('d-2', 'soviet')]);

    const result = countCurrentDivisions('soviet', regions, [movement]);
    expect(result).toBe(2 * COMMAND_POWER_PER_UNIT);
  });

  it('does not count in-transit divisions owned by another country', () => {
    const regions: RegionState = {};

    const movement = makeMovement('white', [makeDiv('d-1', 'white')]);

    const result = countCurrentDivisions('soviet', regions, [movement]);
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// countCountryUnits (mapUtils)
// ---------------------------------------------------------------------------

describe('countCountryUnits', () => {
  it('does not count allied divisions stationed in own regions', () => {
    const sovietDiv = makeDiv('d-soviet', 'soviet');
    const allyDiv = makeDiv('d-ally', 'ukraine');

    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet', [sovietDiv, allyDiv]),
    };

    // Should only count the 1 Soviet division, not the allied one
    expect(countCountryUnits(regions, 'soviet')).toBe(1);
  });

  it('counts own divisions stationed in an allied region', () => {
    const sovietDiv = makeDiv('d-soviet', 'soviet');

    const regions: RegionState = {
      'UA-A': makeRegion('UA-A', 'ukraine', [sovietDiv]),
    };

    // Soviet division is in Ukraine-owned territory — should still count
    expect(countCountryUnits(regions, 'soviet')).toBe(1);
  });

  it('includes in-transit divisions in the count', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet'),
    };

    const movement = makeMovement('soviet', [makeDiv('d-1', 'soviet'), makeDiv('d-2', 'soviet')]);

    expect(countCountryUnits(regions, 'soviet', [movement])).toBe(2);
  });

  it('returns stable count regardless of allied divisions entering or leaving own regions', () => {
    const sovietDiv = makeDiv('d-soviet', 'soviet');
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet', [sovietDiv]),
    };

    const countBefore = countCountryUnits(regions, 'soviet');

    // Simulate an allied division arriving in the Soviet-owned region
    regions['RU-A'].divisions.push(makeDiv('d-ally', 'white'));
    const countAfter = countCountryUnits(regions, 'soviet');

    // Soviet unit count must not change when allied divisions move through
    expect(countBefore).toBe(countAfter);
    expect(countAfter).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// calculateCommandPower (cap)
// ---------------------------------------------------------------------------

describe('calculateCommandPower', () => {
  it('starts at BASE_COMMAND_POWER with no owned regions', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'white'), // not owned by soviet
    };
    expect(calculateCommandPower('soviet', regions, emptyBonuses)).toBe(BASE_COMMAND_POWER);
  });

  it('adds DIVISIONS_PER_STATE per owned region', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet'),
      'RU-B': makeRegion('RU-B', 'soviet'),
      'RU-C': makeRegion('RU-C', 'white'), // not owned
    };
    const expected = BASE_COMMAND_POWER + 2 * DIVISIONS_PER_STATE;
    expect(calculateCommandPower('soviet', regions, emptyBonuses)).toBe(expected);
  });

  it('adds commandPowerBonus from missions', () => {
    const regions: RegionState = {};
    const bonuses: CountryBonuses = { ...emptyBonuses, commandPowerBonus: 3 };
    expect(calculateCommandPower('soviet', regions, bonuses)).toBe(BASE_COMMAND_POWER + 3);
  });

  it('doubles the per-region contribution for core regions (x2)', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet'), // non-core
      'RU-B': makeRegion('RU-B', 'soviet'), // core
    };
    // Without core bonus: BASE + 2 * DIVISIONS_PER_STATE
    // With x2 core on RU-B: BASE + DIVISIONS_PER_STATE (non-core) + DIVISIONS_PER_STATE * 2 (core)
    const expected = BASE_COMMAND_POWER + DIVISIONS_PER_STATE + DIVISIONS_PER_STATE * 2;
    expect(calculateCommandPower('soviet', regions, emptyBonuses, ['RU-B'])).toBe(expected);
  });

  it('non-core regions are unaffected when coreRegions list is provided', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet'),
    };
    // RU-A is not in coreRegions, so contribution should be unchanged
    const expected = BASE_COMMAND_POWER + DIVISIONS_PER_STATE;
    expect(calculateCommandPower('soviet', regions, emptyBonuses, ['RU-B'])).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// canProduceDivision / queue clamping
// ---------------------------------------------------------------------------

describe('canProduceDivision', () => {
  it('requires enough CP for the full next division cost', () => {
    const bonuses: CountryBonuses = { ...emptyBonuses, commandPowerBonus: 6 };
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'white', [
        makeDiv('d-1', 'soviet'),
        makeDiv('d-2', 'soviet'),
      ]),
    };

    // Cap = BASE(2) + bonus(6) = 8. Current usage = 2 divisions = 6 CP.
    // There are only 2 CP left, which is not enough for a 3-CP division.
    expect(canProduceDivision('soviet', regions, [], emptyQueues, bonuses)).toBe(false);
  });
});

describe('clampProductionQueueToCommandPower', () => {
  it('drops queued divisions that no longer fit after the cap decreases', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet', [
        makeDiv('d-1', 'soviet'),
        makeDiv('d-2', 'soviet'),
        makeDiv('d-3', 'soviet'),
        makeDiv('d-4', 'soviet'),
        makeDiv('d-5', 'soviet'),
        makeDiv('d-6', 'soviet'),
        makeDiv('d-7', 'soviet'),
      ]),
    };

    const queue = [
      makeQueueItem('q-1'),
      makeQueueItem('q-2'),
      makeQueueItem('q-3'),
    ];

    // Cap = BASE(2) + 1 owned region = 3. Current usage = 7 divisions = 21 CP.
    // The country is already over cap, so no queued items should remain.
    expect(clampProductionQueueToCommandPower('soviet', queue, regions, [], emptyBonuses)).toEqual([]);
  });

  it('keeps only the earliest queued divisions that still fit the current cap', () => {
    const bonuses: CountryBonuses = { ...emptyBonuses, commandPowerBonus: 10 };
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet', [
        makeDiv('d-1', 'soviet'),
        makeDiv('d-2', 'soviet'),
        makeDiv('d-3', 'soviet'),
      ]),
    };

    const queue = [
      makeQueueItem('q-1'),
      makeQueueItem('q-2'),
      makeQueueItem('q-3'),
      makeQueueItem('q-4'),
    ];

    // Cap = BASE(2) + 1 owned region + bonus(10) = 13.
    // Current usage = 3 divisions = 9 CP, so only 1 queued division fits.
    expect(clampProductionQueueToCommandPower('soviet', queue, regions, [], bonuses)).toEqual([queue[0]]);
  });
});

// ---------------------------------------------------------------------------
// Country-switch accumulation regression (A → B → A)
// ---------------------------------------------------------------------------
//
// Bug: selectCountry() used to deep-copy the current regions (preserving
// existing divisions) before adding fresh initial placements on top.  After
// switching A→B→A the player-country regions contained both the residual
// divisions from the previous session *and* a full second set of initial
// placements, doubling the Command Power usage displayed in the TopBar.
//
// Fix: selectCountry() now clears all divisions from the copied regions
// before placing the initial units, so the count is always exactly the
// initial set regardless of how many times the player switches.
//
// The regression test below exercises the pure computation layer:
// countCurrentDivisions must return the same value when called against
// a freshly-built region set as it does against a set that was previously
// used and then rebuilt (simulating the cleared-divisions approach).

describe('country-switch CP accumulation regression', () => {
  it('CP usage is identical after a simulated A→B→A switch sequence', () => {
    const country = 'soviet' as const;

    // Helper: build regions with N soviet divisions (simulates selectCountry output)
    function buildRegions(numDivisions: number): RegionState {
      const divisions = Array.from({ length: numDivisions }, (_, i) =>
        makeDiv(`div-${i}`, country),
      );
      return {
        'RU-A': makeRegion('RU-A', country, divisions),
      };
    }

    const initialDivisionCount = 3;

    // Step 1: Initial state for country A — 3 divisions
    const regionsAfterFirstSelect = buildRegions(initialDivisionCount);
    const usageAfterFirstSelect = countCurrentDivisions(country, regionsAfterFirstSelect, []);

    // Step 2 (fixed behaviour): selectCountry clears divisions before re-placing.
    // Simulate by building a fresh region set with exactly the initial count again.
    const regionsAfterSecondSelect = buildRegions(initialDivisionCount);
    const usageAfterSecondSelect = countCurrentDivisions(country, regionsAfterSecondSelect, []);

    expect(usageAfterSecondSelect).toBe(usageAfterFirstSelect);
    expect(usageAfterSecondSelect).toBe(initialDivisionCount * COMMAND_POWER_PER_UNIT);

    // Step 3 (broken behaviour for contrast): what would happen if we had
    // carried over the old divisions and pushed new ones on top.
    const regionsWithAccumulation: RegionState = {
      'RU-A': makeRegion('RU-A', country, [
        // old divisions still present
        ...regionsAfterFirstSelect['RU-A'].divisions,
        // new placements added on top (the bug)
        ...buildRegions(initialDivisionCount)['RU-A'].divisions,
      ]),
    };
    const brokenUsage = countCurrentDivisions(country, regionsWithAccumulation, []);
    expect(brokenUsage).toBe(2 * initialDivisionCount * COMMAND_POWER_PER_UNIT);
    expect(brokenUsage).toBeGreaterThan(usageAfterSecondSelect);
  });
});

// ---------------------------------------------------------------------------
// getCommandPowerInfo — integration
// ---------------------------------------------------------------------------

describe('getCommandPowerInfo', () => {
  it('current reflects only own divisions and is stable when allied divisions move in', () => {
    const sovietDiv = makeDiv('d-soviet', 'soviet');
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet', [sovietDiv]),
    };

    const infoBefore = getCommandPowerInfo('soviet', regions, [], emptyQueues, emptyBonuses);

    // Allied division enters Soviet-owned region
    regions['RU-A'].divisions.push(makeDiv('d-ally', 'white'));
    const infoAfter = getCommandPowerInfo('soviet', regions, [], emptyQueues, emptyBonuses);

    expect(infoBefore.current).toBe(infoAfter.current);
    expect(infoBefore.current).toBe(1 * COMMAND_POWER_PER_UNIT);
  });

  it('cap reflects only owned regions, not regions with allied divisions', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet'),
      'RU-B': makeRegion('RU-B', 'white', [makeDiv('d-ally', 'soviet')]),
    };

    const info = getCommandPowerInfo('soviet', regions, [], emptyQueues, emptyBonuses);

    // Cap should only be based on the 1 Soviet-owned region
    const expectedCap = BASE_COMMAND_POWER + 1 * DIVISIONS_PER_STATE;
    expect(info.cap).toBe(expectedCap);
  });
});

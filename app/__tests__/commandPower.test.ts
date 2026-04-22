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
import type { Division, DivisionState, Region, RegionState, Movement, CountryBonuses, ProductionQueueItem } from '../types/game';
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
    regionId: null,
  };
}

function makeRegion(
  id: string,
  owner: 'soviet' | 'white' | 'ukraine' | 'neutral',
): Region {
  return {
    id,
    name: id,
    countryIso3: 'RUS',
    owner,
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
  divisionIds: string[],
  fromRegion = 'RU-A',
  toRegion = 'RU-B',
): Movement {
  return {
    id: `mv-${Math.random()}`,
    owner,
    fromRegion,
    toRegion,
    divisions: divisionIds.map(id => makeDiv(id, owner)),
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
  it('counts only own divisions, ignoring allied divisions', () => {
    const sovietDiv = makeDiv('d-soviet', 'soviet');
    const allyDiv = makeDiv('d-ally', 'white'); // friendly ally's division
    const divisions: DivisionState = { 'd-soviet': sovietDiv, 'd-ally': allyDiv };

    const result = countCurrentDivisions('soviet', divisions, []);
    expect(result).toBe(1 * COMMAND_POWER_PER_UNIT);
  });

  it('counts own divisions stationed anywhere', () => {
    const sovietDiv = makeDiv('d-soviet', 'soviet');
    const divisions: DivisionState = { 'd-soviet': sovietDiv };

    const result = countCurrentDivisions('soviet', divisions, []);
    expect(result).toBe(1 * COMMAND_POWER_PER_UNIT);
  });

  it('counts in-transit own divisions', () => {
    const d1 = makeDiv('d-1', 'soviet');
    const d2 = makeDiv('d-2', 'soviet');
    const divisions: DivisionState = { 'd-1': d1, 'd-2': d2 };

    const movement = makeMovement('soviet', ['d-1', 'd-2']);

    const result = countCurrentDivisions('soviet', divisions, [movement]);
    expect(result).toBe(2 * COMMAND_POWER_PER_UNIT);
  });

  it('does not count in-transit divisions owned by another country', () => {
    const divisions: DivisionState = {};
    const movement = makeMovement('white', ['d-1']);

    const result = countCurrentDivisions('soviet', divisions, [movement]);
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// countCountryUnits (mapUtils)
// ---------------------------------------------------------------------------

describe('countCountryUnits', () => {
  it('does not count allied divisions', () => {
    const sovietDiv = makeDiv('d-soviet', 'soviet');
    const allyDiv = makeDiv('d-ally', 'ukraine');
    const divisions: DivisionState = { 'd-soviet': sovietDiv, 'd-ally': allyDiv };

    expect(countCountryUnits(divisions, 'soviet')).toBe(1);
  });

  it('counts own divisions stationed anywhere', () => {
    const sovietDiv = makeDiv('d-soviet', 'soviet');
    const divisions: DivisionState = { 'd-soviet': sovietDiv };

    expect(countCountryUnits(divisions, 'soviet')).toBe(1);
  });

  it('returns stable count regardless of allied divisions', () => {
    const sovietDiv = makeDiv('d-soviet', 'soviet');
    const divisions: DivisionState = { 'd-soviet': sovietDiv };

    const countBefore = countCountryUnits(divisions, 'soviet');

    // Add an allied division to the state
    divisions['d-ally'] = makeDiv('d-ally', 'white');
    const countAfter = countCountryUnits(divisions, 'soviet');

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
      'RU-A': makeRegion('RU-A', 'white'),
    };
    expect(calculateCommandPower('soviet', regions, emptyBonuses)).toBe(BASE_COMMAND_POWER);
  });

  it('adds DIVISIONS_PER_STATE per owned region', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet'),
      'RU-B': makeRegion('RU-B', 'soviet'),
      'RU-C': makeRegion('RU-C', 'white'),
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
      'RU-A': makeRegion('RU-A', 'soviet'),
      'RU-B': makeRegion('RU-B', 'soviet'),
    };
    const expected = BASE_COMMAND_POWER + DIVISIONS_PER_STATE + DIVISIONS_PER_STATE * 2;
    expect(calculateCommandPower('soviet', regions, emptyBonuses, ['RU-B'])).toBe(expected);
  });

  it('non-core regions are unaffected when coreRegions list is provided', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet'),
    };
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
    const divisions: DivisionState = {
      'd-1': makeDiv('d-1', 'soviet'),
      'd-2': makeDiv('d-2', 'soviet'),
    };
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'white'),
    };

    expect(canProduceDivision('soviet', divisions, regions, [], emptyQueues, bonuses)).toBe(false);
  });
});

describe('clampProductionQueueToCommandPower', () => {
  it('drops queued divisions that no longer fit after the cap decreases', () => {
    const divisions: DivisionState = {};
    for (let i = 1; i <= 7; i++) {
      divisions[`d-${i}`] = makeDiv(`d-${i}`, 'soviet');
    }
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet'),
    };

    const queue = [
      makeQueueItem('q-1'),
      makeQueueItem('q-2'),
      makeQueueItem('q-3'),
    ];

    expect(clampProductionQueueToCommandPower('soviet', queue, divisions, regions, [], emptyBonuses)).toEqual([]);
  });

  it('keeps only the earliest queued divisions that still fit the current cap', () => {
    const bonuses: CountryBonuses = { ...emptyBonuses, commandPowerBonus: 10 };
    const divisions: DivisionState = {
      'd-1': makeDiv('d-1', 'soviet'),
      'd-2': makeDiv('d-2', 'soviet'),
      'd-3': makeDiv('d-3', 'soviet'),
    };
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet'),
    };

    const queue = [
      makeQueueItem('q-1'),
      makeQueueItem('q-2'),
      makeQueueItem('q-3'),
      makeQueueItem('q-4'),
    ];

    expect(clampProductionQueueToCommandPower('soviet', queue, divisions, regions, [], bonuses)).toEqual([]);
  });

  it('keeps only the earliest queued division when exactly one queued item still fits', () => {
    const divisions: DivisionState = {
      'd-1': makeDiv('d-1', 'soviet'),
      'd-2': makeDiv('d-2', 'soviet'),
    };
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet'),
    };

    const queue = [
      makeQueueItem('q-1'),
      makeQueueItem('q-2'),
      makeQueueItem('q-3'),
    ];

    const bonuses: CountryBonuses = { ...emptyBonuses, commandPowerBonus: 9 };

    expect(clampProductionQueueToCommandPower('soviet', queue, divisions, regions, [], bonuses)).toEqual([queue[0]]);
  });
});

// ---------------------------------------------------------------------------
// Country-switch accumulation regression (A → B → A)
// ---------------------------------------------------------------------------

describe('country-switch CP accumulation regression', () => {
  it('CP usage is identical after a simulated A→B→A switch sequence', () => {
    const country = 'soviet' as const;

    function buildDivisions(numDivisions: number, prefix = 'div'): DivisionState {
      const result: DivisionState = {};
      for (let i = 0; i < numDivisions; i++) {
        result[`${prefix}-${i}`] = makeDiv(`${prefix}-${i}`, country);
      }
      return result;
    }

    const initialDivisionCount = 3;

    const divisionsAfterFirstSelect = buildDivisions(initialDivisionCount);
    const usageAfterFirstSelect = countCurrentDivisions(country, divisionsAfterFirstSelect, []);

    const divisionsAfterSecondSelect = buildDivisions(initialDivisionCount);
    const usageAfterSecondSelect = countCurrentDivisions(country, divisionsAfterSecondSelect, []);

    expect(usageAfterSecondSelect).toBe(usageAfterFirstSelect);
    expect(usageAfterSecondSelect).toBe(initialDivisionCount * COMMAND_POWER_PER_UNIT);

    // Broken behaviour: accumulating divisions with unique IDs (simulating the old bug
    // where both sets of divisions were kept instead of overwritten).
    const accumulatedDivisions: DivisionState = {
      ...divisionsAfterFirstSelect,
      ...buildDivisions(initialDivisionCount, 'dup'),
    };
    const brokenUsage = countCurrentDivisions(country, accumulatedDivisions, []);
    expect(brokenUsage).toBe(2 * initialDivisionCount * COMMAND_POWER_PER_UNIT);
    expect(brokenUsage).toBeGreaterThan(usageAfterSecondSelect);
  });
});

// ---------------------------------------------------------------------------
// getCommandPowerInfo — integration
// ---------------------------------------------------------------------------

describe('getCommandPowerInfo', () => {
  it('current reflects only own divisions and is stable when allied divisions are added', () => {
    const sovietDiv = makeDiv('d-soviet', 'soviet');
    const divisions: DivisionState = { 'd-soviet': sovietDiv };
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet'),
    };

    const infoBefore = getCommandPowerInfo('soviet', divisions, regions, [], emptyQueues, emptyBonuses);

    // Add allied division to state
    divisions['d-ally'] = makeDiv('d-ally', 'white');
    const infoAfter = getCommandPowerInfo('soviet', divisions, regions, [], emptyQueues, emptyBonuses);

    expect(infoBefore.current).toBe(infoAfter.current);
    expect(infoBefore.current).toBe(1 * COMMAND_POWER_PER_UNIT);
  });

  it('cap reflects only owned regions, not regions with allied divisions', () => {
    const divisions: DivisionState = {
      'd-ally': makeDiv('d-ally', 'soviet'),
    };
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', 'soviet'),
      'RU-B': makeRegion('RU-B', 'white'),
    };

    const info = getCommandPowerInfo('soviet', divisions, regions, [], emptyQueues, emptyBonuses);

    const expectedCap = BASE_COMMAND_POWER + 1 * DIVISIONS_PER_STATE;
    expect(info.cap).toBe(expectedCap);
  });
});

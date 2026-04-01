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

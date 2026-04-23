import { describe, expect, it } from 'vitest';
import { syncArmyGroupTerritories } from '../domain/game/logic/armyGroupSync';
import type { ArmyGroup, Division, DivisionState, Movement, RegionState } from '../types/game';

function makeGroup(overrides: Partial<ArmyGroup> = {}): ArmyGroup {
  return {
    id: 'ag-1',
    name: 'Red Army',
    regionIds: ['HOME'],
    color: '#f00',
    owner: 'soviet',
    theaterId: null,
    mode: 'none',
    ...overrides,
  };
}

function makeDivision(overrides: Partial<Division> = {}): Division {
  return {
    id: 'div-1',
    name: '1st',
    owner: 'soviet',
    armyGroupId: 'ag-1',
    hp: 100,
    maxHp: 100,
    attack: 10,
    defence: 10,
    regionId: 'HOME',
    ...overrides,
  };
}

describe('syncArmyGroupTerritories', () => {
  it('does not treat foreign regions with stationed divisions as army group territory', () => {
    const armyGroups = [makeGroup()];
    const regions: RegionState = {
      HOME: { id: 'HOME', name: 'Home', countryIso3: 'RUS', owner: 'soviet' },
      ACCESS: { id: 'ACCESS', name: 'Access', countryIso3: 'DON', owner: 'don' as never },
    };
    const divisions: DivisionState = {
      'div-1': makeDivision({ regionId: 'ACCESS' }),
    };

    const result = syncArmyGroupTerritories(armyGroups, regions, [], divisions);

    expect(result[0].regionIds).toEqual(['HOME']);
  });

  it('does not treat retreat destinations in foreign territory as army group territory while in transit', () => {
    const armyGroups = [makeGroup()];
    const regions: RegionState = {
      HOME: { id: 'HOME', name: 'Home', countryIso3: 'RUS', owner: 'soviet' },
      ACCESS: { id: 'ACCESS', name: 'Access', countryIso3: 'DON', owner: 'don' as never },
    };
    const divisions: DivisionState = {
      'div-1': makeDivision({ regionId: null }),
    };
    const movingUnits: Movement[] = [{
      id: 'retreat-1',
      fromRegion: 'FRONT',
      toRegion: 'ACCESS',
      divisionIds: ['div-1'],
      departureTime: new Date('1918-01-01T00:00:00Z'),
      arrivalTime: new Date('1918-01-01T06:00:00Z'),
      owner: 'soviet',
      isRetreat: true,
    }];

    const result = syncArmyGroupTerritories(armyGroups, regions, movingUnits, divisions);

    expect(result[0].regionIds).toEqual(['HOME']);
  });
});

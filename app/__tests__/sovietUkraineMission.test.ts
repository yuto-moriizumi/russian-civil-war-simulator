import { describe, expect, it } from 'vitest';
import { sovietMissions } from '../data/missions/russia';
import { areMissionConditionsMet } from '../domain/game/missionHelpers';
import type { RegionState } from '../types/game';

describe('Soviet Ukraine export mission', () => {
  it('requires control of at least two Ukrainian Soviet core regions by Soviet Russia or its puppets', () => {
    const mission = sovietMissions.find(m => m.id === 'soviet_capture_kharkiv');

    expect(mission).toMatchObject({
      country: 'soviet',
      name: 'ウクライナへの革命の輸出',
      prerequisites: ['soviet_mobilize'],
      rewards: {
        liberatePuppet: {
          country: 'ukrainesoviet',
          spawnRegionId: 'UA-63',
          divisions: 3,
        },
      },
      available: [
        { type: 'controlCoreRegionCountByOverlord', country: 'ukrainesoviet', count: 2 },
      ],
    });
  });

  it('accepts Ukrainian Soviet core region control shared between Soviet Russia and its puppet', () => {
    const mission = sovietMissions.find(m => m.id === 'soviet_capture_kharkiv')!;
    const regions: RegionState = {
      'UA-63': {
        id: 'UA-63',
        name: 'Kharkiv',
        countryIso3: 'UKR',
        owner: 'soviet',
      },
      'UA-65': {
        id: 'UA-65',
        name: 'Kherson',
        countryIso3: 'UKR',
        owner: 'dkr',
      },
    };

    expect(areMissionConditionsMet(mission, {
      regions,
      dateTime: new Date('1918-01-01T00:00:00Z'),
      gameEvents: [],
      countryId: 'soviet',
      theaters: [],
      armyGroups: [],
      relationships: [
        { fromCountry: 'soviet', toCountry: 'dkr', type: 'autonomy' },
      ],
    })).toBe(true);
  });

  it('stays incomplete with only one Ukrainian Soviet core region under Soviet control', () => {
    const mission = sovietMissions.find(m => m.id === 'soviet_capture_kharkiv')!;
    const regions: RegionState = {
      'UA-63': {
        id: 'UA-63',
        name: 'Kharkiv',
        countryIso3: 'UKR',
        owner: 'soviet',
      },
      'UA-65': {
        id: 'UA-65',
        name: 'Kherson',
        countryIso3: 'UKR',
        owner: 'ukraine',
      },
    };

    expect(areMissionConditionsMet(mission, {
      regions,
      dateTime: new Date('1918-01-01T00:00:00Z'),
      gameEvents: [],
      countryId: 'soviet',
      theaters: [],
      armyGroups: [],
      relationships: [],
    })).toBe(false);
  });
});

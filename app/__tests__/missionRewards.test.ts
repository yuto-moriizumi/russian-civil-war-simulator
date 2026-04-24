import { describe, expect, it } from 'vitest';
import { sovietMissions } from '../data/missions/russia';
import { initialGameState } from '../store/game/initialState';
import { applyClaimedMissionRewards, buildMissionRewardDescription } from '../domain/game/missionRewards';
import { areMissionConditionsMet } from '../domain/game/missionHelpers';
import type { Mission, RegionState } from '../types/game';

describe('Soviet Don Army preparation mission', () => {
  it('is unlocked after Workers Unite and requires Soviet or puppet control of Voronezh and UA-09', () => {
    const mission = sovietMissions.find(m => m.id === 'soviet_secure_voronezh');

    expect(mission).toMatchObject({
      country: 'soviet',
      name: 'ドン軍制圧の準備',
      prerequisites: ['soviet_mobilize'],
      rewards: { declareWar: { target: 'don' } },
      available: [
        { type: 'controlRegionByOverlord', regionId: 'RU-VOR' },
        { type: 'controlRegionByOverlord', regionId: 'UA-09' },
      ],
    });
  });

  it('accepts Voronezh and UA-09 control by Soviet puppets', () => {
    const mission = sovietMissions.find(m => m.id === 'soviet_secure_voronezh')!;
    const regions: RegionState = {
      'RU-VOR': {
        id: 'RU-VOR',
        name: 'Voronezh',
        countryIso3: 'RUS',
        owner: 'ukrainesoviet',
      },
      'UA-09': {
        id: 'UA-09',
        name: 'Donbass',
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
        { fromCountry: 'soviet', toCountry: 'ukrainesoviet', type: 'autonomy' },
        { fromCountry: 'soviet', toCountry: 'dkr', type: 'autonomy' },
      ],
    })).toBe(true);
  });

  it('is incomplete without control of UA-09', () => {
    const mission = sovietMissions.find(m => m.id === 'soviet_secure_voronezh')!;
    const regions: RegionState = {
      'RU-VOR': {
        id: 'RU-VOR',
        name: 'Voronezh',
        countryIso3: 'RUS',
        owner: 'soviet',
      },
      'UA-09': {
        id: 'UA-09',
        name: 'Donbass',
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

describe('Soviet Kherson mission', () => {
  it('sits between Kharkiv and Taurida and requires Soviet or puppet control of UA-65', () => {
    const mission = sovietMissions.find(m => m.id === 'soviet_secure_kherson');
    const tauridaMission = sovietMissions.find(m => m.id === 'soviet_taurida');

    expect(mission).toMatchObject({
      country: 'soviet',
      name: 'ヘルソンの確保',
      prerequisites: ['soviet_capture_kharkiv'],
      rewards: { declareWar: { target: 'crimea' } },
      available: [
        { type: 'controlRegionByOverlord', regionId: 'UA-65' },
      ],
    });
    expect(tauridaMission?.prerequisites).toEqual(['soviet_secure_kherson']);
  });

  it('accepts UA-65 control by a Soviet puppet', () => {
    const mission = sovietMissions.find(m => m.id === 'soviet_secure_kherson')!;
    const regions: RegionState = {
      'UA-65': {
        id: 'UA-65',
        name: 'Kherson',
        countryIso3: 'UKR',
        owner: 'ukrainesoviet',
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
        { fromCountry: 'soviet', toCountry: 'ukrainesoviet', type: 'autonomy' },
      ],
    })).toBe(true);
  });
});

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

describe('Soviet Don Army subjugation mission', () => {
  it('unlocks after securing Voronezh and requires Soviet or puppet control of Don regions', () => {
    const mission = sovietMissions.find(m => m.id === 'soviet_subjugate_don_army');

    expect(mission).toMatchObject({
      country: 'soviet',
      name: 'ドン軍の制圧',
      prerequisites: ['soviet_secure_voronezh'],
      rewards: {
        liberatePuppet: {
          country: 'donsoviets',
          spawnRegionId: 'RU-ROS',
          divisions: 2,
        },
      },
      available: [
        { type: 'controlRegionByOverlord', regionId: 'RU-ROS' },
        { type: 'controlRegionByOverlord', regionId: 'RU-VGG' },
      ],
    });
  });

  it('accepts Don region control split between Soviet Russia and its puppet', () => {
    const mission = sovietMissions.find(m => m.id === 'soviet_subjugate_don_army')!;
    const regions: RegionState = {
      'RU-ROS': {
        id: 'RU-ROS',
        name: 'Rostov',
        countryIso3: 'RUS',
        owner: 'soviet',
      },
      'RU-VGG': {
        id: 'RU-VGG',
        name: 'Volgograd',
        countryIso3: 'RUS',
        owner: 'ukrainesoviet',
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
        { fromCountry: 'soviet', toCountry: 'ukrainesoviet', type: 'autonomy' },
      ],
    })).toBe(true);
  });

  it('liberates the Don Soviet Republic as a Soviet puppet', () => {
    const mission = sovietMissions.find(m => m.id === 'soviet_subjugate_don_army')!;
    const regions: RegionState = {
      'RU-ROS': {
        id: 'RU-ROS',
        name: 'Rostov',
        countryIso3: 'RUS',
        owner: 'soviet',
      },
      'RU-VGG': {
        id: 'RU-VGG',
        name: 'Volgograd',
        countryIso3: 'RUS',
        owner: 'ukrainesoviet',
      },
    };

    const rewards = applyClaimedMissionRewards(
      {
        regions,
        movingUnits: [],
        relationships: [
          { fromCountry: 'soviet', toCountry: 'ukrainesoviet', type: 'autonomy' },
          { fromCountry: 'soviet', toCountry: 'don', type: 'war' },
          { fromCountry: 'don', toCountry: 'soviet', type: 'war' },
        ],
        armyGroups: [],
        aiStates: [],
        selectedCountry: null,
        countryBonuses: initialGameState.countryBonuses,
        dateTime: new Date('1918-01-01T00:00:00Z'),
      },
      { ...mission, completed: true, claimed: true },
      'soviet',
      [{ ...mission, completed: true, claimed: true }],
    );

    expect(rewards.updatedRelationships).toEqual(expect.arrayContaining([
      { fromCountry: 'soviet', toCountry: 'donsoviets', type: 'autonomy' },
      { fromCountry: 'donsoviets', toCountry: 'don', type: 'war' },
      { fromCountry: 'don', toCountry: 'donsoviets', type: 'war' },
    ]));
    expect(rewards.updatedRegions['RU-ROS'].owner).toBe('donsoviets');
    expect(rewards.updatedRegions['RU-VGG'].owner).toBe('donsoviets');
    expect(Object.values(rewards.updatedDivisions).filter(d => d.regionId === 'RU-ROS')).toHaveLength(2);
    expect(rewards.updatedAIStates.some(aiState => aiState.countryId === 'donsoviets')).toBe(true);
    expect(rewards.rewardEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'mission_claimed',
        country: 'soviet',
        title: 'Don Soviet Republic Liberated',
      }),
    ]));
  });
});

describe('Soviet Dagestan mission', () => {
  it('unlocks after subjugating the Don Army', () => {
    const mission = sovietMissions.find(m => m.id === 'soviet_dagestan');

    expect(mission).toMatchObject({
      country: 'soviet',
      name: 'ダゲスタンの確保',
      prerequisites: ['soviet_subjugate_don_army'],
      rewards: {
        liberatePuppet: {
          country: 'terek',
          spawnRegionId: 'RU-DA',
          divisions: 2,
        },
      },
      available: [{ type: 'controlRegionByOverlord', regionId: 'RU-DA' }],
    });
  });
});

describe('mission declare war rewards', () => {
  it('declares a mutual war and emits a war event when claimed', () => {
    const mission: Mission = {
      id: 'soviet_secure_voronezh',
      country: 'soviet',
      name: 'ドン軍制圧の準備',
      description: 'Secure Voronezh.',
      completed: true,
      claimed: true,
      rewards: { declareWar: { target: 'don' } },
      prerequisites: ['soviet_mobilize'],
      available: [
        { type: 'controlRegionByOverlord', regionId: 'RU-VOR' },
        { type: 'controlRegionByOverlord', regionId: 'UA-09' },
      ],
    };

    const rewards = applyClaimedMissionRewards(
      {
        regions: {},
        movingUnits: [],
        relationships: [],
        armyGroups: [],
        aiStates: [],
        selectedCountry: null,
        countryBonuses: initialGameState.countryBonuses,
        dateTime: new Date('1918-01-01T00:00:00Z'),
      },
      mission,
      'soviet',
      [mission],
    );

    expect(rewards.updatedRelationships).toEqual(expect.arrayContaining([
      { fromCountry: 'soviet', toCountry: 'don', type: 'war' },
      { fromCountry: 'don', toCountry: 'soviet', type: 'war' },
    ]));
    expect(rewards.rewardEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'war_declared',
        country: 'soviet',
        title: 'Soviet Russia declares war against Don Republic',
      }),
    ]));
  });

  it('pulls both sides and all puppets into the war when claimed', () => {
    const mission: Mission = {
      id: 'soviet_secure_voronezh',
      country: 'soviet',
      name: 'ドン軍制圧の準備',
      description: 'Secure Voronezh.',
      completed: true,
      claimed: true,
      rewards: { declareWar: { target: 'don' } },
      prerequisites: ['soviet_mobilize'],
      available: [
        { type: 'controlRegionByOverlord', regionId: 'RU-VOR' },
      ],
    };

    const rewards = applyClaimedMissionRewards(
      {
        regions: {},
        movingUnits: [],
        relationships: [
          { fromCountry: 'soviet', toCountry: 'ukrainesoviet', type: 'autonomy' },
          { fromCountry: 'don', toCountry: 'kuban', type: 'autonomy' },
        ],
        armyGroups: [],
        aiStates: [],
        selectedCountry: null,
        countryBonuses: initialGameState.countryBonuses,
        dateTime: new Date('1918-01-01T00:00:00Z'),
      },
      mission,
      'soviet',
      [mission],
    );

    expect(rewards.updatedRelationships).toEqual(expect.arrayContaining([
      { fromCountry: 'soviet', toCountry: 'don', type: 'war' },
      { fromCountry: 'don', toCountry: 'soviet', type: 'war' },
      { fromCountry: 'ukrainesoviet', toCountry: 'don', type: 'war' },
      { fromCountry: 'don', toCountry: 'ukrainesoviet', type: 'war' },
      { fromCountry: 'soviet', toCountry: 'kuban', type: 'war' },
      { fromCountry: 'kuban', toCountry: 'soviet', type: 'war' },
      { fromCountry: 'ukrainesoviet', toCountry: 'kuban', type: 'war' },
      { fromCountry: 'kuban', toCountry: 'ukrainesoviet', type: 'war' },
    ]));
  });

  it('describes declare war rewards in claim text', () => {
    expect(buildMissionRewardDescription({ declareWar: { target: 'don' } }))
      .toBe('Declare war on Don Republic');
  });

  it('describes puppet liberation rewards with country names', () => {
    expect(buildMissionRewardDescription({
      liberatePuppet: {
        country: 'donsoviets',
        spawnRegionId: 'RU-ROS',
        divisions: 2,
      },
    })).toBe('Liberate Don Soviet Republic as puppet');
  });
});

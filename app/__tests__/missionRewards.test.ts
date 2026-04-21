import { describe, expect, it } from 'vitest';
import { sovietMissions } from '../data/missions/russia';
import { initialGameState } from '../store/game/initialState';
import { applyClaimedMissionRewards, buildMissionRewardDescription } from '../store/game/missionRewards';
import { areMissionConditionsMet } from '../store/game/missionHelpers';
import type { Mission, RegionState } from '../types/game';

describe('Soviet Voronezh mission', () => {
  it('is unlocked after Workers Unite and requires Soviet or puppet control of Voronezh', () => {
    const mission = sovietMissions.find(m => m.id === 'soviet_secure_voronezh');

    expect(mission).toMatchObject({
      country: 'soviet',
      name: 'ヴォロネジの確保',
      prerequisites: ['soviet_mobilize'],
      rewards: { declareWar: { target: 'don' } },
      available: [{ type: 'controlRegionByOverlord', regionId: 'RU-VOR' }],
    });
  });

  it('accepts Voronezh control by a Soviet puppet', () => {
    const mission = sovietMissions.find(m => m.id === 'soviet_secure_voronezh')!;
    const regions: RegionState = {
      'RU-VOR': {
        id: 'RU-VOR',
        name: 'Voronezh',
        countryIso3: 'RUS',
        owner: 'ukrainesoviet',
        divisions: [],
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

describe('mission declare war rewards', () => {
  it('declares a mutual war and emits a war event when claimed', () => {
    const mission: Mission = {
      id: 'soviet_secure_voronezh',
      country: 'soviet',
      name: 'ヴォロネジの確保',
      description: 'Secure Voronezh.',
      completed: true,
      claimed: true,
      rewards: { declareWar: { target: 'don' } },
      prerequisites: ['soviet_mobilize'],
      available: [{ type: 'controlRegionByOverlord', regionId: 'RU-VOR' }],
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

  it('describes declare war rewards in claim text', () => {
    expect(buildMissionRewardDescription({ declareWar: { target: 'don' } }))
      .toBe('Declare war on Don Republic');
  });
});

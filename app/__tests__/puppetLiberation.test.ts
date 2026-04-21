import { describe, expect, it } from 'vitest';
import { initialGameState } from '../store/game/initialState';
import { applyLiberatePuppet, getAIControlledCountries } from '../store/game/basicActions';
import type { GameStore } from '../store/game/types';
import type { Country, CountryId, RegionState } from '../types/game';

describe('liberated puppets - AI readiness', () => {
  const sovietCountry: Country = {
    id: 'soviet',
    name: 'Soviet Russia',
    flag: '',
    color: '#CC0000',
  };

  it('adds dynamically liberated Ukrainian Soviets to the AI country set on country switch', () => {
    const regions: RegionState = {
      'UA-63': {
        id: 'UA-63',
        name: 'Kharkiv',
        countryIso3: 'UKR',
        owner: 'ukrainesoviet' as CountryId,
        divisions: [],
      },
    };

    const aiCountries = getAIControlledCountries(
      'soviet' as CountryId,
      regions,
      initialGameState.productionQueues,
      []
    );

    expect(aiCountries).toContain('ukrainesoviet');
    expect(aiCountries).not.toContain('soviet');
  });

  it('creates AI state and a valid army group for Ukrainian Soviet puppet divisions', () => {
    const state = {
      ...initialGameState,
      selectedCountry: sovietCountry,
      relationships: [
        { fromCountry: 'soviet' as CountryId, toCountry: 'white' as CountryId, type: 'war' as const },
      ],
      armyGroups: [],
      aiStates: [],
    } as unknown as GameStore;

    const regions: RegionState = {
      'UA-63': {
        id: 'UA-63',
        name: 'Kharkiv',
        countryIso3: 'UKR',
        owner: 'soviet',
        divisions: [],
      },
    };

    const result = applyLiberatePuppet(
      {
        country: 'ukrainesoviet',
        spawnRegionId: 'UA-63',
        divisions: 3,
      },
      'soviet',
      state,
      regions
    );

    const puppetGroup = result.updatedArmyGroups.find(group => group.owner === 'ukrainesoviet');
    expect(puppetGroup).toBeDefined();
    expect(result.updatedAIStates.some(aiState => aiState.countryId === 'ukrainesoviet')).toBe(true);

    const kharkiv = result.updatedRegions['UA-63'];
    expect(kharkiv.owner).toBe('ukrainesoviet');
    expect(kharkiv.divisions).toHaveLength(3);
    expect(kharkiv.divisions.every(division => division.armyGroupId === puppetGroup!.id)).toBe(true);
  });

  it('joins the overlord wars when a puppet is liberated while the overlord is defending', () => {
    const state = {
      ...initialGameState,
      selectedCountry: sovietCountry,
      relationships: [
        { fromCountry: 'white' as CountryId, toCountry: 'soviet' as CountryId, type: 'war' as const },
      ],
      armyGroups: [],
      aiStates: [],
    } as unknown as GameStore;

    const regions: RegionState = {
      'UA-63': {
        id: 'UA-63',
        name: 'Kharkiv',
        countryIso3: 'UKR',
        owner: 'soviet',
        divisions: [],
      },
    };

    const result = applyLiberatePuppet(
      {
        country: 'ukrainesoviet',
        spawnRegionId: 'UA-63',
        divisions: 1,
      },
      'soviet',
      state,
      regions
    );

    expect(result.updatedRelationships).toEqual(expect.arrayContaining([
      { fromCountry: 'soviet', toCountry: 'ukrainesoviet', type: 'autonomy' },
      { fromCountry: 'ukrainesoviet', toCountry: 'white', type: 'war' },
      { fromCountry: 'white', toCountry: 'ukrainesoviet', type: 'war' },
    ]));
  });
});

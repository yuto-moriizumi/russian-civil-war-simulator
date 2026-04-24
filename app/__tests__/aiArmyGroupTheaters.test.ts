import { describe, expect, it } from 'vitest';
import { syncAIArmyGroupsToTheaters } from '../utils/aiArmyGroupTheaters';
import type {
  ArmyGroup,
  CountryId,
  Division,
  DivisionState,
  ProductionQueueItem,
  Region,
  RegionState,
  Theater,
} from '../types/game';

const AI_COUNTRY = 'white' as CountryId;

function makeDivision(id: string, armyGroupId: string): Division {
  return {
    id,
    name: id,
    owner: AI_COUNTRY,
    armyGroupId,
    hp: 100,
    maxHp: 100,
    attack: 10,
    defence: 15,
    regionId: 'test-region',
  };
}

function makeRegion(id: string): Region {
  return {
    id,
    name: id,
    countryIso3: 'TST',
    owner: AI_COUNTRY,
  };
}

function makeGroup(id: string, theaterId: string | null, regionIds: string[]): ArmyGroup {
  return {
    id,
    name: id,
    regionIds,
    color: '#000000',
    owner: AI_COUNTRY,
    theaterId,
    mode: 'advance',
  };
}

function makeTheater(id: string, frontlineRegions: string[]): Theater {
  return {
    id,
    name: id,
    frontlineRegions,
    enemyCountry: 'soviet',
    owner: AI_COUNTRY,
  };
}

function makeProductionItem(id: string, armyGroupId: string): ProductionQueueItem {
  return {
    id,
    divisionName: id,
    owner: AI_COUNTRY,
    startTime: new Date('1918-01-01T00:00:00.000Z'),
    completionTime: new Date('1918-01-02T00:00:00.000Z'),
    targetRegionId: 'east-front',
    armyGroupId,
  };
}

describe('syncAIArmyGroupsToTheaters', () => {
  it('creates a default army group when the country has no groups and no theaters', () => {
    const regions: RegionState = {
      'home': makeRegion('home'),
    };

    const result = syncAIArmyGroupsToTheaters({
      aiCountryIds: [AI_COUNTRY],
      theaters: [],
      armyGroups: [],
      regions,
      divisions: {},
      movingUnits: [],
      activeCombats: [],
      productionQueues: {} as Record<CountryId, ProductionQueueItem[]>,
    });

    const aiGroups = result.armyGroups.filter(group => group.owner === AI_COUNTRY);
    expect(aiGroups).toHaveLength(1);
    expect(aiGroups[0].theaterId).toBeNull();
  });

  it('creates army groups equal to the number of theaters when starting from zero', () => {
    const regions: RegionState = {
      'west-front': makeRegion('west-front'),
      'east-front': makeRegion('east-front'),
    };
    const theaters = [
      makeTheater('theater-west', ['west-front']),
      makeTheater('theater-east', ['east-front']),
    ];

    const result = syncAIArmyGroupsToTheaters({
      aiCountryIds: [AI_COUNTRY],
      theaters,
      armyGroups: [],
      regions,
      divisions: {},
      movingUnits: [],
      activeCombats: [],
      productionQueues: {} as Record<CountryId, ProductionQueueItem[]>,
    });

    const aiGroups = result.armyGroups.filter(group => group.owner === AI_COUNTRY);
    expect(aiGroups).toHaveLength(2);
    expect(aiGroups.map(g => g.theaterId).sort()).toEqual(['theater-east', 'theater-west']);
  });

  it('creates an AI army group when a new theater appears', () => {
    const regions: RegionState = {
      'west-front': makeRegion('west-front'),
      'east-front': makeRegion('east-front'),
    };
    const divisions: DivisionState = {
      'west-1': { ...makeDivision('west-1', 'ag-west'), regionId: 'west-front' },
      'east-1': { ...makeDivision('east-1', 'ag-west'), regionId: 'east-front' },
    };
    const theaters = [
      makeTheater('theater-west', ['west-front']),
      makeTheater('theater-east', ['east-front']),
    ];

    const result = syncAIArmyGroupsToTheaters({
      aiCountryIds: [AI_COUNTRY],
      theaters,
      armyGroups: [makeGroup('ag-west', 'theater-west', ['west-front', 'east-front'])],
      regions,
      divisions,
      movingUnits: [],
      activeCombats: [],
      productionQueues: {} as Record<CountryId, ProductionQueueItem[]>,
    });

    const aiGroups = result.armyGroups.filter(group => group.owner === AI_COUNTRY);
    expect(aiGroups).toHaveLength(2);
    expect(aiGroups.map(group => group.theaterId).sort()).toEqual(['theater-east', 'theater-west']);

    const eastGroup = aiGroups.find(group => group.theaterId === 'theater-east');
    expect(eastGroup).toBeDefined();
    const eastFrontDivs = Object.values(result.divisions).filter(d => d.regionId === 'east-front');
    expect(eastFrontDivs[0].armyGroupId).toBe(eastGroup?.id);
  });

  it('merges AI army groups when their theaters disappear', () => {
    const regions: RegionState = {
      'west-front': makeRegion('west-front'),
      'east-front': makeRegion('east-front'),
    };
    const divisions: DivisionState = {
      'west-1': { ...makeDivision('west-1', 'ag-west'), regionId: 'west-front' },
      'east-1': { ...makeDivision('east-1', 'ag-east'), regionId: 'east-front' },
    };

    const result = syncAIArmyGroupsToTheaters({
      aiCountryIds: [AI_COUNTRY],
      theaters: [makeTheater('theater-west', ['west-front'])],
      armyGroups: [
        makeGroup('ag-west', 'theater-west', ['west-front']),
        makeGroup('ag-east', 'theater-east', ['east-front']),
      ],
      regions,
      divisions,
      movingUnits: [],
      activeCombats: [],
      productionQueues: {
        [AI_COUNTRY]: [makeProductionItem('queued-east', 'ag-east')],
      } as Record<CountryId, ProductionQueueItem[]>,
    });

    const aiGroups = result.armyGroups.filter(group => group.owner === AI_COUNTRY);
    expect(aiGroups).toHaveLength(1);
    expect(aiGroups[0].id).toBe('ag-west');
    expect(aiGroups[0].theaterId).toBe('theater-west');
    expect(aiGroups[0].regionIds).toEqual(expect.arrayContaining(['west-front', 'east-front']));
    const eastFrontDivs = Object.values(result.divisions).filter(d => d.regionId === 'east-front');
    expect(eastFrontDivs[0].armyGroupId).toBe('ag-west');
    expect(result.productionQueues[AI_COUNTRY][0].armyGroupId).toBe('ag-west');
  });
});

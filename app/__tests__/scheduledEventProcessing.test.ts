import { describe, expect, it } from 'vitest';
import { processScheduledEvents } from '../domain/game/logic/scheduledEventProcessing';
import { processSituations } from '../domain/game/logic/situationProcessing';
import { brestLitovskSituation } from '../data/situations/brestLitovsk';
import type { ArmyGroup, CountryId, DivisionState, Region, Relationship, ScheduledEvent, Situation } from '../types/game';
import type { EngineSimulationState } from '../domain/game/engine/types';

function relation(fromCountry: CountryId, toCountry: CountryId, type: Relationship['type']): Relationship {
  return { fromCountry, toCountry, type };
}

function hasRelationship(
  relationships: Relationship[],
  fromCountry: CountryId,
  toCountry: CountryId,
  type: Relationship['type']
): boolean {
  return relationships.some(r =>
    r.fromCountry === fromCountry &&
    r.toCountry === toCountry &&
    r.type === type
  );
}

function makeBaseEngineState(overrides: Partial<EngineSimulationState> = {}): EngineSimulationState {
  return {
    dateTime: new Date(1918, 1, 9),
    selectedCountry: null,
    isPlayerAIEnabled: false,
    regions: {},
    regionDefinitions: {},
    adjacency: {},
    regionCentroids: {},
    divisions: {},
    movingUnits: [],
    activeCombats: [],
    armyGroups: [],
    theaters: [],
    productionQueues: {} as EngineSimulationState['productionQueues'],
    relationships: [],
    scheduledEvents: [],
    situations: [],
    countryBonuses: {} as EngineSimulationState['countryBonuses'],
    modifiers: {} as EngineSimulationState['modifiers'],
    aiStates: [],
    missions: [],
    gameEvents: [],
    notifications: [],
    ...overrides,
  };
}

const ukraineTriggered: ScheduledEvent = {
  id: 'treaty-of-brest-litovsk-ukraine',
  title: 'Treaty of Brest-Litovsk (Ukraine)',
  description: '',
  conditions: [{ type: 'date', date: '1918-02-09' }],
  actions: [],
  triggered: true,
};

describe('Brest-Litovsk Situation', () => {
  it('activates when treaty-of-brest-litovsk-ukraine has fired', () => {
    const situation: Situation = { ...brestLitovskSituation, active: false, resolved: false };
    const state = makeBaseEngineState({ situations: [situation], scheduledEvents: [ukraineTriggered] });
    const patch = processSituations(state, new Date(1918, 1, 9));
    expect(patch.situations![0].active).toBe(true);
    expect(patch.situations![0].resolved).toBe(false);
  });

  it('does not activate before treaty-of-brest-litovsk-ukraine fires', () => {
    const situation: Situation = { ...brestLitovskSituation, active: false, resolved: false };
    const notTriggered = { ...ukraineTriggered, triggered: false };
    const state = makeBaseEngineState({ situations: [situation], scheduledEvents: [notTriggered] });
    const patch = processSituations(state, new Date(1918, 1, 8));
    expect(patch.situations![0].active).toBe(false);
  });

  it('resolves with German victory (historical terms) when Germany controls >= 60% of contested regions', () => {
    const contested = brestLitovskSituation.contestedRegions;
    const threshold = Math.ceil(contested.length * 0.6);
    const regions: Record<string, Region> = {};
    contested.forEach((id, i) => {
      regions[id] = { id, name: id, countryIso3: 'UKR', owner: i < threshold ? 'germany' : 'soviet' };
    });

    const relationships: Relationship[] = [
      relation('soviet', 'odessa', 'autonomy'),
      relation('soviet', 'ukrainesoviet', 'autonomy'),
      relation('soviet', 'dkr', 'autonomy'),
      relation('soviet', 'iskolat', 'autonomy'),
      relation('germany', 'soviet', 'war'),
      relation('soviet', 'germany', 'war'),
    ];

    const situation: Situation = { ...brestLitovskSituation, active: true, resolved: false };
    const state = makeBaseEngineState({ situations: [situation], regions, relationships, scheduledEvents: [ukraineTriggered] });
    const patch = processSituations(state, new Date(1918, 2, 3));

    expect(patch.situations![0].resolved).toBe(true);
    expect(hasRelationship(patch.relationships!, 'soviet', 'odessa', 'autonomy')).toBe(false);
    expect(hasRelationship(patch.relationships!, 'soviet', 'ukrainesoviet', 'autonomy')).toBe(false);
    expect(hasRelationship(patch.relationships!, 'soviet', 'dkr', 'autonomy')).toBe(false);
    expect(hasRelationship(patch.relationships!, 'soviet', 'iskolat', 'autonomy')).toBe(true);
    expect(hasRelationship(patch.relationships!, 'germany', 'soviet', 'war')).toBe(false);
  });

  it('resolves with Soviet victory (favorable armistice) when Germany controls <= 40% of contested regions', () => {
    const contested = brestLitovskSituation.contestedRegions;
    const germanControl = Math.floor(contested.length * 0.4);
    const regions: Record<string, Region> = {};
    contested.forEach((id, i) => {
      regions[id] = { id, name: id, countryIso3: 'UKR', owner: i < germanControl ? 'germany' : 'soviet' };
    });

    const relationships: Relationship[] = [
      relation('soviet', 'odessa', 'autonomy'),
      relation('soviet', 'ukrainesoviet', 'autonomy'),
      relation('germany', 'soviet', 'war'),
      relation('soviet', 'germany', 'war'),
    ];

    const situation: Situation = { ...brestLitovskSituation, active: true, resolved: false };
    const state = makeBaseEngineState({ situations: [situation], regions, relationships, scheduledEvents: [ukraineTriggered] });
    const patch = processSituations(state, new Date(1918, 2, 3));

    expect(patch.situations![0].resolved).toBe(true);
    expect(hasRelationship(patch.relationships!, 'soviet', 'odessa', 'autonomy')).toBe(true);
    expect(hasRelationship(patch.relationships!, 'soviet', 'ukrainesoviet', 'autonomy')).toBe(true);
    expect(hasRelationship(patch.relationships!, 'germany', 'soviet', 'war')).toBe(false);
  });
});

describe('mergeCountry action', () => {
  function makeRegion(id: string, owner: CountryId): Record<string, Region> {
    return {
      [id]: { id, name: id, countryIso3: 'RUS', owner },
    };
  }

  function makeMergedRegions(): Record<string, Region> {
    return {
      ...makeRegion('REG-A', 'poland' as CountryId),
      ...makeRegion('REG-B', 'poland' as CountryId),
      ...makeRegion('REG-C', 'germany' as CountryId),
    };
  }

  function makeDivisions(): DivisionState {
    return {
      'div-1': { id: 'div-1', name: '1st Div', owner: 'poland' as CountryId, armyGroupId: 'ag-b', hp: 100, maxHp: 100, attack: 5, defence: 3, regionId: 'REG-A' },
      'div-2': { id: 'div-2', name: '2nd Div', owner: 'poland' as CountryId, armyGroupId: 'ag-b', hp: 80, maxHp: 100, attack: 4, defence: 2, regionId: 'REG-B' },
      'div-3': { id: 'div-3', name: '3rd Div', owner: 'germany' as CountryId, armyGroupId: 'ag-a', hp: 90, maxHp: 100, attack: 6, defence: 4, regionId: 'REG-C' },
    };
  }

  function makeArmyGroups(): ArmyGroup[] {
    return [
      { id: 'ag-b', name: 'Poland Army', regionIds: ['REG-A', 'REG-B'], color: '#FF0000', owner: 'poland' as CountryId, theaterId: null, mode: 'none' },
      { id: 'ag-a', name: 'German Army', regionIds: ['REG-C'], color: '#00FF00', owner: 'germany' as CountryId, theaterId: null, mode: 'none' },
    ];
  }

  const mergeEvent: ScheduledEvent = {
    id: 'test-merge',
    title: 'Test Merge',
    description: 'Test merge event',
    conditions: [{ type: 'date', date: '1919-01-01' }],
    actions: [
      { type: 'mergeCountry', newOwner: 'germany' as CountryId, fromCountry: 'poland' as CountryId },
    ],
    triggered: false,
  };

  it('transfers all regions, divisions, and army groups from merged country to newOwner', () => {
    const regions = makeMergedRegions();
    const divisions = makeDivisions();
    const armyGroups = makeArmyGroups();

    const result = processScheduledEvents(
      [mergeEvent],
      new Date(1919, 0, 1),
      regions,
      [],
      armyGroups,
      divisions
    );

    // Regions: poland's regions transferred to germany
    expect(result.updatedRegions['REG-A'].owner).toBe('germany');
    expect(result.updatedRegions['REG-B'].owner).toBe('germany');
    expect(result.updatedRegions['REG-C'].owner).toBe('germany'); // unchanged owner

    // Divisions: poland's divisions transferred to germany
    expect(result.updatedDivisions['div-1'].owner).toBe('germany');
    expect(result.updatedDivisions['div-2'].owner).toBe('germany');
    expect(result.updatedDivisions['div-3'].owner).toBe('germany'); // unchanged

    // Army groups: poland's army group transferred to germany
    const agB = result.updatedArmyGroups.find(g => g.id === 'ag-b')!;
    expect(agB.owner).toBe('germany');
    const agA = result.updatedArmyGroups.find(g => g.id === 'ag-a')!;
    expect(agA.owner).toBe('germany'); // unchanged
  });

  it('does not fire before the event date', () => {
    const result = processScheduledEvents(
      [mergeEvent],
      new Date(1918, 11, 31),
      makeMergedRegions(),
      [],
      makeArmyGroups(),
      makeDivisions()
    );

    expect(result.updatedScheduledEvents[0].triggered).toBe(false);
    expect(result.newEvents).toHaveLength(0);
  });
});

describe('date scheduled event condition', () => {
  const dateConditionEvent: ScheduledEvent = {
    id: 'test-date-condition',
    title: 'Date Condition Event',
    description: 'Triggers on or after the condition date',
    conditions: [
      { type: 'date', date: '1918-02-10' },
    ],
    actions: [
      { type: 'transferRegion', regionId: 'REG-A', newOwner: 'germany' as CountryId },
    ],
    triggered: false,
  };

  it('fires on or after the matching condition date', () => {
    const regions: Record<string, Region> = {
      'REG-A': { id: 'REG-A', name: 'Region A', countryIso3: 'RUS', owner: 'poland' as CountryId },
    };

    const beforeResult = processScheduledEvents(
      [dateConditionEvent],
      new Date(1918, 1, 9),
      regions,
      [],
      []
    );

    expect(beforeResult.updatedScheduledEvents[0].triggered).toBe(false);
    expect(beforeResult.updatedRegions['REG-A'].owner).toBe('poland');

    const onDateResult = processScheduledEvents(
      [dateConditionEvent],
      new Date(1918, 1, 10),
      regions,
      [],
      []
    );

    expect(onDateResult.updatedScheduledEvents[0].triggered).toBe(true);
    expect(onDateResult.updatedRegions['REG-A'].owner).toBe('germany');

    const afterResult = processScheduledEvents(
      [dateConditionEvent],
      new Date(1918, 1, 11),
      regions,
      [],
      []
    );

    expect(afterResult.updatedScheduledEvents[0].triggered).toBe(true);
    expect(afterResult.updatedRegions['REG-A'].owner).toBe('germany');
  });
});

describe('dateReached scheduled event condition', () => {
  const dateReachedConditionEvent: ScheduledEvent = {
    id: 'test-date-reached-condition',
    title: 'Date Reached Condition Event',
    description: 'Triggers on or after the condition date when other conditions pass',
    conditions: [
      { type: 'date', date: '1918-02-10' },
      { type: 'atLeastOneRegionOwnedByOrPuppetOf', regions: ['REG-A'], country: 'poland' as CountryId },
    ],
    actions: [
      { type: 'transferRegion', regionId: 'REG-A', newOwner: 'germany' as CountryId },
    ],
    triggered: false,
  };

  it('fires on or after the matching condition date', () => {
    const regions: Record<string, Region> = {
      'REG-A': { id: 'REG-A', name: 'Region A', countryIso3: 'RUS', owner: 'poland' as CountryId },
    };

    const beforeResult = processScheduledEvents(
      [dateReachedConditionEvent],
      new Date(1918, 1, 9),
      regions,
      [],
      []
    );

    expect(beforeResult.updatedScheduledEvents[0].triggered).toBe(false);
    expect(beforeResult.updatedRegions['REG-A'].owner).toBe('poland');

    const onDateResult = processScheduledEvents(
      [dateReachedConditionEvent],
      new Date(1918, 1, 10),
      regions,
      [],
      []
    );

    expect(onDateResult.updatedScheduledEvents[0].triggered).toBe(true);
    expect(onDateResult.updatedRegions['REG-A'].owner).toBe('germany');

    const afterDateResult = processScheduledEvents(
      [dateReachedConditionEvent],
      new Date(1918, 1, 11),
      regions,
      [],
      []
    );

    expect(afterDateResult.updatedScheduledEvents[0].triggered).toBe(true);
    expect(afterDateResult.updatedRegions['REG-A'].owner).toBe('germany');
  });
});

describe('or scheduled event condition', () => {
  const orConditionEvent: ScheduledEvent = {
    id: 'test-or-condition',
    title: 'OR Condition Event',
    description: 'Triggers when either the fallback date is reached or an early condition is met',
    conditions: [
      {
        type: 'or',
        conditions: [
          { type: 'date', date: '1918-04-22' },
          { type: 'atLeastOneRegionOwnedByOrPuppetOf', regions: ['REG-A'], country: 'soviet' as CountryId },
        ],
      },
    ],
    actions: [
      { type: 'transferRegion', regionId: 'REG-A', newOwner: 'germany' as CountryId },
    ],
    triggered: false,
  };

  it('fires before the fallback date when an OR branch becomes true', () => {
    const regions: Record<string, Region> = {
      'REG-A': { id: 'REG-A', name: 'Region A', countryIso3: 'RUS', owner: 'soviet' as CountryId },
    };

    const result = processScheduledEvents(
      [orConditionEvent],
      new Date(1918, 3, 1),
      regions,
      [],
      []
    );

    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
    expect(result.updatedRegions['REG-A'].owner).toBe('germany');
  });

  it('fires on the fallback date when no earlier OR branch has passed', () => {
    const regions: Record<string, Region> = {
      'REG-A': { id: 'REG-A', name: 'Region A', countryIso3: 'RUS', owner: 'poland' as CountryId },
    };

    const beforeDateResult = processScheduledEvents(
      [orConditionEvent],
      new Date(1918, 3, 21),
      regions,
      [],
      []
    );

    expect(beforeDateResult.updatedScheduledEvents[0].triggered).toBe(false);
    expect(beforeDateResult.updatedRegions['REG-A'].owner).toBe('poland');

    const onDateResult = processScheduledEvents(
      [orConditionEvent],
      new Date(1918, 3, 22),
      regions,
      [],
      []
    );

    expect(onDateResult.updatedScheduledEvents[0].triggered).toBe(true);
    expect(onDateResult.updatedRegions['REG-A'].owner).toBe('germany');
  });
});

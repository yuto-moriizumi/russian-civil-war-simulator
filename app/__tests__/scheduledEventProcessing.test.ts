import { describe, expect, it } from 'vitest';
import { scheduledEvents } from '../data/scheduledEvents';
import { processScheduledEvents } from '../domain/game/logic/scheduledEventProcessing';
import type { ArmyGroup, CountryId, DivisionState, Region, Relationship, ScheduledEvent } from '../types/game';

function relation(fromCountry: CountryId, toCountry: CountryId, type: Relationship['type']): Relationship {
  return { fromCountry, toCountry, type };
}

function getBrestLitovskSovietEvent(): ScheduledEvent {
  const event = scheduledEvents.find(e => e.id === 'treaty-of-brest-litovsk-soviet');
  if (!event) throw new Error('Missing treaty-of-brest-litovsk-soviet event');
  return event;
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

describe('scheduled Treaty of Brest-Litovsk event', () => {
  it('fires on 1918-03-03, releases Soviet Ukrainian puppets, and ends Germany-puppet wars with Soviet Russia', () => {
    const relationships: Relationship[] = [
      relation('soviet', 'odessa', 'autonomy'),
      relation('soviet', 'ukrainesoviet', 'autonomy'),
      relation('soviet', 'dkr', 'autonomy'),
      relation('soviet', 'iskolat', 'autonomy'),
      relation('germany', 'poland', 'autonomy'),
      relation('poland', 'balticdutchy', 'autonomy'),
      relation('germany', 'soviet', 'war'),
      relation('soviet', 'germany', 'war'),
      relation('poland', 'soviet', 'war'),
      relation('soviet', 'poland', 'war'),
      relation('balticdutchy', 'soviet', 'war'),
      relation('soviet', 'balticdutchy', 'war'),
      relation('ottoman', 'soviet', 'war'),
      relation('soviet', 'ottoman', 'war'),
    ];

    const result = processScheduledEvents(
      [getBrestLitovskSovietEvent()],
      new Date(1918, 2, 3),
      {},
      relationships,
      []
    );

    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
    expect(result.newEvents[0].title).toBe('Treaty of Brest-Litovsk');
    expect(hasRelationship(result.updatedRelationships, 'soviet', 'odessa', 'autonomy')).toBe(false);
    expect(hasRelationship(result.updatedRelationships, 'soviet', 'ukrainesoviet', 'autonomy')).toBe(false);
    expect(hasRelationship(result.updatedRelationships, 'soviet', 'dkr', 'autonomy')).toBe(false);
    expect(hasRelationship(result.updatedRelationships, 'soviet', 'iskolat', 'autonomy')).toBe(true);

    expect(hasRelationship(result.updatedRelationships, 'germany', 'soviet', 'war')).toBe(false);
    expect(hasRelationship(result.updatedRelationships, 'soviet', 'germany', 'war')).toBe(false);
    expect(hasRelationship(result.updatedRelationships, 'poland', 'soviet', 'war')).toBe(false);
    expect(hasRelationship(result.updatedRelationships, 'soviet', 'poland', 'war')).toBe(false);
    expect(hasRelationship(result.updatedRelationships, 'balticdutchy', 'soviet', 'war')).toBe(false);
    expect(hasRelationship(result.updatedRelationships, 'soviet', 'balticdutchy', 'war')).toBe(false);
    expect(hasRelationship(result.updatedRelationships, 'ottoman', 'soviet', 'war')).toBe(true);
    expect(hasRelationship(result.updatedRelationships, 'soviet', 'ottoman', 'war')).toBe(true);
  });

  it('does not fire before 1918-03-03', () => {
    const relationships: Relationship[] = [
      relation('soviet', 'odessa', 'autonomy'),
      relation('germany', 'soviet', 'war'),
      relation('soviet', 'germany', 'war'),
    ];

    const result = processScheduledEvents(
      [getBrestLitovskSovietEvent()],
      new Date(1918, 2, 2),
      {},
      relationships,
      []
    );

    expect(result.updatedScheduledEvents[0].triggered).toBe(false);
    expect(result.newEvents).toHaveLength(0);
    expect(result.updatedRelationships).toEqual(relationships);
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
    date: '1919-01-01',
    title: 'Test Merge',
    description: 'Test merge event',
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
    date: '1918-01-01',
    title: 'Date Condition Event',
    description: 'Triggers only on the condition date',
    conditions: [
      { type: 'date', date: '1918-02-10' },
    ],
    actions: [
      { type: 'transferRegion', regionId: 'REG-A', newOwner: 'germany' as CountryId },
    ],
    triggered: false,
  };

  it('fires only on the matching condition date', () => {
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

    expect(afterResult.updatedScheduledEvents[0].triggered).toBe(false);
    expect(afterResult.updatedRegions['REG-A'].owner).toBe('poland');
  });
});

describe('dateReached scheduled event condition', () => {
  const dateReachedConditionEvent: ScheduledEvent = {
    id: 'test-date-reached-condition',
    date: '1918-01-01',
    title: 'Date Reached Condition Event',
    description: 'Triggers on or after the condition date when other conditions pass',
    conditions: [
      { type: 'dateReached', date: '1918-02-10' },
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
    date: '1918-04-22',
    title: 'OR Condition Event',
    description: 'Triggers when either the fallback date is reached or an early condition is met',
    conditions: [
      {
        type: 'or',
        conditions: [
          { type: 'dateReached', date: '1918-04-22' },
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

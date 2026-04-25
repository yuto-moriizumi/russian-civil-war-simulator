import { describe, expect, it } from 'vitest';
import { scheduledEvents } from '../data/scheduledEvents';
import { processScheduledEvents } from '../domain/game/logic/scheduledEventProcessing';
import type { ArmyGroup, CountryId, DivisionState, Region, RegionState, Relationship } from '../types/game';

const r = (id: string, owner: CountryId): Region =>
  ({ id, name: id, countryIso3: id, owner }) as Region;

describe('scheduled events', () => {
  it('establishes Moldavia as a White Army puppet on December 16, 1917', () => {
    const event = scheduledEvents.find(
      e => e.id === 'moldavian-democratic-republic-established'
    );
    const regions: RegionState = { MDA: r('MDA', 'white') };

    expect(event).toBeDefined();

    const result = processScheduledEvents([event!], new Date(1917, 11, 16), regions, [], []);

    expect(result.updatedRegions.MDA.owner).toBe('moldavia');
    expect(result.updatedRelationships).toContainEqual({
      fromCountry: 'white', toCountry: 'moldavia', type: 'autonomy',
    });
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('makes Kuban join the White Army wars when the Kuban People\'s Republic is established', () => {
    const event = scheduledEvents.find(
      e => e.id === 'kuban-peoples-republic-established'
    );
    const regions: RegionState = { 'RU-KDA': r('RU-KDA', 'white'), 'RU-AD': r('RU-AD', 'white') };
    const relationships: Relationship[] = [
      { fromCountry: 'white', toCountry: 'soviet', type: 'war' },
      { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
    ];

    expect(event).toBeDefined();

    const result = processScheduledEvents([event!], new Date(1918, 0, 28), regions, relationships, []);

    expect(result.updatedRegions['RU-KDA'].owner).toBe('kuban');
    expect(result.updatedRegions['RU-AD'].owner).toBe('kuban');
    expect(result.updatedRelationships).toEqual(expect.arrayContaining([
      { fromCountry: 'white', toCountry: 'kuban', type: 'autonomy' },
      { fromCountry: 'kuban', toCountry: 'soviet', type: 'war' },
      { fromCountry: 'soviet', toCountry: 'kuban', type: 'war' },
    ]));
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('ends Moldavia puppet relationship with the White Army on February 6, 1918', () => {
    const event = scheduledEvents.find(e => e.id === 'moldavian-independence');
    const relationships: Relationship[] = [
      { fromCountry: 'white', toCountry: 'moldavia', type: 'autonomy' },
      { fromCountry: 'white', toCountry: 'ukraine', type: 'autonomy' },
    ];

    expect(event).toBeDefined();

    const result = processScheduledEvents([event!], new Date(1918, 1, 6), {}, relationships, []);

    expect(result.updatedRelationships).not.toContainEqual({
      fromCountry: 'white', toCountry: 'moldavia', type: 'autonomy',
    });
    expect(result.updatedRelationships).toContainEqual({
      fromCountry: 'white', toCountry: 'ukraine', type: 'autonomy',
    });
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('merges Moldavia into Romania on April 9, 1918', () => {
    const event = scheduledEvents.find(e => e.id === 'union-of-bessarabia-with-romania');
    const regions: RegionState = {
      MDA: r('MDA', 'moldavia'),
      'RO-IS': r('RO-IS', 'romania'),
    };
    const armyGroups: ArmyGroup[] = [
      { id: 'mda-ag', name: 'Moldavian Army', regionIds: ['MDA'], color: '#0033A0', owner: 'moldavia', theaterId: null, mode: 'none' as const },
      { id: 'ro-ag', name: 'Romanian Army', regionIds: ['RO-IS'], color: '#FCD116', owner: 'romania', theaterId: null, mode: 'none' as const },
    ];
    const divisions: DivisionState = {
      'mda-div': { id: 'mda-div', name: 'Moldavian Division', owner: 'moldavia', armyGroupId: 'mda-ag', hp: 100, maxHp: 100, attack: 5, defence: 3, regionId: 'MDA' },
      'ro-div': { id: 'ro-div', name: 'Romanian Division', owner: 'romania', armyGroupId: 'ro-ag', hp: 100, maxHp: 100, attack: 5, defence: 3, regionId: 'RO-IS' },
    };

    expect(event).toBeDefined();

    const result = processScheduledEvents(
      [event!],
      new Date(1918, 3, 9),
      regions,
      [],
      armyGroups,
      divisions
    );

    expect(result.updatedRegions.MDA.owner).toBe('romania');
    expect(result.updatedDivisions['mda-div'].owner).toBe('romania');
    expect(result.updatedDivisions['ro-div'].owner).toBe('romania');
    expect(result.updatedArmyGroups).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'mda-ag', owner: 'romania' }),
      expect.objectContaining({ id: 'ro-ag', owner: 'romania' }),
    ]));
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('ends Ukraine puppet relationship with the White Army on January 22, 1918', () => {
    const event = scheduledEvents.find(e => e.id === 'ukrainian-independence');
    const relationships: Relationship[] = [
      { fromCountry: 'white', toCountry: 'ukraine', type: 'autonomy' },
      { fromCountry: 'white', toCountry: 'moldavia', type: 'autonomy' },
    ];

    expect(event).toBeDefined();

    const result = processScheduledEvents([event!], new Date(1918, 0, 22), {}, relationships, []);

    expect(result.updatedRelationships).not.toContainEqual({
      fromCountry: 'white', toCountry: 'ukraine', type: 'autonomy',
    });
    expect(result.updatedRelationships).toContainEqual({
      fromCountry: 'white', toCountry: 'moldavia', type: 'autonomy',
    });
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('has the Ottoman Empire declare war on the White Army on February 5, 1918', () => {
    const event = scheduledEvents.find(e => e.id === 'caucasus-front-escalation');

    expect(event).toBeDefined();

    const result = processScheduledEvents([event!], new Date(1918, 1, 5), {}, [], []);

    expect(result.updatedRelationships).toEqual(expect.arrayContaining([
      { fromCountry: 'ottoman', toCountry: 'white', type: 'war' },
      { fromCountry: 'white', toCountry: 'ottoman', type: 'war' },
    ]));
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('makes every attacker and defender puppet join scheduled war declarations', () => {
    const event = scheduledEvents.find(e => e.id === 'treaty-of-brest-litovsk-ukraine');
    const relationships: Relationship[] = [
      { fromCountry: 'germany', toCountry: 'poland', type: 'autonomy' },
      { fromCountry: 'poland', toCountry: 'balticdutchy', type: 'autonomy' },
      { fromCountry: 'soviet', toCountry: 'ukrainesoviet', type: 'autonomy' },
      { fromCountry: 'soviet', toCountry: 'odessa', type: 'autonomy' },
    ];

    expect(event).toBeDefined();

    const result = processScheduledEvents([event!], new Date(1918, 1, 9), {}, relationships, []);

    expect(result.updatedRelationships).toEqual(expect.arrayContaining([
      { fromCountry: 'germany', toCountry: 'soviet', type: 'war' },
      { fromCountry: 'poland', toCountry: 'soviet', type: 'war' },
      { fromCountry: 'balticdutchy', toCountry: 'soviet', type: 'war' },
      { fromCountry: 'germany', toCountry: 'ukrainesoviet', type: 'war' },
      { fromCountry: 'germany', toCountry: 'odessa', type: 'war' },
      { fromCountry: 'poland', toCountry: 'ukrainesoviet', type: 'war' },
      { fromCountry: 'balticdutchy', toCountry: 'odessa', type: 'war' },
      { fromCountry: 'odessa', toCountry: 'balticdutchy', type: 'war' },
    ]));
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('returns White-held Persian core regions to Persia on February 28, 1918', () => {
    const event = scheduledEvents.find(e => e.id === 'retreat-from-tabriz');
    const regions: RegionState = {
      'IR-01': r('IR-01', 'white'), 'IR-02': r('IR-02', 'white'),
      'IR-03': r('IR-03', 'soviet'), GEO: r('GEO', 'white'),
    };

    expect(event).toBeDefined();

    const result = processScheduledEvents([event!], new Date(1918, 1, 28), regions, [], []);

    expect(result.updatedRegions['IR-01'].owner).toBe('persia');
    expect(result.updatedRegions['IR-02'].owner).toBe('persia');
    expect(result.updatedRegions['IR-03'].owner).toBe('soviet');
    expect(result.updatedRegions.GEO.owner).toBe('white');
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('establishes the Transcaucasian Democratic Federative Republic on April 22, 1918', () => {
    const event = scheduledEvents.find(e => e.id === 'transcaucasian-democratic-federative-republic-established');
    const regions: RegionState = {
      GEO: r('GEO', 'white'), ARM: r('ARM', 'white'),
      AZE: r('AZE', 'white'), 'GE-01': r('GE-01', 'soviet'),
    };

    expect(event).toBeDefined();

    const result = processScheduledEvents([event!], new Date(1918, 3, 22), regions, [], []);

    expect(result.updatedRegions.GEO.owner).toBe('tdfr');
    expect(result.updatedRegions.ARM.owner).toBe('tdfr');
    expect(result.updatedRegions.AZE.owner).toBe('tdfr');
    expect(result.updatedRegions['GE-01'].owner).toBe('soviet');
    expect(Object.values(result.updatedDivisions)).toEqual(expect.arrayContaining([
      expect.objectContaining({ owner: 'tdfr', regionId: 'GEO', armyGroupId: 'tdfr-ag-spawned' }),
    ]));
    expect(result.updatedArmyGroups).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'tdfr-ag-spawned', owner: 'tdfr', name: 'Transcaucasian Defense Force' }),
    ]));
    expect(result.updatedRelationships).toEqual(expect.arrayContaining([
      { fromCountry: 'ottoman', toCountry: 'tdfr', type: 'war' },
      { fromCountry: 'tdfr', toCountry: 'ottoman', type: 'war' },
    ]));
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('establishes the Transcaucasian Democratic Federative Republic early if RU-KDA is held by a Soviet puppet', () => {
    const event = scheduledEvents.find(e => e.id === 'transcaucasian-democratic-federative-republic-established');
    const regions: RegionState = {
      GEO: r('GEO', 'white'),
      ARM: r('ARM', 'white'),
      AZE: r('AZE', 'white'),
      'RU-DA': r('RU-DA', 'white'),
      'RU-KDA': r('RU-KDA', 'kuban_soviet'),
    };
    const relationships: Relationship[] = [
      { fromCountry: 'soviet', toCountry: 'kuban_soviet', type: 'autonomy' },
    ];

    expect(event).toBeDefined();

    const result = processScheduledEvents([event!], new Date(1918, 3, 10), regions, relationships, []);

    expect(result.updatedRegions.GEO.owner).toBe('tdfr');
    expect(result.updatedRegions.ARM.owner).toBe('tdfr');
    expect(result.updatedRegions.AZE.owner).toBe('tdfr');
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('does not establish the Transcaucasian Democratic Federative Republic early just because RU-KDA is non-White', () => {
    const event = scheduledEvents.find(e => e.id === 'transcaucasian-democratic-federative-republic-established');
    const regions: RegionState = {
      GEO: r('GEO', 'white'),
      ARM: r('ARM', 'white'),
      AZE: r('AZE', 'white'),
      'RU-DA': r('RU-DA', 'white'),
      'RU-KDA': r('RU-KDA', 'ottoman'),
    };

    expect(event).toBeDefined();

    const result = processScheduledEvents([event!], new Date(1918, 3, 10), regions, [], []);

    expect(result.updatedRegions.GEO.owner).toBe('white');
    expect(result.updatedRegions.ARM.owner).toBe('white');
    expect(result.updatedRegions.AZE.owner).toBe('white');
    expect(result.updatedScheduledEvents[0].triggered).toBe(false);
  });

  it('dissolves the TDFR once established and a monitored frontier region is no longer under TDFR control', () => {
    const event = scheduledEvents.find(
      e => e.id === 'dissolution-of-the-transcaucasian-democratic-federative-republic'
    );
    const regions: RegionState = {
      AZE: r('AZE', 'tdfr'), ARM: r('ARM', 'tdfr'), 'AM-01': r('AM-01', 'tdfr'),
      GEO: r('GEO', 'tdfr'),
      'TR-08': r('TR-08', 'ottoman'),
      'TR-25': r('TR-25', 'tdfr'),
      'RU-MOW': r('RU-MOW', 'tdfr'),
    };
    const establishedEvent = scheduledEvents.find(
      e => e.id === 'transcaucasian-democratic-federative-republic-established'
    );

    expect(event).toBeDefined();

    const result = processScheduledEvents(
      [event!], new Date(1918, 4, 26), regions, [], [], {},
      [{ ...establishedEvent!, triggered: true }]
    );

    expect(result.updatedRegions.AZE.owner).toBe('adr');
    expect(result.updatedRegions.ARM.owner).toBe('armenia');
    expect(result.updatedRegions['AM-01'].owner).toBe('armenia');
    expect(result.updatedRegions.GEO.owner).toBe('georgia');
    expect(result.updatedRegions['TR-08'].owner).toBe('ottoman');
    expect(result.updatedRegions['TR-25'].owner).toBe('armenia');
    expect(result.updatedRegions['RU-MOW'].owner).toBe('georgia');
    const armenianDivisionsInArm = Object.values(result.updatedDivisions).filter(
      division => division.owner === 'armenia' && division.regionId === 'ARM'
    );
    expect(armenianDivisionsInArm).toHaveLength(5);
    expect(armenianDivisionsInArm.map(division => division.armyGroupId)).toEqual(
      Array(5).fill('armenia-ag-spawned')
    );
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('dissolves the TDFR on date alone after establishment even if all monitored frontier regions remain under TDFR control', () => {
    const event = scheduledEvents.find(
      e => e.id === 'dissolution-of-the-transcaucasian-democratic-federative-republic'
    );
    const establishedEvent = scheduledEvents.find(
      e => e.id === 'transcaucasian-democratic-federative-republic-established'
    );
    const regions: RegionState = {
      AZE: r('AZE', 'tdfr'),
      ARM: r('ARM', 'tdfr'),
      GEO: r('GEO', 'tdfr'),
      'TR-08': r('TR-08', 'tdfr'),
      'TR-25': r('TR-25', 'tdfr'),
      'TR-04': r('TR-04', 'tdfr'),
    };

    expect(event).toBeDefined();
    expect(establishedEvent).toBeDefined();

    const result = processScheduledEvents(
      [event!], new Date(1918, 4, 26), regions, [], [], {},
      [{ ...establishedEvent!, triggered: true }]
    );

    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
    expect(result.updatedRegions.AZE.owner).toBe('adr');
    expect(result.updatedRegions.GEO.owner).toBe('georgia');
  });

  it('does not dissolve the TDFR before the establishment event even if a monitored frontier region is lost', () => {
    const event = scheduledEvents.find(
      e => e.id === 'dissolution-of-the-transcaucasian-democratic-federative-republic'
    );
    const establishedEvent = scheduledEvents.find(
      e => e.id === 'transcaucasian-democratic-federative-republic-established'
    );
    const regions: RegionState = {
      AZE: r('AZE', 'tdfr'),
      ARM: r('ARM', 'tdfr'),
      GEO: r('GEO', 'tdfr'),
      'TR-08': r('TR-08', 'ottoman'),
      'TR-25': r('TR-25', 'tdfr'),
      'TR-04': r('TR-04', 'tdfr'),
    };

    expect(event).toBeDefined();
    expect(establishedEvent).toBeDefined();

    const result = processScheduledEvents(
      [event!], new Date(1918, 4, 26), regions, [], [], {},
      [{ ...establishedEvent!, triggered: false }]
    );

    expect(result.updatedScheduledEvents[0].triggered).toBe(false);
    expect(result.updatedRegions.AZE.owner).toBe('tdfr');
    expect(result.updatedRegions.GEO.owner).toBe('tdfr');
  });
});

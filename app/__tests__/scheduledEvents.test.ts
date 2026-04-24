import { describe, expect, it } from 'vitest';
import { scheduledEvents } from '../data/scheduledEvents';
import { processScheduledEvents } from '../domain/game/logic/scheduledEventProcessing';
import type { Relationship, RegionState } from '../types/game';

describe('scheduled events', () => {
  it('establishes Moldavia as a White Army puppet on December 16, 1917', () => {
    const event = scheduledEvents.find(
      scheduledEvent => scheduledEvent.id === 'moldavian-democratic-republic-established'
    );
    const regions: RegionState = {
      MDA: {
        id: 'MDA',
        name: 'Bessarabia',
        countryIso3: 'MDA',
        owner: 'white',
      },
    };

    expect(event).toBeDefined();
    expect(event?.date).toBe('1917-12-16');

    const result = processScheduledEvents(
      [event!],
      new Date(1917, 11, 16),
      regions,
      [],
      []
    );

    expect(result.updatedRegions.MDA.owner).toBe('moldavia');
    expect(result.updatedRelationships).toContainEqual({
      fromCountry: 'white',
      toCountry: 'moldavia',
      type: 'autonomy',
    });
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('makes Kuban join the White Army wars when the Kuban People\'s Republic is established', () => {
    const event = scheduledEvents.find(
      scheduledEvent => scheduledEvent.id === 'kuban-peoples-republic-established'
    );
    const regions: RegionState = {
      'RU-KDA': {
        id: 'RU-KDA',
        name: 'Krasnodar Krai',
        countryIso3: 'RUS',
        owner: 'white',
      },
      'RU-AD': {
        id: 'RU-AD',
        name: 'Adygea',
        countryIso3: 'RUS',
        owner: 'white',
      },
    };
    const relationships: Relationship[] = [
      { fromCountry: 'white', toCountry: 'soviet', type: 'war' },
      { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
    ];

    expect(event).toBeDefined();
    expect(event?.date).toBe('1918-01-28');

    const result = processScheduledEvents(
      [event!],
      new Date(1918, 0, 28),
      regions,
      relationships,
      []
    );

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
    const event = scheduledEvents.find(
      scheduledEvent => scheduledEvent.id === 'moldavian-independence'
    );
    const relationships: Relationship[] = [
      { fromCountry: 'white', toCountry: 'moldavia', type: 'autonomy' },
      { fromCountry: 'white', toCountry: 'ukraine', type: 'autonomy' },
    ];

    expect(event).toBeDefined();
    expect(event?.date).toBe('1918-02-06');

    const result = processScheduledEvents(
      [event!],
      new Date(1918, 1, 6),
      {},
      relationships,
      []
    );

    expect(result.updatedRelationships).not.toContainEqual({
      fromCountry: 'white',
      toCountry: 'moldavia',
      type: 'autonomy',
    });
    expect(result.updatedRelationships).toContainEqual({
      fromCountry: 'white',
      toCountry: 'ukraine',
      type: 'autonomy',
    });
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('makes every attacker and defender puppet join scheduled war declarations', () => {
    const event = scheduledEvents.find(
      scheduledEvent => scheduledEvent.id === 'treaty-of-brest-litovsk-ukraine'
    );
    const relationships: Relationship[] = [
      { fromCountry: 'germany', toCountry: 'poland', type: 'autonomy' },
      { fromCountry: 'poland', toCountry: 'balticdutchy', type: 'autonomy' },
      { fromCountry: 'soviet', toCountry: 'ukrainesoviet', type: 'autonomy' },
      { fromCountry: 'soviet', toCountry: 'odessa', type: 'autonomy' },
    ];

    expect(event).toBeDefined();
    expect(event?.date).toBe('1918-02-09');

    const result = processScheduledEvents(
      [event!],
      new Date(1918, 1, 9),
      {},
      relationships,
      []
    );

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
    const event = scheduledEvents.find(
      scheduledEvent => scheduledEvent.id === 'retreat-from-tabriz'
    );
    const regions: RegionState = {
      'IR-01': {
        id: 'IR-01',
        name: 'East Azerbaijan',
        countryIso3: 'IRN',
        owner: 'white',
      },
      'IR-02': {
        id: 'IR-02',
        name: 'West Azerbaijan',
        countryIso3: 'IRN',
        owner: 'white',
      },
      'IR-03': {
        id: 'IR-03',
        name: 'Ardabil',
        countryIso3: 'IRN',
        owner: 'soviet',
      },
      GEO: {
        id: 'GEO',
        name: 'Georgia',
        countryIso3: 'GEO',
        owner: 'white',
      },
    };

    expect(event).toBeDefined();
    expect(event?.date).toBe('1918-02-28');

    const result = processScheduledEvents(
      [event!],
      new Date(1918, 1, 28),
      regions,
      [],
      []
    );

    expect(result.updatedRegions['IR-01'].owner).toBe('persia');
    expect(result.updatedRegions['IR-02'].owner).toBe('persia');
    expect(result.updatedRegions['IR-03'].owner).toBe('soviet');
    expect(result.updatedRegions.GEO.owner).toBe('white');
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('establishes the Transcaucasian Democratic Federative Republic on April 22, 1918', () => {
    const event = scheduledEvents.find(
      scheduledEvent => scheduledEvent.id === 'transcaucasian-democratic-federative-republic-established'
    );
    const regions: RegionState = {
      GEO: {
        id: 'GEO',
        name: 'Georgia',
        countryIso3: 'GEO',
        owner: 'white',
      },
      ARM: {
        id: 'ARM',
        name: 'Armenia',
        countryIso3: 'ARM',
        owner: 'white',
      },
      AZE: {
        id: 'AZE',
        name: 'Azerbaijan',
        countryIso3: 'AZE',
        owner: 'white',
      },
      'GE-01': {
        id: 'GE-01',
        name: 'Abkhazia',
        countryIso3: 'GEO',
        owner: 'soviet',
      },
    };

    expect(event).toBeDefined();
    expect(event?.date).toBe('1918-04-22');

    const result = processScheduledEvents(
      [event!],
      new Date(1918, 3, 22),
      regions,
      [],
      []
    );

    expect(result.updatedRegions.GEO.owner).toBe('tdfr');
    expect(result.updatedRegions.ARM.owner).toBe('tdfr');
    expect(result.updatedRegions.AZE.owner).toBe('tdfr');
    expect(result.updatedRegions['GE-01'].owner).toBe('soviet');
    expect(Object.values(result.updatedDivisions)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        owner: 'tdfr',
        regionId: 'GEO',
        armyGroupId: 'tdfr-ag-spawned',
      }),
    ]));
    expect(result.updatedArmyGroups).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'tdfr-ag-spawned',
        owner: 'tdfr',
        name: 'Transcaucasian Defense Force',
      }),
    ]));
    expect(result.updatedRelationships).toEqual(expect.arrayContaining([
      { fromCountry: 'ottoman', toCountry: 'tdfr', type: 'war' },
      { fromCountry: 'tdfr', toCountry: 'ottoman', type: 'war' },
    ]));
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('dissolves the TDFR on May 26, 1918 by splitting its held regions between Azerbaijan, Armenia, and Georgia', () => {
    const event = scheduledEvents.find(
      scheduledEvent => scheduledEvent.id === 'dissolution-of-the-transcaucasian-democratic-federative-republic'
    );
    const regions: RegionState = {
      AZE: {
        id: 'AZE',
        name: 'Azerbaijan',
        countryIso3: 'AZE',
        owner: 'tdfr',
      },
      ARM: {
        id: 'ARM',
        name: 'Armenia',
        countryIso3: 'ARM',
        owner: 'tdfr',
      },
      'AM-01': {
        id: 'AM-01',
        name: 'Yerevan',
        countryIso3: 'ARM',
        owner: 'tdfr',
      },
      GEO: {
        id: 'GEO',
        name: 'Georgia',
        countryIso3: 'GEO',
        owner: 'tdfr',
      },
      'TR-08': {
        id: 'TR-08',
        name: 'Artvin',
        countryIso3: 'TUR',
        owner: 'tdfr',
      },
      'RU-MOW': {
        id: 'RU-MOW',
        name: 'Moscow',
        countryIso3: 'RUS',
        owner: 'tdfr',
      },
    };

    expect(event).toBeDefined();
    expect(event?.date).toBe('1918-05-26');

    const result = processScheduledEvents(
      [event!],
      new Date(1918, 4, 26),
      regions,
      [],
      []
    );

    expect(result.updatedRegions.AZE.owner).toBe('adr');
    expect(result.updatedRegions.ARM.owner).toBe('armenia');
    expect(result.updatedRegions['AM-01'].owner).toBe('armenia');
    expect(result.updatedRegions.GEO.owner).toBe('georgia');
    expect(result.updatedRegions['TR-08'].owner).toBe('georgia');
    expect(result.updatedRegions['RU-MOW'].owner).toBe('georgia');
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('establishes the Mountainous Republic of the Northern Caucasus on May 11, 1918', () => {
    const event = scheduledEvents.find(
      scheduledEvent => scheduledEvent.id === 'mountainous-republic-of-the-northern-caucasus-independence'
    );
    const regions: RegionState = {
      'RU-IN': {
        id: 'RU-IN',
        name: 'Ingushetia',
        countryIso3: 'RUS',
        owner: 'white',
      },
      'RU-CE': {
        id: 'RU-CE',
        name: 'Chechnya',
        countryIso3: 'RUS',
        owner: 'white',
      },
    };

    expect(event).toBeDefined();
    expect(event?.date).toBe('1918-05-11');

    const result = processScheduledEvents(
      [event!],
      new Date(1918, 4, 11),
      regions,
      [],
      []
    );

    expect(result.updatedRegions['RU-IN'].owner).toBe('mrnc');
    expect(result.updatedRegions['RU-CE'].owner).toBe('mrnc');
    expect(result.updatedRelationships).toEqual(expect.arrayContaining([
      { fromCountry: 'mrnc', toCountry: 'white', type: 'military_access' },
      { fromCountry: 'white', toCountry: 'mrnc', type: 'military_access' },
      { fromCountry: 'mrnc', toCountry: 'ottoman', type: 'military_access' },
      { fromCountry: 'ottoman', toCountry: 'mrnc', type: 'military_access' },
    ]));
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('makes MRNC declare war on Soviet Russia when a Soviet-aligned power controls one of its core regions', () => {
    const events = scheduledEvents.filter(
      scheduledEvent =>
        scheduledEvent.id === 'mountainous-republic-of-the-northern-caucasus-independence' ||
        scheduledEvent.id === 'mrnc-war-with-soviet-russia'
    );
    const regions: RegionState = {
      'RU-IN': {
        id: 'RU-IN',
        name: 'Ingushetia',
        countryIso3: 'RUS',
        owner: 'white',
      },
      'RU-CE': {
        id: 'RU-CE',
        name: 'Chechnya',
        countryIso3: 'RUS',
        owner: 'white',
      },
      'RU-KB': {
        id: 'RU-KB',
        name: 'Kabardino-Balkaria',
        countryIso3: 'RUS',
        owner: 'northcaucasian',
      },
    };
    const relationships: Relationship[] = [
      { fromCountry: 'soviet', toCountry: 'northcaucasian', type: 'autonomy' },
    ];

    const result = processScheduledEvents(
      events,
      new Date(1918, 4, 11),
      regions,
      relationships,
      []
    );

    expect(result.updatedRelationships).toEqual(expect.arrayContaining([
      { fromCountry: 'mrnc', toCountry: 'soviet', type: 'war' },
      { fromCountry: 'soviet', toCountry: 'mrnc', type: 'war' },
      { fromCountry: 'mrnc', toCountry: 'northcaucasian', type: 'war' },
      { fromCountry: 'northcaucasian', toCountry: 'mrnc', type: 'war' },
    ]));
    expect(result.updatedScheduledEvents.every(scheduledEvent => scheduledEvent.triggered)).toBe(true);
  });
});

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
});

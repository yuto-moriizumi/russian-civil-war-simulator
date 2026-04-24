import { describe, expect, it } from 'vitest';
import { scheduledEvents } from '../data/scheduledEvents';
import { processScheduledEvents } from '../domain/game/logic/scheduledEventProcessing';
import type { Relationship, RegionState } from '../types/game';

describe('scheduled MRNC events', () => {
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

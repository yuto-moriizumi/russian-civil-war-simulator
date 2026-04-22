import { describe, expect, it } from 'vitest';
import { scheduledEvents } from '../data/scheduledEvents';
import { processScheduledEvents } from '../store/game/tickHelpers/scheduledEventProcessing';
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
});

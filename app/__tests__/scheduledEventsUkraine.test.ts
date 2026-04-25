import { describe, expect, it } from 'vitest';
import { scheduledEvents } from '../data/scheduledEvents';
import { processScheduledEvents } from '../domain/game/logic/scheduledEventProcessing';
import type { Relationship, RegionState } from '../types/game';

describe('scheduled Ukraine events', () => {
  it('transfers Ukrainian core regions held by Germany or its puppets to Ukraine on February 9, 1918', () => {
    const event = scheduledEvents.find(
      scheduledEvent => scheduledEvent.id === 'treaty-of-brest-litovsk-ukraine'
    );
    const regions: RegionState = {
      'BY-BR': {
        id: 'BY-BR',
        name: 'Brest Region',
        countryIso3: 'BLR',
        owner: 'germany',
      },
      'UA-40': {
        id: 'UA-40',
        name: 'Sevastopol',
        countryIso3: 'UKR',
        owner: 'poland',
      },
      'UA-43': {
        id: 'UA-43',
        name: 'Crimea',
        countryIso3: 'UKR',
        owner: 'balticdutchy',
      },
      'UA-51': {
        id: 'UA-51',
        name: 'Odessa',
        countryIso3: 'UKR',
        owner: 'ottoman',
      },
      'RU-MOW': {
        id: 'RU-MOW',
        name: 'Moscow',
        countryIso3: 'RUS',
        owner: 'poland',
      },
    };
    const relationships: Relationship[] = [
      { fromCountry: 'germany', toCountry: 'poland', type: 'autonomy' },
      { fromCountry: 'poland', toCountry: 'balticdutchy', type: 'autonomy' },
    ];

    expect(event).toBeDefined();

    const result = processScheduledEvents(
      [event!],
      new Date(1918, 1, 9),
      regions,
      relationships,
      []
    );

    expect(result.updatedRegions['BY-BR'].owner).toBe('ukraine');
    expect(result.updatedRegions['UA-40'].owner).toBe('ukraine');
    expect(result.updatedRegions['UA-43'].owner).toBe('ukraine');
    expect(result.updatedRegions['UA-51'].owner).toBe('ottoman');
    expect(result.updatedRegions['RU-MOW'].owner).toBe('poland');
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });
});

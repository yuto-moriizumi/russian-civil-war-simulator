import { describe, expect, it } from 'vitest';
import { scheduledEvents } from '../data/scheduledEvents';
import { processScheduledEvents } from '../store/game/tickHelpers/scheduledEventProcessing';
import type { RegionState } from '../types/game';

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
        divisions: [],
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
});

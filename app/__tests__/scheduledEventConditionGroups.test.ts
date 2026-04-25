import { describe, expect, it } from 'vitest';
import { processScheduledEvents } from '../domain/game/logic/scheduledEventProcessing';
import type { Region, RegionState, Relationship, ScheduledEvent } from '../types/game';

const r = (id: string, owner: Region['owner']): Region =>
  ({ id, name: id, countryIso3: id, owner }) as Region;

describe('scheduled event condition groups', () => {
  it('supports nested and condition groups inside scheduled event conditions', () => {
    const event: ScheduledEvent = {
      id: 'nested-and-condition-test',

      title: 'Nested AND Condition Test',
      description: 'Tests nested AND condition evaluation for scheduled events.',
      conditions: [
        {
          type: 'and',
          conditions: [
            {
              type: 'atLeastOneRegionOwnedByOrPuppetOf',
              regions: ['RU-KDA'],
              country: 'soviet',
            },
            {
              type: 'eventTriggered',
              eventId: 'transcaucasian-democratic-federative-republic-established',
            },
          ],
        },
      ],
      actions: [
        { type: 'transferRegion', regionId: 'GEO', newOwner: 'tdfr' },
      ],
      triggered: false,
    };
    const regions: RegionState = {
      GEO: r('GEO', 'white'),
      'RU-KDA': r('RU-KDA', 'kuban_soviet'),
    };
    const relationships: Relationship[] = [
      { fromCountry: 'soviet', toCountry: 'kuban_soviet', type: 'autonomy' },
    ];

    const result = processScheduledEvents(
      [event],
      new Date(1918, 3, 10),
      regions,
      relationships,
      [],
      {},
      [
        {
          ...event,
          id: 'transcaucasian-democratic-federative-republic-established',
          triggered: true,
        },
      ]
    );

    expect(result.updatedRegions.GEO.owner).toBe('tdfr');
    expect(result.updatedScheduledEvents[0].triggered).toBe(true);
  });

  it('does not trigger nested and groups when one child condition fails', () => {
    const event: ScheduledEvent = {
      id: 'nested-and-condition-failure-test',

      title: 'Nested AND Condition Failure Test',
      description: 'Tests that nested AND groups require every child condition.',
      conditions: [
        {
          type: 'and',
          conditions: [
            {
              type: 'atLeastOneRegionOwnedByOrPuppetOf',
              regions: ['RU-KDA'],
              country: 'soviet',
            },
            {
              type: 'eventTriggered',
              eventId: 'transcaucasian-democratic-federative-republic-established',
            },
          ],
        },
      ],
      actions: [
        { type: 'transferRegion', regionId: 'GEO', newOwner: 'tdfr' },
      ],
      triggered: false,
    };
    const regions: RegionState = {
      GEO: r('GEO', 'white'),
      'RU-KDA': r('RU-KDA', 'kuban_soviet'),
    };
    const relationships: Relationship[] = [
      { fromCountry: 'soviet', toCountry: 'kuban_soviet', type: 'autonomy' },
    ];

    const result = processScheduledEvents([event], new Date(1918, 3, 10), regions, relationships, []);

    expect(result.updatedRegions.GEO.owner).toBe('white');
    expect(result.updatedScheduledEvents[0].triggered).toBe(false);
  });
});

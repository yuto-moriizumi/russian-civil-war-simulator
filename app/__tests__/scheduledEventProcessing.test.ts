import { describe, expect, it } from 'vitest';
import { scheduledEvents } from '../data/scheduledEvents';
import { processScheduledEvents } from '../domain/game/tickHelpers/scheduledEventProcessing';
import type { CountryId, Relationship, ScheduledEvent } from '../types/game';

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

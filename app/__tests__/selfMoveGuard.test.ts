import { describe, it, expect } from 'vitest';
import { applyCompletedMovements } from '../store/game/tickHelpers/movementApplication';
import type { Division, Movement, Region, RegionState, Relationship } from '../types/game';

const D0 = new Date('1918-01-01T00:00:00Z');
const NOW = new Date('1918-01-01T12:00:00Z');
const NO_REL: Relationship[] = [];

function makeDiv(overrides: Partial<Division> = {}): Division {
  return { id: 'div-1', name: '1st', owner: 'soviet', armyGroupId: 'ag-1',
    hp: 100, maxHp: 100, attack: 10, defence: 15, ...overrides };
}

function makeRegion(id: string, overrides: Partial<Region> = {}): Region {
  return { id, name: id, countryIso3: 'RUS', owner: 'soviet', divisions: [], ...overrides };
}

function makeMovement(overrides: Partial<Movement> = {}): Movement {
  const arr = new Date(D0);
  arr.setHours(arr.getHours() + 12);
  return { id: 'mv-1', fromRegion: 'A', toRegion: 'B', divisions: [makeDiv()],
    departureTime: D0, arrivalTime: arr, owner: 'soviet', ...overrides };
}

describe('applyCompletedMovements – self-move guard', () => {
  it('does not duplicate divisions when fromRegion === toRegion', () => {
    // Simulates a retreat movement that targets the same region it departed from.
    // Before the fix this caused divisions to be added twice (removed then re-added
    // using the pre-removal snapshot, doubling the count).
    const div = makeDiv({ id: 'retreating' });
    const regions: RegionState = { A: makeRegion('A', { divisions: [div] }) };
    const selfMove = makeMovement({
      fromRegion: 'A',
      toRegion: 'A',
      divisions: [div],
      arrivalTime: NOW,
    });
    const { nextRegions } = applyCompletedMovements([selfMove], [selfMove], {
      regions,
      combats: [],
      events: [],
      notifications: [],
      relationships: NO_REL,
    }, NOW);
    expect(nextRegions['A'].divisions).toHaveLength(1);
  });
});

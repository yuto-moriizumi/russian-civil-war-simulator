import { describe, it, expect } from 'vitest';
import { applyCompletedMovements } from '../store/game/tickHelpers/movementApplication';
import type { Division, DivisionState, Movement, Region, RegionState, Relationship } from '../types/game';

const D0 = new Date('1918-01-01T00:00:00Z');
const NOW = new Date('1918-01-01T12:00:00Z');
const NO_REL: Relationship[] = [];

function makeDiv(overrides: Partial<Division> = {}): Division {
  return { id: 'div-1', name: '1st', owner: 'soviet', armyGroupId: 'ag-1',
    hp: 100, maxHp: 100, attack: 10, defence: 15, regionId: null, ...overrides };
}

function makeRegion(id: string, overrides: Partial<Region> = {}): Region {
  return { id, name: id, countryIso3: 'RUS', owner: 'soviet', ...overrides };
}

function makeMovement(overrides: Partial<Movement> = {}): Movement {
  const arr = new Date(D0);
  arr.setHours(arr.getHours() + 12);
  const div = makeDiv();
  return { id: 'mv-1', fromRegion: 'A', toRegion: 'B', divisionIds: [div.id],
    departureTime: D0, arrivalTime: arr, owner: 'soviet', ...overrides };
}

describe('applyCompletedMovements – self-move guard', () => {
  it('does not duplicate divisions when fromRegion === toRegion', () => {
    const div = makeDiv({ id: 'retreating', regionId: 'A' });
    const divisions: DivisionState = { 'retreating': div };
    const regions: RegionState = { A: makeRegion('A') };
    const selfMove = makeMovement({
      fromRegion: 'A',
      toRegion: 'A',
      divisionIds: [div.id],
      arrivalTime: NOW,
    });
    const { nextDivisions } = applyCompletedMovements([selfMove], [selfMove], {
      regions,
      divisions,
      combats: [],
      events: [],
      notifications: [],
      relationships: NO_REL,
    }, NOW);
    expect(Object.values(nextDivisions).filter(d => d.regionId === 'A')).toHaveLength(1);
  });
});

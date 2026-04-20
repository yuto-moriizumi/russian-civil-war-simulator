import { describe, it, expect } from 'vitest';
import { createTickActions } from '../store/game/tickActions';
import { initialGameState } from '../store/game/initialState';
import type { GameStore } from '../store/game/types';
import type { Division, Movement, RegionState } from '../types/game';

function makeDiv(overrides: Partial<Division> = {}): Division {
  return {
    id: 'div-1',
    name: '1st Division',
    owner: 'soviet',
    armyGroupId: 'ag-1',
    hp: 100,
    maxHp: 100,
    attack: 10,
    defence: 15,
    ...overrides,
  };
}

describe('tick mid-transit combat handling', () => {
  it('moves newly attacked defender divisions from the region into combat without duplicating them', () => {
    const attacker = makeDiv({ id: 'attacker' });
    const defender = makeDiv({ id: 'defender', owner: 'white', armyGroupId: 'ag-white' });
    const regions: RegionState = {
      A: { id: 'A', name: 'A', countryIso3: 'RUS', owner: 'soviet', divisions: [attacker] },
      B: { id: 'B', name: 'B', countryIso3: 'RUS', owner: 'white', divisions: [defender] },
    };
    const movement: Movement = {
      id: 'mv-1',
      fromRegion: 'A',
      toRegion: 'B',
      divisions: [attacker],
      departureTime: new Date('1918-01-01T00:00:00Z'),
      arrivalTime: new Date('1918-01-01T12:00:00Z'),
      owner: 'soviet',
    };

    let state = {
      ...initialGameState,
      isPlaying: true,
      selectedCountry: null,
      dateTime: new Date('1918-01-01T00:00:00Z'),
      regions,
      adjacency: { A: ['B'], B: ['A'] },
      movingUnits: [movement],
      activeCombats: [],
      armyGroups: [
        { id: 'ag-1', name: 'Soviet AG', owner: 'soviet', regionIds: ['A'], color: '#3B82F6', mode: 'none' as const },
        { id: 'ag-white', name: 'White AG', owner: 'white', regionIds: ['B'], color: '#10B981', mode: 'none' as const },
      ],
      productionQueues: {},
      relationships: [],
      scheduledEvents: [],
      regionCentroids: {},
      borderMidpoints: {},
      gameEvents: [],
      notifications: [],
      aiStates: [],
      theaters: [],
      missions: [],
      detectAndUpdateTheaters: () => {},
    } as unknown as GameStore;

    const set = ((partial: Partial<GameStore>) => {
      state = { ...state, ...partial };
    }) as unknown as Parameters<typeof createTickActions>[0];
    const get = (() => state) as unknown as Parameters<typeof createTickActions>[1];

    createTickActions(set, get).tick();

    expect(state.activeCombats).toHaveLength(1);
    expect(state.activeCombats[0].defenderDivisions.map(d => d.id)).toEqual(['defender']);
    expect(state.regions.B.divisions).toHaveLength(0);
    expect(state.movingUnits[0].pendingCombatId).toBe(state.activeCombats[0].id);
  });
});

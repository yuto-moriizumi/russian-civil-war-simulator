import { describe, it, expect } from 'vitest';
import { createTickActions } from '../store/game/tickActions';
import { initialGameState } from '../store/game/initialState';
import type { GameStore } from '../store/game/types';
import type { Country, Division, DivisionState, Mission, Movement, RegionState } from '../types/game';

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
    regionId: 'test-region',
    ...overrides,
  };
}

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: 'mission-1',
    country: 'white',
    name: 'Ready Mission',
    description: 'A mission that is immediately ready.',
    completed: false,
    claimed: false,
    rewards: { attackBonus: 2 },
    prerequisites: [],
    available: [{ type: 'controlRegionCount', count: 1 }],
    ...overrides,
  };
}

const SOVIET_COUNTRY: Country = {
  id: 'soviet',
  name: 'Soviet Russia',
  flag: '',
  color: '#dc2626',
};

const WHITE_COUNTRY: Country = {
  id: 'white',
  name: 'White Movement',
  flag: '',
  color: '#f8fafc',
};

function runSingleTick(initialState: Partial<GameStore>): GameStore {
  let state = {
    ...initialGameState,
    isPlaying: true,
    dateTime: new Date('1918-01-01T00:00:00Z'),
    regions: {},
    divisions: {},
    adjacency: {},
    movingUnits: [],
    activeCombats: [],
    armyGroups: [],
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
    ...initialState,
  } as unknown as GameStore;

  const set = ((partial: Partial<GameStore>) => {
    state = { ...state, ...partial };
  }) as unknown as Parameters<typeof createTickActions>[0];
  const get = (() => state) as unknown as Parameters<typeof createTickActions>[1];

  createTickActions(set, get).tick();
  return state;
}

describe('tick mid-transit combat handling', () => {
  it('moves newly attacked defender divisions from the region into combat without duplicating them', () => {
    const attacker = makeDiv({ id: 'attacker', regionId: 'A' });
    const defender = makeDiv({ id: 'defender', owner: 'white', armyGroupId: 'ag-white', regionId: 'B' });
    const divisions: DivisionState = {
      'attacker': attacker,
      'defender': defender,
    };
    const regions: RegionState = {
      A: { id: 'A', name: 'A', countryIso3: 'RUS', owner: 'soviet' },
      B: { id: 'B', name: 'B', countryIso3: 'RUS', owner: 'white' },
    };
    const movement: Movement = {
      id: 'mv-1',
      fromRegion: 'A',
      toRegion: 'B',
      divisionIds: ['attacker'],
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
      divisions,
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
    } as unknown as GameStore;

    const set = ((partial: Partial<GameStore>) => {
      state = { ...state, ...partial };
    }) as unknown as Parameters<typeof createTickActions>[0];
    const get = (() => state) as unknown as Parameters<typeof createTickActions>[1];

    createTickActions(set, get).tick();

    expect(state.activeCombats).toHaveLength(1);
    expect(state.activeCombats[0].defenderDivisionIds).toEqual(['defender']);
    // Defender division keeps its regionId — it is defending region B
    const defenderInRegion = Object.values(state.divisions).filter(d => d.regionId === 'B' && d.id === 'defender');
    expect(defenderInRegion).toHaveLength(1);
    expect(state.movingUnits[0].pendingCombatId).toBe(state.activeCombats[0].id);
    expect(state.divisions.defender.regionId).toBe('B');
    expect(state.divisions.defender.id).toBe(state.activeCombats[0].defenderDivisionIds[0]);
  });
});

describe('tick AI state for new countries from scheduled events', () => {
  it('creates an AI state and army group for a country that appears via scheduled events', () => {
    // 'crimea' appears in regions but has no aiState entry (simulates a scheduled event spawn)
    const crimeaDivision = makeDiv({ id: 'crimea-1', owner: 'crimea' as never, armyGroupId: 'crimea-ag', regionId: 'UA-43' });
    const divisions: DivisionState = { 'crimea-1': crimeaDivision };
    const regions: RegionState = {
      'UA-43': { id: 'UA-43', name: 'Crimea', countryIso3: 'CRI', owner: 'crimea' as never },
    };

    const state = runSingleTick({
      selectedCountry: SOVIET_COUNTRY,
      regions,
      divisions,
      aiStates: [], // 'crimea' is NOT in aiStates yet
      armyGroups: [
        { id: 'crimea-ag', name: 'Crimean Army', owner: 'crimea' as never, regionIds: ['UA-43'], color: '#CE1126', mode: 'none' as const, theaterId: null },
      ],
    });

    const crimeaAIState = state.aiStates.find(s => s.countryId === ('crimea' as never));
    expect(crimeaAIState).toBeDefined();
  });
});

describe('tick mission completion', () => {
  it('auto-completes and claims available AI country missions', () => {
    const whiteDivision = makeDiv({ id: 'white-1', owner: 'white', armyGroupId: 'ag-white', regionId: 'A' });
    const divisions: DivisionState = { 'white-1': whiteDivision };
    const regions: RegionState = {
      A: { id: 'A', name: 'A', countryIso3: 'RUS', owner: 'white' },
    };

    const state = runSingleTick({
      selectedCountry: SOVIET_COUNTRY,
      regions,
      divisions,
      missions: [makeMission()],
      aiStates: [{ countryId: 'white' }],
      armyGroups: [
        { id: 'ag-white', name: 'White AG', owner: 'white', regionIds: ['A'], color: '#10B981', mode: 'none' as const, theaterId: null },
      ],
    });

    const mission = state.missions.find(m => m.id === 'mission-1');
    expect(mission?.completed).toBe(true);
    expect(mission?.claimed).toBe(true);
    expect(state.countryBonuses.white.attackBonus).toBe(2);
    expect(state.divisions['white-1'].attack).toBe(12);
  });

  it('leaves selected country missions ready to claim instead of claiming them automatically', () => {
    const whiteDivision = makeDiv({ id: 'white-1', owner: 'white', armyGroupId: 'ag-white', regionId: 'A' });
    const divisions: DivisionState = { 'white-1': whiteDivision };
    const regions: RegionState = {
      A: { id: 'A', name: 'A', countryIso3: 'RUS', owner: 'white' },
    };

    const state = runSingleTick({
      selectedCountry: WHITE_COUNTRY,
      regions,
      divisions,
      missions: [makeMission()],
      armyGroups: [
        { id: 'ag-white', name: 'White AG', owner: 'white', regionIds: ['A'], color: '#10B981', mode: 'none' as const, theaterId: null },
      ],
    });

    const mission = state.missions.find(m => m.id === 'mission-1');
    expect(mission?.completed).toBe(true);
    expect(mission?.claimed).toBe(false);
    expect(state.countryBonuses.white.attackBonus).toBe(0);
    expect(state.divisions['white-1'].attack).toBe(10);
  });
});

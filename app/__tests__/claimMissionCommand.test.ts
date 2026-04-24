import { describe, expect, it } from 'vitest';
import { applyGameCommand } from '../domain/game/commands';
import type { EngineSimulationState } from '../domain/game/engine/types';
import { initialGameState } from '../store/game/initialState';
import { createBasicActions } from '../store/game/basicActions';
import type { Country, Division, Mission } from '../types/game';
import type { GameStore } from '../store/game/types';

const SOVIET_COUNTRY: Country = {
  id: 'soviet',
  name: 'Soviet Russia',
  flag: '',
  color: '#dc2626',
};

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: 'mission-1',
    country: 'soviet',
    name: 'Ready Mission',
    description: 'A mission that is immediately ready.',
    completed: true,
    claimed: false,
    rewards: { attackBonus: 2 },
    prerequisites: [],
    ...overrides,
  };
}

function makeDivision(overrides: Partial<Division> = {}): Division {
  return {
    id: 'div-1',
    name: '1st Division',
    owner: 'soviet',
    armyGroupId: 'ag-1',
    hp: 100,
    maxHp: 100,
    attack: 10,
    defence: 15,
    regionId: 'A',
    ...overrides,
  };
}

function createEngineState(overrides: Partial<EngineSimulationState> = {}): EngineSimulationState {
  const baseState: EngineSimulationState = {
    dateTime: new Date('1918-01-01T00:00:00Z'),
    selectedCountry: SOVIET_COUNTRY,
    isPlayerAIEnabled: false,
    regions: {
      A: { id: 'A', name: 'A', countryIso3: 'RUS', owner: 'soviet' },
    },
    regionDefinitions: {
      A: { id: 'A', name: 'A', countryIso3: 'RUS' },
    },
    adjacency: {},
    regionCentroids: {},
    divisions: {
      'div-1': makeDivision(),
    },
    movingUnits: [],
    activeCombats: [],
    armyGroups: [
      { id: 'ag-1', name: 'Army Group 1', owner: 'soviet', regionIds: ['A'], color: '#3B82F6', theaterId: null, mode: 'none' as const },
    ],
    theaters: [],
    productionQueues: initialGameState.productionQueues,
    relationships: [],
    scheduledEvents: [],
    countryBonuses: initialGameState.countryBonuses,
    modifiers: initialGameState.modifiers,
    aiStates: [],
    missions: [makeMission()],
    gameEvents: [],
    notifications: [],
  };

  return {
    ...baseState,
    ...overrides,
  };
}

function createActionHarness(initialState: Partial<GameStore>) {
  let state = {
    ...initialGameState,
    regions: {},
    regionDefinitions: {},
    adjacency: {},
    regionCentroids: {},
    borderMidpoints: {},
    divisions: {},
    movingUnits: [],
    activeCombats: [],
    armyGroups: [],
    theaters: [],
    relationships: [],
    scheduledEvents: [],
    aiStates: [],
    gameEvents: [],
    notifications: [],
    missions: [],
    ...initialState,
  } as GameStore;

  const set = (patch: Partial<GameStore> | ((state: GameStore) => Partial<GameStore> | GameStore)) => {
    const nextPatch = typeof patch === 'function' ? patch(state) : patch;
    state = { ...state, ...nextPatch };
  };
  const get = () => state;

  return {
    actions: createBasicActions(set as never, get as never),
    getState: get,
  };
}

describe('applyGameCommand claim mission', () => {
  it('claims a completed mission entirely within the domain layer', () => {
    const result = applyGameCommand(createEngineState(), {
      type: 'CLAIM_MISSION',
      missionId: 'mission-1',
    });

    expect(result.applied).toBe(true);
    expect(result.state.missions[0].claimed).toBe(true);
    expect(result.state.countryBonuses.soviet.attackBonus).toBe(2);
    expect(result.state.divisions['div-1'].attack).toBe(12);
    expect(result.state.gameEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'mission_claimed',
        country: 'soviet',
        title: 'Mission Completed: Ready Mission',
      }),
    ]));
    expect(result.state.notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'mission_claimed',
        country: 'soviet',
      }),
    ]));
  });

  it('returns unapplied when the mission is not claimable', () => {
    const baseState = createEngineState({
      missions: [makeMission({ completed: false })],
    });

    const result = applyGameCommand(baseState, {
      type: 'CLAIM_MISSION',
      missionId: 'mission-1',
    });

    expect(result.applied).toBe(false);
    expect(result.state).toBe(baseState);
  });
});

describe('basicActions claimMission', () => {
  it('applies the domain command result through the store adapter', () => {
    const { actions, getState } = createActionHarness({
      selectedCountry: SOVIET_COUNTRY,
      regionDefinitions: {
        A: { id: 'A', name: 'A', countryIso3: 'RUS' },
      },
      regions: {
        A: { id: 'A', name: 'A', countryIso3: 'RUS', owner: 'soviet' },
      },
      divisions: {
        'div-1': makeDivision(),
      },
      armyGroups: [
        { id: 'ag-1', name: 'Army Group 1', owner: 'soviet', regionIds: ['A'], color: '#3B82F6', theaterId: null, mode: 'none' as const },
      ],
      missions: [makeMission()],
    });

    actions.claimMission('mission-1');

    const state = getState();
    expect(state.missions[0].claimed).toBe(true);
    expect(state.countryBonuses.soviet.attackBonus).toBe(2);
    expect(state.divisions['div-1'].attack).toBe(12);
    expect(state.regionOwners.A).toBe('soviet');
  });
});

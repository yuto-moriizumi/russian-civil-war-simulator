import { describe, expect, it } from 'vitest';
import { createBasicActions } from '../store/game/basicActions';
import { getEffectiveAIStates } from '../store/game/tickActions';
import type { AIState, ArmyGroup, Country, CountryId } from '../types/game';
import type { GameStore } from '../store/game/types';

const playerCountry: Country = {
  id: 'soviet',
  name: 'Soviet Russia',
  flag: '',
  color: '#CC0000',
};

function makeArmyGroup(id: string, owner: CountryId): ArmyGroup {
  return {
    id,
    name: id,
    regionIds: [],
    color: '#000000',
    owner,
    theaterId: null,
    mode: 'none',
  };
}

function createActionHarness(initialState: Partial<GameStore>) {
  let state = initialState as GameStore;
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

describe('player AI toggle', () => {
  it('does not include the player country in AI ticks by default', () => {
    const aiStates: AIState[] = [
      { countryId: 'white' },
      { countryId: 'soviet' },
    ];

    const result = getEffectiveAIStates(aiStates, 'soviet', false);

    expect(result.map(aiState => aiState.countryId)).toEqual(['white']);
  });

  it('adds the player country to AI ticks when enabled', () => {
    const aiStates: AIState[] = [{ countryId: 'white' }];

    const result = getEffectiveAIStates(aiStates, 'soviet', true);

    expect(result.map(aiState => aiState.countryId)).toEqual(['white', 'soviet']);
  });

  it('sets only the player country army groups to automatic mode', () => {
    const { actions, getState } = createActionHarness({
      selectedCountry: playerCountry,
      isPlayerAIEnabled: false,
      armyGroups: [
        makeArmyGroup('player-group', 'soviet'),
        makeArmyGroup('ai-group', 'white'),
      ],
    });

    actions.setPlayerAIEnabled(true);

    expect(getState().isPlayerAIEnabled).toBe(true);
    expect(getState().armyGroups.find(group => group.id === 'player-group')?.mode).toBe('advance');
    expect(getState().armyGroups.find(group => group.id === 'ai-group')?.mode).toBe('none');

    actions.setPlayerAIEnabled(false);

    expect(getState().isPlayerAIEnabled).toBe(false);
    expect(getState().armyGroups.find(group => group.id === 'player-group')?.mode).toBe('none');
  });
});

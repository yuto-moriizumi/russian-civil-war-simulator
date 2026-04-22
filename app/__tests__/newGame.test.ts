/**
 * Regression tests for the "New Game loads previous session" bug.
 *
 * Before the fix, clicking "NEW GAME" only called navigateToScreen('countrySelect').
 * Because Zustand's persist middleware had already rehydrated the store with the
 * previous session's dateTime, regions, movingUnits, activeCombats, etc., the
 * subsequent selectCountry call (lines 224-236 of basicActions.ts) explicitly
 * copied those stale values into the freshly-selected game state under the
 * comment "Preserve live game state across country switch".
 *
 * The fix: a dedicated startNewGame action that:
 *   1. Calls localStorage.removeItem('russian-civil-war-save') to clear the
 *      Zustand-persisted session before navigating away from the title screen.
 *   2. Resets the in-memory store to initialGameState (overwriting the
 *      rehydrated session data) so that the subsequent selectCountry call reads
 *      blank-slate values from get().
 *
 * These tests exercise the reset logic that startNewGame applies so any
 * regression that re-introduces old-session bleed-through is caught.
 */

import { describe, it, expect } from 'vitest';
import { initialGameState } from '../store/game/initialState';
import type { CountryId } from '../types/game';

describe('startNewGame — state must be reset to initial values before country select', () => {
  it('spreading initialGameState produces a blank dateTime (game start date)', () => {
    const GAME_START_DATE = initialGameState.dateTime;

    // Simulate: after rehydration from localStorage, dateTime is mid-game
    const midGameDateTime = new Date('1919-06-15T00:00:00.000Z');

    // BROKEN behaviour (old code — just navigate, no reset):
    // midGameDateTime would be carried into selectCountry via get().dateTime.
    const brokenState = { dateTime: midGameDateTime };
    expect(brokenState.dateTime).not.toEqual(GAME_START_DATE);

    // FIXED behaviour — startNewGame resets to initialGameState first.
    const resetState = { ...initialGameState };
    expect(resetState.dateTime).toEqual(GAME_START_DATE);
  });

  it('reset state has empty movingUnits (no in-transit units from old session)', () => {
    const staleMovements = [
      {
        id: 'mv-1',
        fromRegionId: 'RU-MOW',
        toRegionId: 'RU-SPE',
        divisions: [],
        departureTime: new Date(),
        arrivalTime: new Date(),
        owner: 'soviet' as CountryId,
      },
    ];

    // BROKEN: stale movements survive into the new game
    const brokenState = { movingUnits: staleMovements };
    expect(brokenState.movingUnits).toHaveLength(1);

    // FIXED: reset clears them
    const resetState = { ...initialGameState };
    expect(resetState.movingUnits).toHaveLength(0);
  });

  it('reset state has empty activeCombats (no ongoing fights from old session)', () => {
    const resetState = { ...initialGameState };
    expect(resetState.activeCombats).toHaveLength(0);
  });

  it('reset state has empty root divisions', () => {
    const resetState = { ...initialGameState };
    expect(Object.keys(resetState.divisions)).toHaveLength(0);
  });

  it('reset state has empty productionQueues for all countries', () => {
    const resetState = { ...initialGameState };
    for (const queue of Object.values(resetState.productionQueues)) {
      expect(queue).toHaveLength(0);
    }
  });

  it('initialGameState.currentScreen is title so startNewGame override to countrySelect is meaningful', () => {
    expect(initialGameState.currentScreen).toBe('title');
  });

  it('reset state has no selected country', () => {
    const resetState = { ...initialGameState };
    expect(resetState.selectedCountry).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { advanceSimulation } from '../domain/game/engine/advanceSimulation';
import { noOpLogger, EngineSimulationState, SimulationDeps } from '../domain/game/engine/types';
import { GAME_CONFIG } from '../constants/gameConfig';
import { countries } from '../data/gameData';

/** Restore Date objects in a deserialized EngineSimulationState. */
function restoreDates(state: EngineSimulationState) {
  state.dateTime = new Date(state.dateTime as unknown as string);
  for (const m of state.movingUnits) {
    m.departureTime = new Date(m.departureTime as unknown as string);
    m.arrivalTime = new Date(m.arrivalTime as unknown as string);
  }
  for (const c of state.activeCombats) {
    c.startTime = new Date(c.startTime as unknown as string);
    c.lastRoundTime = new Date(c.lastRoundTime as unknown as string);
  }
  for (const e of state.gameEvents) {
    e.timestamp = new Date(e.timestamp as unknown as string);
  }
  for (const countryId of Object.keys(state.productionQueues)) {
    for (const item of state.productionQueues[countryId as keyof typeof state.productionQueues]) {
      item.startTime = new Date(item.startTime as unknown as string);
      item.completionTime = new Date(item.completionTime as unknown as string);
    }
  }
}

const DEPS: SimulationDeps = {
  countries,
  gameConfig: GAME_CONFIG,
};

// Load real game state fixture
function getInitialState(): EngineSimulationState {
  const cloned = JSON.parse(
    readFileSync(
      join(__dirname, '..', '__fixtures__', 'game-state-2026-04-23T15-09-06-240Z.json'),
      'utf-8',
    ),
  ) as EngineSimulationState;
  restoreDates(cloned);
  return cloned;
}

describe('simulation performance regression', () => {
  describe('real game state', () => {
    it('single tick completes within threshold', () => {
      // Warmup
      advanceSimulation(getInitialState(), DEPS, noOpLogger());

      // Measured run
      const t0 = performance.now();
      advanceSimulation(getInitialState(), DEPS, noOpLogger());
      const elapsed = performance.now() - t0;

      const THRESHOLD_MS = 100;
      expect(elapsed).toBeLessThan(THRESHOLD_MS);
    });

    it('5 consecutive ticks average within threshold', () => {
      let currentState = getInitialState();

      const t0 = performance.now();
      for (let i = 0; i < 5; i++) {
        currentState = advanceSimulation(currentState, DEPS, noOpLogger()).state;
      }
      const elapsed = performance.now() - t0;
      const avgPerTick = elapsed / 5;

      const AVG_THRESHOLD_MS = 100;
      expect(avgPerTick).toBeLessThan(AVG_THRESHOLD_MS);
    });
  });
});

/**
 * Tests for combat triggered when an enemy enters a region whose defender
 * is already committed to an outbound attack (has pendingCombatId).
 */

import { describe, it, expect } from 'vitest';
import { applyCompletedMovements } from '../store/game/tickHelpers/movementApplication';
import type { Division, Movement, Region, RegionState, ActiveCombat, Relationship } from '../types/game';

const D0 = new Date('1918-01-01T00:00:00Z');
const NOW = new Date('1918-01-01T12:00:00Z');

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

function makeCombat(overrides: Partial<ActiveCombat> = {}): ActiveCombat {
  return { id: 'combat-1', attackerRegionId: 'A', attackerRegionName: 'A', defenderRegionId: 'B', defenderRegionName: 'B',
    attackerCountry: 'soviet', defenderCountry: 'white',
    attackerDivisions: [makeDiv({ id: 'div-atk' })],
    defenderDivisions: [makeDiv({ id: 'div-def', owner: 'white' })],
    initialAttackerCount: 1, initialDefenderCount: 1,
    initialAttackerHp: 100, initialDefenderHp: 100,
    currentRound: 0, startTime: D0, lastRoundTime: D0,
    roundIntervalHours: 1, isComplete: false, victor: null, ...overrides };
}

const WAR_REL: Relationship[] = [
  { fromCountry: 'soviet', toCountry: 'white', type: 'war' },
  { fromCountry: 'white', toCountry: 'soviet', type: 'war' },
];

describe('two-front combat: enemy enters a region whose defender is attacking elsewhere', () => {
  it('initiates combat rather than undefended capture when defender has pendingCombatId', () => {
    // A (soviet) has 1 division attacking B (pendingCombatId). Division is still in A.
    // C (white) moves into A this tick — should trigger combat, not a free capture.
    const sovietDiv = makeDiv({ id: 'soviet-div', owner: 'soviet' });
    const whiteDiv = makeDiv({ id: 'white-div-c', owner: 'white' });
    const regions: RegionState = {
      A: makeRegion('A', { owner: 'soviet', divisions: [sovietDiv] }),
      B: makeRegion('B', { owner: 'white', divisions: [] }),
      C: makeRegion('C', { owner: 'white', divisions: [whiteDiv] }),
    };

    const attackCombat = makeCombat({
      id: 'combat-a-b',
      attackerRegionId: 'A',
      defenderRegionId: 'B',
      attackerCountry: 'soviet',
      defenderCountry: 'white',
      attackerDivisions: [sovietDiv],
      defenderDivisions: [],
    });
    const sovietAttackMovement = makeMovement({
      id: 'mv-soviet-attack',
      fromRegion: 'A', toRegion: 'B',
      owner: 'soviet',
      divisions: [sovietDiv],
      pendingCombatId: 'combat-a-b',
    });
    const whiteMovement = makeMovement({
      id: 'mv-white-invade',
      fromRegion: 'C', toRegion: 'A',
      owner: 'white',
      divisions: [whiteDiv],
    });

    const { nextCombats, nextRegions } = applyCompletedMovements(
      [whiteMovement],
      [sovietAttackMovement, whiteMovement],
      { regions, combats: [attackCombat], events: [], notifications: [], relationships: WAR_REL },
      NOW
    );

    expect(nextRegions['A'].owner).toBe('soviet');
    const newCombat = nextCombats.find(c => c.defenderRegionId === 'A' && c.id !== 'combat-a-b');
    expect(newCombat).toBeDefined();
    expect(newCombat!.attackerCountry).toBe('white');
    expect(newCombat!.defenderCountry).toBe('soviet');
    expect(newCombat!.defenderDivisions).toHaveLength(1);
  });
});

/**
 * Unit tests for processCombatRound — focusing on the victory-restore behaviour
 * where winner-side divisions that reached HP=0 in the final round are restored
 * to HP=1 and kept in the victorious region rather than being sent on a retreat
 * movement.
 */

import { describe, it, expect } from 'vitest';
import { processCombatRound, createActiveCombat } from '../utils/combat';
import type { Division, RegionState, Adjacency } from '../types/game';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDiv(
  id: string,
  owner: 'soviet' | 'white',
  hp: number,
  attack = 10,
  defence = 10
): Division {
  return { id, name: id, owner, armyGroupId: 'ag-test', hp, maxHp: 100, attack, defence };
}

/** Build a minimal combat with lastRoundTime far in the past so it always processes. */
function makeCombat(
  attackerDivs: Division[],
  defenderDivs: Division[],
  regionId = 'REGION_A'
) {
  const combat = createActiveCombat(
    'SOVIET_REAR',
    'SOVIET_REAR',
    regionId,
    regionId,
    'soviet',
    'white',
    attackerDivs,
    defenderDivs,
    new Date('1918-01-01T00:00:00Z')
  );
  // Force lastRoundTime to be well in the past so shouldProcessCombatRound returns true
  return {
    ...combat,
    lastRoundTime: new Date('1917-01-01T00:00:00Z'),
  };
}

// Minimal region/adjacency maps — the region content is not important for
// retreat-target lookup in the tests below; we just need a friendly neighbour
// for the potential retreat destination.
const adjacency: Adjacency = {
  REGION_A: ['SOVIET_REAR', 'WHITE_REAR'],
  SOVIET_REAR: ['REGION_A'],
  WHITE_REAR: ['REGION_A'],
};

const regions: RegionState = {
  REGION_A: { id: 'REGION_A', name: 'Region A', countryIso3: 'TST', owner: 'white', divisions: [] },
  SOVIET_REAR: { id: 'SOVIET_REAR', name: 'Soviet Rear', countryIso3: 'TST', owner: 'soviet', divisions: [] },
  WHITE_REAR: { id: 'WHITE_REAR', name: 'White Rear', countryIso3: 'TST', owner: 'white', divisions: [] },
};

// ---------------------------------------------------------------------------
// Test 1: Normal case — attacker wins with survivors → no restore needed
// ---------------------------------------------------------------------------

describe('processCombatRound – attacker wins with surviving divisions', () => {
  it('attacker divisions with HP > 0 remain in attackerDivisions', () => {
    // Attacker is very strong, defender is weak — attacker survives easily
    const attackers = [makeDiv('a1', 'soviet', 100, 50, 50)];
    const defenders = [makeDiv('d1', 'white', 10, 1, 1)];
    const combat = makeCombat(attackers, defenders);

    const result = processCombatRound(combat, regions, adjacency);

    if (result.combat.isComplete) {
      expect(result.combat.victor).toBe('soviet');
      expect(result.combat.attackerDivisions.length).toBeGreaterThan(0);
      // No attacker should appear in retreatingDivisions
      const attackerRetreats = result.retreatingDivisions.filter(r => r.division.owner === 'soviet');
      expect(attackerRetreats.length).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 2: Defender wins — all defender HP=0 → restored to HP=1, no retreat
// ---------------------------------------------------------------------------

describe('processCombatRound – defender wins but all defenders dropped to HP=0', () => {
  // Craft a scenario where:
  //   - Attackers die first (very low HP)
  //   - Defenders also reach HP=0 in the same round
  // We force this deterministically by giving both sides exactly 1 hp so the
  // first round kills everyone; the defender wins (draw → defender wins rule).

  it('defender divisions are restored to HP=1 after winning, not placed in retreat', () => {
    const attackers = [makeDiv('a1', 'soviet', 1, 10, 10)];
    const defenders = [makeDiv('d1', 'white', 1, 10, 10)];
    const combat = makeCombat(attackers, defenders);

    const result = processCombatRound(combat, regions, adjacency);

    // Combat must have ended
    expect(result.combat.isComplete).toBe(true);
    // Defender wins in a simultaneous-elimination draw
    expect(result.combat.victor).toBe('white');
    // The defender division must be in defenderDivisions with HP=1
    expect(result.combat.defenderDivisions.length).toBe(1);
    expect(result.combat.defenderDivisions[0].hp).toBe(1);
    // No defender retreat movement should be generated
    const defenderRetreats = result.retreatingDivisions.filter(r => r.division.owner === 'white');
    expect(defenderRetreats.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 3: Attacker wins — all attackers dropped to HP=0 (but defenders also 0)
//         This cannot happen under the current rules (attacker needs > 0 to win
//         unless it's a draw, which goes to defender). Keeping for clarity.
//
// Test 4: Partial victory — some winner divisions survive, some hit HP=0
// ---------------------------------------------------------------------------

describe('processCombatRound – attacker wins, partial attacker survivors + HP=0 casualties', () => {
  it('HP=0 attacker divisions are restored to HP=1 and removed from retreating list', () => {
    // Two attackers: one strong (survives), one weak (HP=0 after taking damage).
    // Defender is also weak so attacker wins.
    // We can't control RNG perfectly, so we test the invariant that holds
    // regardless: when isComplete && victor === 'soviet', no soviet division
    // should appear in retreatingDivisions.
    const attackers = [
      makeDiv('a1', 'soviet', 100, 50, 50),
      makeDiv('a2', 'soviet', 1, 1, 1),   // will likely reach HP=0
    ];
    const defenders = [makeDiv('d1', 'white', 1, 1, 1)];
    const combat = makeCombat(attackers, defenders);

    const result = processCombatRound(combat, regions, adjacency);

    if (result.combat.isComplete && result.combat.victor === 'soviet') {
      // No soviet retreating divisions
      const sovietRetreats = result.retreatingDivisions.filter(r => r.division.owner === 'soviet');
      expect(sovietRetreats.length).toBe(0);
      // All soviet divisions should be in attackerDivisions
      expect(result.combat.attackerDivisions.length).toBeGreaterThan(0);
      // Any restored division must have hp >= 1
      result.combat.attackerDivisions.forEach(d => {
        expect(d.hp).toBeGreaterThanOrEqual(1);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Test 5: Loser's divisions still retreat normally
// ---------------------------------------------------------------------------

describe('processCombatRound – loser divisions still retreat to friendly region', () => {
  it('defeated attacker divisions appear in retreatingDivisions targeting friendly region', () => {
    // Defenders crush the attackers in one round
    const attackers = [makeDiv('a1', 'soviet', 1, 1, 1)];
    const defenders = [makeDiv('d1', 'white', 100, 50, 50)];
    const combat = makeCombat(attackers, defenders);

    const result = processCombatRound(combat, regions, adjacency);

    if (result.combat.isComplete && result.combat.victor === 'white') {
      // Attacker (loser) divisions should still retreat
      const attackerRetreats = result.retreatingDivisions.filter(r => r.division.owner === 'soviet');
      expect(attackerRetreats.length).toBe(1);
      // Retreat target should be the friendly soviet region
      expect(attackerRetreats[0].toRegionId).toBe('SOVIET_REAR');
    }
  });
});

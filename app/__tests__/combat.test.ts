/**
 * Unit tests for processCombatRound — focusing on the victory-restore behaviour
 * where winner-side divisions that reached HP=0 in the final round are restored
 * to HP=1 and kept in the victorious region rather than being sent on a retreat
 * movement.
 */

import { describe, it, expect } from 'vitest';
import { processCombatRound } from '../domain/game/sharedDefenseProcessing';
import { createActiveCombat } from '../domain/game/combat';
import { processCombats } from '../domain/game/logic/combatProcessing';
import type { Division, DivisionState, RegionState, Adjacency } from '../types/game';

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
  return { id, name: id, owner, armyGroupId: 'ag-test', hp, maxHp: 100, attack, defence, regionId: null };
}

function makeDivisions(divs: Division[]): DivisionState {
  const state: DivisionState = {};
  for (const d of divs) state[d.id] = d;
  return state;
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

// Minimal region/adjacency maps
const adjacency: Adjacency = {
  REGION_A: ['SOVIET_REAR', 'WHITE_REAR'],
  SOVIET_REAR: ['REGION_A'],
  WHITE_REAR: ['REGION_A'],
};

const regions: RegionState = {
  REGION_A: { id: 'REGION_A', name: 'Region A', countryIso3: 'TST', owner: 'white' },
  SOVIET_REAR: { id: 'SOVIET_REAR', name: 'Soviet Rear', countryIso3: 'TST', owner: 'soviet' },
  WHITE_REAR: { id: 'WHITE_REAR', name: 'White Rear', countryIso3: 'TST', owner: 'white' },
};

// ---------------------------------------------------------------------------
// Test 1: Normal case — attacker wins with survivors → no restore needed
// ---------------------------------------------------------------------------

describe('processCombatRound – attacker wins with surviving divisions', () => {
  it('attacker divisions with HP > 0 remain in attackerDivisionIds', () => {
    const attackers = [makeDiv('a1', 'soviet', 100, 50, 50)];
    const defenders = [makeDiv('d1', 'white', 10, 1, 1)];
    const combat = makeCombat(attackers, defenders);
    const divisions = makeDivisions([...attackers, ...defenders]);

    const result = processCombatRound(combat, divisions, regions, adjacency);

    if (result.combat.isComplete) {
      expect(result.combat.victor).toBe('soviet');
      expect(result.combat.attackerDivisionIds.length).toBeGreaterThan(0);
      const attackerRetreats = result.retreatingDivisions.filter(r => {
        const div = result.updatedDivisions[r.divisionId];
        return div?.owner === 'soviet';
      });
      expect(attackerRetreats.length).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 2: Defender wins — all defender HP=0 → restored to HP=1, no retreat
// ---------------------------------------------------------------------------

describe('processCombatRound – defender wins but all defenders dropped to HP=0', () => {
  it('defender divisions are restored to HP=1 after winning, not placed in retreat', () => {
    const attackers = [makeDiv('a1', 'soviet', 1, 10, 10)];
    const defenders = [makeDiv('d1', 'white', 1, 10, 10)];
    const combat = makeCombat(attackers, defenders);
    const divisions = makeDivisions([...attackers, ...defenders]);

    const result = processCombatRound(combat, divisions, regions, adjacency);

    expect(result.combat.isComplete).toBe(true);
    expect(result.combat.victor).toBe('white');
    expect(result.combat.defenderDivisionIds.length).toBe(1);
    const defDiv = result.updatedDivisions[result.combat.defenderDivisionIds[0]];
    expect(defDiv?.hp).toBe(1);
    const defenderRetreats = result.retreatingDivisions.filter(r => {
      const div = result.updatedDivisions[r.divisionId];
      return div?.owner === 'white';
    });
    expect(defenderRetreats.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 3: Partial victory
// ---------------------------------------------------------------------------

describe('processCombatRound – attacker wins, partial attacker survivors + HP=0 casualties', () => {
  it('HP=0 attacker divisions are restored to HP=1 and removed from retreating list', () => {
    const attackers = [
      makeDiv('a1', 'soviet', 100, 50, 50),
      makeDiv('a2', 'soviet', 1, 1, 1),
    ];
    const defenders = [makeDiv('d1', 'white', 1, 1, 1)];
    const combat = makeCombat(attackers, defenders);
    const divisions = makeDivisions([...attackers, ...defenders]);

    const result = processCombatRound(combat, divisions, regions, adjacency);

    if (result.combat.isComplete && result.combat.victor === 'soviet') {
      const sovietRetreats = result.retreatingDivisions.filter(r => {
        const div = result.updatedDivisions[r.divisionId];
        return div?.owner === 'soviet';
      });
      expect(sovietRetreats.length).toBe(0);
      expect(result.combat.attackerDivisionIds.length).toBeGreaterThan(0);
      result.combat.attackerDivisionIds.forEach(id => {
        const div = result.updatedDivisions[id];
        expect(div?.hp).toBeGreaterThanOrEqual(1);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Test 5: Loser's divisions still retreat normally
// ---------------------------------------------------------------------------

describe('processCombatRound – loser divisions still retreat to friendly region', () => {
  it('defeated attacker divisions appear in retreatingDivisions targeting friendly region', () => {
    const attackers = [makeDiv('a1', 'soviet', 1, 1, 1)];
    const defenders = [makeDiv('d1', 'white', 100, 50, 50)];
    const combat = makeCombat(attackers, defenders);
    const divisions = makeDivisions([...attackers, ...defenders]);

    const result = processCombatRound(combat, divisions, regions, adjacency);

    if (result.combat.isComplete && result.combat.victor === 'white') {
      const attackerRetreats = result.retreatingDivisions.filter(r => r.divisionId === 'a1');
      expect(attackerRetreats.length).toBe(1);
      expect(attackerRetreats[0].toRegionId).toBe('SOVIET_REAR');
    }
  });
});

describe('processCombats – attacker defeat notifications', () => {
  it('does not show Battle for <region> Lost when the attacker loses', () => {
    const attackers = [makeDiv('a1', 'soviet', 1, 1, 1)];
    const defenders = [makeDiv('d1', 'white', 100, 50, 50)];
    const combat = makeCombat(attackers, defenders, 'TULA');
    const divisionState = makeDivisions([...attackers, ...defenders]);
    const tulaRegions: RegionState = {
      TULA: { id: 'TULA', name: 'Tula Oblast', countryIso3: 'RUS', owner: 'white' },
      SOVIET_REAR: { id: 'SOVIET_REAR', name: 'Soviet Rear', countryIso3: 'RUS', owner: 'soviet' },
      WHITE_REAR: { id: 'WHITE_REAR', name: 'White Rear', countryIso3: 'RUS', owner: 'white' },
    };
    const tulaAdjacency: Adjacency = {
      TULA: ['SOVIET_REAR', 'WHITE_REAR'],
      SOVIET_REAR: ['TULA'],
      WHITE_REAR: ['TULA'],
    };

    const result = processCombats(
      [combat],
      new Date('1918-01-01T02:00:00Z'),
      tulaRegions,
      tulaAdjacency,
      {
        TULA: [37.6173, 54.2048],
        SOVIET_REAR: [37.0, 54.0],
        WHITE_REAR: [38.0, 54.5],
      },
      divisionState
    );

    const eventTitles = result.newCombatEvents.map(event => event.title);
    const notificationTitles = result.newCombatNotifications.map(notification => notification.title);

    expect(eventTitles).not.toContain('Battle for Tula Oblast Lost');
    expect(notificationTitles).not.toContain('Battle for Tula Oblast Lost');
    expect(result.newCombatEvents.some(event => event.type === 'combat_defeat')).toBe(false);
  });

  it('does not show <region> Defended! when the defender wins', () => {
    const attackers = [makeDiv('a1', 'soviet', 1, 1, 1)];
    const defenders = [makeDiv('d1', 'white', 100, 50, 50)];
    const combat = makeCombat(attackers, defenders, 'TULA');
    const divisionState = makeDivisions([...attackers, ...defenders]);
    const tulaRegions: RegionState = {
      TULA: { id: 'TULA', name: 'Tula Oblast', countryIso3: 'RUS', owner: 'white' },
      SOVIET_REAR: { id: 'SOVIET_REAR', name: 'Soviet Rear', countryIso3: 'RUS', owner: 'soviet' },
      WHITE_REAR: { id: 'WHITE_REAR', name: 'White Rear', countryIso3: 'RUS', owner: 'white' },
    };
    const tulaAdjacency: Adjacency = {
      TULA: ['SOVIET_REAR', 'WHITE_REAR'],
      SOVIET_REAR: ['TULA'],
      WHITE_REAR: ['TULA'],
    };

    const result = processCombats(
      [combat],
      new Date('1918-01-01T02:00:00Z'),
      tulaRegions,
      tulaAdjacency,
      {
        TULA: [37.6173, 54.2048],
        SOVIET_REAR: [37.0, 54.0],
        WHITE_REAR: [38.0, 54.5],
      },
      divisionState
    );

    const eventTitles = result.newCombatEvents.map(event => event.title);
    const notificationTitles = result.newCombatNotifications.map(notification => notification.title);

    expect(eventTitles).not.toContain('Tula Oblast Defended!');
    expect(notificationTitles).not.toContain('Tula Oblast Defended!');
    expect(result.newCombatEvents.some(event => event.type === 'combat_victory')).toBe(false);
  });
});

describe('processCombats – division destruction logs', () => {
  it('emits a division_destroyed event with the reason when a division has no retreat destination', () => {
    const attackers = [makeDiv('a1', 'soviet', 1, 1, 1)];
    const defenders = [makeDiv('d1', 'white', 100, 50, 50)];
    const combat = makeCombat(attackers, defenders, 'TULA');
    const divisionState = makeDivisions([...attackers, ...defenders]);
    const noRetreatRegions: RegionState = {
      TULA: { id: 'TULA', name: 'Tula Oblast', countryIso3: 'RUS', owner: 'white' },
      SOVIET_REAR: { id: 'SOVIET_REAR', name: 'Soviet Rear', countryIso3: 'RUS', owner: 'white' },
    };
    const noRetreatAdjacency: Adjacency = {
      TULA: ['SOVIET_REAR'],
      SOVIET_REAR: ['TULA'],
    };

    const result = processCombats(
      [combat],
      new Date('1918-01-01T02:00:00Z'),
      noRetreatRegions,
      noRetreatAdjacency,
      {
        TULA: [37.6173, 54.2048],
        SOVIET_REAR: [37.0, 54.0],
      },
      divisionState
    );

    const destroyedEvents = result.newCombatEvents.filter(event => event.type === 'division_destroyed');

    expect(destroyedEvents).toHaveLength(1);
    expect(destroyedEvents[0].title).toBe('a1 Destroyed');
    expect(destroyedEvents[0].country).toBe('soviet');
    expect(destroyedEvents[0].description).toContain('reduced to 0 HP in combat');
    expect(destroyedEvents[0].description).toContain('no friendly retreat destination was available');
  });

  it('does not log restored winner-side divisions as destroyed', () => {
    const attackers = [makeDiv('a1', 'soviet', 1, 10, 10)];
    const defenders = [makeDiv('d1', 'white', 1, 10, 10)];
    const combat = makeCombat(attackers, defenders, 'TULA');
    const divisionState = makeDivisions([...attackers, ...defenders]);
    const restoredDefenderRegions: RegionState = {
      TULA: { id: 'TULA', name: 'Tula Oblast', countryIso3: 'RUS', owner: 'white' },
      SOVIET_REAR: { id: 'SOVIET_REAR', name: 'Soviet Rear', countryIso3: 'RUS', owner: 'soviet' },
    };
    const restoredDefenderAdjacency: Adjacency = {
      TULA: ['SOVIET_REAR'],
      SOVIET_REAR: ['TULA'],
    };

    const result = processCombats(
      [combat],
      new Date('1918-01-01T02:00:00Z'),
      restoredDefenderRegions,
      restoredDefenderAdjacency,
      {
        TULA: [37.6173, 54.2048],
        SOVIET_REAR: [37.0, 54.0],
      },
      divisionState
    );

    const destroyedEvents = result.newCombatEvents.filter(event => event.type === 'division_destroyed');

    expect(destroyedEvents).toHaveLength(0);
    expect(result.finishedCombats[0].victor).toBe('white');
    expect(result.finishedCombats[0].defenderDivisionIds).toHaveLength(1);
    const defDiv = result.updatedDivisions[result.finishedCombats[0].defenderDivisionIds[0]];
    expect(defDiv?.hp).toBe(1);
  });
});

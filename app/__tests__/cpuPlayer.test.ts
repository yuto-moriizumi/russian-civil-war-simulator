/**
 * Unit tests for AI (cpuPlayer) production logic.
 *
 * Regression coverage for: AI ignores CP limit and keeps producing units.
 *
 * The bug: runAITick called canProduceDivision twice with the same stale
 * productionQueues snapshot, so the second check didn't see the first division
 * already committed within the same tick.  The fix maintains a locally-updated
 * copy of productionQueues inside the loop.
 */

import { describe, it, expect } from 'vitest';
import { runAITick } from '../ai/cpuPlayer';
import type {
  AIState,
  Division,
  Region,
  RegionState,
  ProductionQueueItem,
  CountryBonuses,
  ArmyGroup,
} from '../types/game';
import type { CountryId } from '../types/game';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COUNTRY = 'soviet' as CountryId;

const emptyBonuses: CountryBonuses = {
  attackBonus: 0,
  defenceBonus: 0,
  hpBonus: 0,
  maxHpBonus: 0,
  commandPowerBonus: 0,
  productionSpeedMultiplier: 1,
};

function makeDiv(id: string): Division {
  return {
    id,
    name: `${id} Division`,
    owner: COUNTRY,
    armyGroupId: 'ag-1',
    hp: 100,
    maxHp: 100,
    attack: 10,
    defence: 15,
  };
}

function makeRegion(id: string, divisions: Division[] = []): Region {
  return {
    id,
    name: id,
    countryIso3: 'RUS',
    owner: COUNTRY,
    divisions,
    value: 1,
  };
}

function makeArmyGroup(): ArmyGroup {
  return {
    id: 'ag-1',
    name: 'Test Army Group',
    regionIds: ['RU-A'],
    color: '#000',
    owner: COUNTRY,
    theaterId: null,
    mode: 'advance',
  };
}

function makeQueueItem(id: string): ProductionQueueItem {
  return {
    id,
    divisionName: `${id} Division`,
    owner: COUNTRY,
    startTime: new Date(),
    completionTime: new Date(),
    targetRegionId: 'RU-A',
    armyGroupId: 'ag-1',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runAITick — CP limit enforcement', () => {
  /**
   * When there is exactly room for 1 more division (cap used up after 1 item)
   * the AI should queue exactly 1 division, not 2.
   *
   * This is the core regression: before the fix, both loop iterations read the
   * same stale productionQueues and each saw room for 1 more unit, resulting in
   * 2 being queued despite the cap allowing only 1.
   *
   * Setup:
   *   3 regions → cap = BASE(2) + 3 = 5 CP
   *   1 item already in queue → inProduction = 1 * COMMAND_POWER_PER_UNIT(3) = 3 CP
   *   remaining = 5 - 3 = 2 CP  (not enough for a second division at 3 CP each)
   *   so exactly 1 more division can be produced
   */
  it('does not queue more than 1 division when only 1 CP slot remains', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A'),
      'RU-B': makeRegion('RU-B'),
      'RU-C': makeRegion('RU-C'),
    };

    // 1 item already in queue: uses 3 CP; cap is 5, so room for exactly 1 more
    const existingQueue: ProductionQueueItem[] = [makeQueueItem('existing-0')];
    const productionQueues = { [COUNTRY]: existingQueue } as Record<CountryId, ProductionQueueItem[]>;

    const aiState: AIState = { countryId: COUNTRY };
    const armyGroups: ArmyGroup[] = [makeArmyGroup()];

    const result = runAITick(
      aiState,
      regions,
      armyGroups,
      [],              // activeCombats
      [],              // movingUnits
      existingQueue,   // productionQueue (flat list for naming)
      productionQueues,
      emptyBonuses,
    );

    // Should produce exactly 1 (not 2) because the second loop iteration must
    // see the first division already committed in localQueues.
    expect(result.productionRequests.length).toBe(1);
    expect(result.divisionsCreated).toBe(1);
  });

  it('queues 0 divisions when already at the CP cap', () => {
    // 1 region → cap = 3 CP; 1 item in queue = 3 CP used → exactly at cap
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', []),
    };

    // One item in the queue uses exactly COMMAND_POWER_PER_UNIT(3) CP, which equals
    // the cap for 1 owned region (BASE(2) + 1 = 3). No room to add more.
    const existingQueue: ProductionQueueItem[] = [makeQueueItem('full-0')];

    const productionQueues = { [COUNTRY]: existingQueue } as Record<CountryId, ProductionQueueItem[]>;
    const aiState: AIState = { countryId: COUNTRY };
    const armyGroups: ArmyGroup[] = [makeArmyGroup()];

    const result = runAITick(
      aiState,
      regions,
      armyGroups,
      [],
      [],
      existingQueue,
      productionQueues,
      emptyBonuses,
    );

    expect(result.productionRequests.length).toBe(0);
    expect(result.divisionsCreated).toBe(0);
  });

  it('queues 2 divisions when there is room for 2 or more', () => {
    // 5 regions → cap = 2 + 5 = 7; empty queue → room for 7 divisions
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A'),
      'RU-B': makeRegion('RU-B'),
      'RU-C': makeRegion('RU-C'),
      'RU-D': makeRegion('RU-D'),
      'RU-E': makeRegion('RU-E'),
    };

    const productionQueues = {} as Record<CountryId, ProductionQueueItem[]>;
    const aiState: AIState = { countryId: COUNTRY };
    const armyGroups: ArmyGroup[] = [makeArmyGroup()];

    const result = runAITick(
      aiState,
      regions,
      armyGroups,
      [],
      [],
      [],
      productionQueues,
      emptyBonuses,
    );

    // AI tries up to 2 per tick; there's plenty of room so both should succeed
    expect(result.productionRequests.length).toBe(2);
    expect(result.divisionsCreated).toBe(2);
  });

  it('counts existing on-map divisions against the CP cap', () => {
    // 1 region → cap = 3 CP; 1 division on map = 3 CP used → exactly at cap, no room
    const divisions = [makeDiv('d-1')];
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', divisions),
    };

    const productionQueues = {} as Record<CountryId, ProductionQueueItem[]>;
    const aiState: AIState = { countryId: COUNTRY };
    const armyGroups: ArmyGroup[] = [makeArmyGroup()];

    const result = runAITick(
      aiState,
      regions,
      armyGroups,
      [],
      [],
      [],
      productionQueues,
      emptyBonuses,
    );

    expect(result.productionRequests.length).toBe(0);
  });
});

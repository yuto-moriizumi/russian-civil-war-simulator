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
   *   6 regions → cap = BASE(2) + 6 = 8 CP
   *   1 item already in queue → inProduction = 1 * COMMAND_POWER_PER_UNIT(4) = 4 CP
   *   remaining = 8 - 4 = 4 CP  (enough for exactly 1 more division)
   *   so exactly 1 more division can be produced
   */
  it('does not queue more than 1 division when only 1 CP slot remains', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A'),
      'RU-B': makeRegion('RU-B'),
      'RU-C': makeRegion('RU-C'),
      'RU-D': makeRegion('RU-D'),
      'RU-E': makeRegion('RU-E'),
      'RU-F': makeRegion('RU-F'),
    };

    // 1 item already in queue: uses 4 CP; cap is 8, so room for exactly 1 more
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
    // 2 regions → cap = 4 CP; 1 item in queue = 4 CP used → exactly at cap
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', []),
      'RU-B': makeRegion('RU-B', []),
    };

    // One item in the queue uses exactly COMMAND_POWER_PER_UNIT(4) CP, which equals
    // the cap for 2 owned regions (BASE(2) + 2 = 4). No room to add more.
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
    // 8 regions → cap = 2 + 8 = 10; empty queue → room for 2 divisions
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A'),
      'RU-B': makeRegion('RU-B'),
      'RU-C': makeRegion('RU-C'),
      'RU-D': makeRegion('RU-D'),
      'RU-E': makeRegion('RU-E'),
      'RU-F': makeRegion('RU-F'),
      'RU-G': makeRegion('RU-G'),
      'RU-H': makeRegion('RU-H'),
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

  it('uses the newly created army group for production when none exists', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A'),
      'RU-B': makeRegion('RU-B'),
      'RU-C': makeRegion('RU-C'),
      'RU-D': makeRegion('RU-D'),
      'RU-E': makeRegion('RU-E'),
      'RU-F': makeRegion('RU-F'),
      'RU-G': makeRegion('RU-G'),
      'RU-H': makeRegion('RU-H'),
    };

    const productionQueues = {} as Record<CountryId, ProductionQueueItem[]>;
    const aiState: AIState = { countryId: COUNTRY };

    const result = runAITick(
      aiState,
      regions,
      [],
      [],
      [],
      [],
      productionQueues,
      emptyBonuses,
    );

    expect(result.newArmyGroup).toBeDefined();
    expect(result.productionRequests.length).toBeGreaterThan(0);
    expect(result.productionRequests[0].armyGroupId).toBe(result.newArmyGroup?.id);
  });

  it('counts existing on-map divisions against the CP cap', () => {
    // 2 regions → cap = 4 CP; 1 division on map = 4 CP used → exactly at cap, no room
    const divisions = [makeDiv('d-1')];
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A', divisions),
      'RU-B': makeRegion('RU-B', []),
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

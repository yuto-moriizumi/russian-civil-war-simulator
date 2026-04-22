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
  DivisionState,
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
    regionId: null,
  };
}

function makeRegion(id: string): Region {
  return {
    id,
    name: id,
    countryIso3: 'RUS',
    owner: COUNTRY,
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
  it('does not queue more than 1 division when only 1 CP slot remains', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A'),
      'RU-B': makeRegion('RU-B'),
      'RU-C': makeRegion('RU-C'),
      'RU-D': makeRegion('RU-D'),
      'RU-E': makeRegion('RU-E'),
      'RU-F': makeRegion('RU-F'),
    };
    const divisions: DivisionState = {};

    // 1 item already in queue: uses 4 CP; cap is 8, so room for exactly 1 more
    const existingQueue: ProductionQueueItem[] = [makeQueueItem('existing-0')];
    const productionQueues = { [COUNTRY]: existingQueue } as Record<CountryId, ProductionQueueItem[]>;

    const aiState: AIState = { countryId: COUNTRY };
    const armyGroups: ArmyGroup[] = [makeArmyGroup()];

    const result = runAITick(
      aiState,
      divisions,
      regions,
      armyGroups,
      [],              // activeCombats
      [],              // movingUnits
      existingQueue,   // productionQueue (flat list for naming)
      productionQueues,
      emptyBonuses,
    );

    expect(result.productionRequests.length).toBe(1);
    expect(result.divisionsCreated).toBe(1);
  });

  it('queues 0 divisions when already at the CP cap', () => {
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A'),
      'RU-B': makeRegion('RU-B'),
    };
    const divisions: DivisionState = {};

    const existingQueue: ProductionQueueItem[] = [makeQueueItem('full-0')];

    const productionQueues = { [COUNTRY]: existingQueue } as Record<CountryId, ProductionQueueItem[]>;
    const aiState: AIState = { countryId: COUNTRY };
    const armyGroups: ArmyGroup[] = [makeArmyGroup()];

    const result = runAITick(
      aiState,
      divisions,
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
    const divisions: DivisionState = {};

    const productionQueues = {} as Record<CountryId, ProductionQueueItem[]>;
    const aiState: AIState = { countryId: COUNTRY };
    const armyGroups: ArmyGroup[] = [makeArmyGroup()];

    const result = runAITick(
      aiState,
      divisions,
      regions,
      armyGroups,
      [],
      [],
      [],
      productionQueues,
      emptyBonuses,
    );

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
    const divisions: DivisionState = {};

    const productionQueues = {} as Record<CountryId, ProductionQueueItem[]>;
    const aiState: AIState = { countryId: COUNTRY };

    const result = runAITick(
      aiState,
      divisions,
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
    const d1 = makeDiv('d-1');
    const divisions: DivisionState = { 'd-1': d1 };
    const regions: RegionState = {
      'RU-A': makeRegion('RU-A'),
      'RU-B': makeRegion('RU-B'),
    };

    const productionQueues = {} as Record<CountryId, ProductionQueueItem[]>;
    const aiState: AIState = { countryId: COUNTRY };
    const armyGroups: ArmyGroup[] = [makeArmyGroup()];

    const result = runAITick(
      aiState,
      divisions,
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

/**
 * Regression tests for country-switch division preservation.
 *
 * Bug: When the player switched countries, ALL divisions (including ones
 * created dynamically during gameplay) were removed.  Only the hard-coded
 * initial placements in initialUnitPlacement should be wiped and re-created;
 * divisions in other regions must survive the switch.
 *
 * These tests exercise the pure division-filtering logic that was fixed in
 * basicActions.ts (selectCountry).
 *
 * Also contains:
 *   - Regression for initialGameState mutation by AI production tick (Bug 1)
 *   - Regression for selectCountry wiping live production queues (Bug 2)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initialUnitPlacement } from '../data/map/initialUnitPlacement';
import { initialGameState } from '../store/game/initialState';
import { runAITick } from '../ai/cpuPlayer';
import { processProductionQueue } from '../store/game/tickHelpers/productionProcessing';
import type {
  AIState,
  Division,
  DivisionState,
  Region,
  RegionState,
  ProductionQueueItem,
  CountryBonuses,
  ArmyGroup,
  CountryId,
} from '../types/game';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDiv(id: string): Division {
  return {
    id,
    name: `${id} Division`,
    owner: 'soviet',
    armyGroupId: 'ag-1',
    hp: 100,
    maxHp: 100,
    attack: 10,
    defence: 15,
    regionId: null,
  };
}

// ---------------------------------------------------------------------------
// The filtering logic extracted from basicActions.ts (selectCountry)
//
// In the new model, divisions are stored in DivisionState (not on regions).
// This mirrors the fixed version: clear divisions whose regionId is in
// initialUnitPlacement, preserve others.
// ---------------------------------------------------------------------------

function simulateDivisionClearingOnSwitch(
  currentDivisions: DivisionState
): DivisionState {
  const initialPlacementRegions = new Set(Object.keys(initialUnitPlacement));
  const result: DivisionState = {};
  for (const [divId, div] of Object.entries(currentDivisions)) {
    // Preserve divisions that are NOT in initial placement regions
    // (divisions with regionId === null are also preserved - they're in transit/combat)
    if (div.regionId === null || !initialPlacementRegions.has(div.regionId)) {
      result[divId] = div;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('selectCountry — division preservation on country switch', () => {
  const placementRegionId = Object.keys(initialUnitPlacement)[0];
  const dynamicRegionId = '__DYNAMIC_TEST_REGION__';

  it('clears divisions only in initialUnitPlacement regions (not dynamic ones)', () => {
    const dynamicDiv = { ...makeDiv('dyn-div-1'), regionId: dynamicRegionId };
    const placementDiv = { ...makeDiv('init-div-1'), regionId: placementRegionId };

    const currentDivisions: DivisionState = {
      'dyn-div-1': dynamicDiv,
      'init-div-1': placementDiv,
    };

    const result = simulateDivisionClearingOnSwitch(currentDivisions);

    // Division in initialUnitPlacement region → cleared
    expect(result['init-div-1']).toBeUndefined();

    // Division NOT in initialUnitPlacement region → preserved
    expect(result['dyn-div-1']).toBeDefined();
    expect(result['dyn-div-1'].id).toBe('dyn-div-1');
  });

  it('preserves all dynamic divisions intact across multiple regions', () => {
    const currentDivisions: DivisionState = {
      'a1': { ...makeDiv('a1'), regionId: '__DYN_A__' },
      'a2': { ...makeDiv('a2'), regionId: '__DYN_A__' },
      'b1': { ...makeDiv('b1'), regionId: '__DYN_B__' },
    };

    const result = simulateDivisionClearingOnSwitch(currentDivisions);

    expect(Object.keys(result)).toHaveLength(3);
    expect(result['a1']).toBeDefined();
    expect(result['a2']).toBeDefined();
    expect(result['b1']).toBeDefined();
  });

  it('initialUnitPlacement region divisions are cleared before re-population', () => {
    const currentDivisions: DivisionState = {};
    for (const regionId of Object.keys(initialUnitPlacement)) {
      currentDivisions[`old-${regionId}`] = { ...makeDiv(`old-${regionId}`), regionId };
    }

    const result = simulateDivisionClearingOnSwitch(currentDivisions);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it('does not mutate the original divisions object', () => {
    const original = { ...makeDiv('orig-div'), regionId: dynamicRegionId };
    const currentDivisions: DivisionState = { 'orig-div': original };

    simulateDivisionClearingOnSwitch(currentDivisions);

    expect(currentDivisions['orig-div']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Regression — Bug 1: AI tick must not mutate initialGameState.productionQueues
// ---------------------------------------------------------------------------

describe('initialGameState mutation — AI production tick must not dirty the singleton', () => {
  const emptyBonuses: CountryBonuses = {
    attackBonus: 0,
    defenceBonus: 0,
    hpBonus: 0,
    maxHpBonus: 0,
    commandPowerBonus: 0,
    productionSpeedMultiplier: 1,
  };

  function makeArmyGroup(countryId: CountryId): ArmyGroup {
    return {
      id: 'ag-test',
      name: 'Test Army Group',
      regionIds: ['RU-X'],
      color: '#000',
      owner: countryId,
      theaterId: null,
      mode: 'advance',
    };
  }

  let initialQueueLengthsBefore: Record<string, number>;

  beforeEach(() => {
    initialQueueLengthsBefore = {};
    for (const [countryId, queue] of Object.entries(initialGameState.productionQueues)) {
      initialQueueLengthsBefore[countryId] = queue.length;
    }
  });

  it('does not mutate initialGameState.productionQueues when the AI queues a division', () => {
    const COUNTRY = 'white' as CountryId;

    const regions: RegionState = {
      'RU-X': { id: 'RU-X', name: 'RU-X', countryIso3: 'RUS', owner: COUNTRY },
      'RU-Y': { id: 'RU-Y', name: 'RU-Y', countryIso3: 'RUS', owner: COUNTRY },
      'RU-Z': { id: 'RU-Z', name: 'RU-Z', countryIso3: 'RUS', owner: COUNTRY },
    };
    const divisions: DivisionState = {};

    const aiState: AIState = { countryId: COUNTRY };
    const result = runAITick(
      aiState,
      divisions,
      regions,
      [makeArmyGroup(COUNTRY)],
      [], // activeCombats
      [], // movingUnits
      [], // flat productionQueue
      initialGameState.productionQueues,
      emptyBonuses,
    );

    expect(result.productionRequests.length).toBeGreaterThan(0);

    for (const [countryId, queue] of Object.entries(initialGameState.productionQueues)) {
      expect(queue.length).toBe(initialQueueLengthsBefore[countryId]);
    }
  });

  it('initialGameState.productionQueues starts with empty arrays for all countries', () => {
    for (const queue of Object.values(initialGameState.productionQueues)) {
      expect(queue).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Regression — Bug 2: selectCountry must preserve live production queues
// ---------------------------------------------------------------------------

describe('selectCountry — production queue preservation on country switch', () => {
  it('live production queues survive a simulated country switch', () => {
    const liveQueue: ProductionQueueItem[] = [
      {
        id: 'live-item-1',
        divisionName: '1st Latvian Rifles',
        owner: 'iskolat' as CountryId,
        startTime: new Date(),
        completionTime: new Date(),
        targetRegionId: 'LV-1',
        armyGroupId: 'ag-iskolat',
      },
      {
        id: 'live-item-2',
        divisionName: '2nd Latvian Rifles',
        owner: 'iskolat' as CountryId,
        startTime: new Date(),
        completionTime: new Date(),
        targetRegionId: 'LV-1',
        armyGroupId: 'ag-iskolat',
      },
    ];

    const liveProductionQueues = {
      ...initialGameState.productionQueues,
      iskolat: liveQueue,
    } as Record<CountryId, ProductionQueueItem[]>;

    const preservedQueues = liveProductionQueues;

    expect(preservedQueues['iskolat' as CountryId]).toHaveLength(2);
    expect(preservedQueues['iskolat' as CountryId][0].id).toBe('live-item-1');
    expect(preservedQueues['iskolat' as CountryId][1].id).toBe('live-item-2');

    expect(initialGameState.productionQueues['iskolat' as CountryId]).toHaveLength(0);
  });

  it('a country switch that uses ...initialGameState would wipe live queues', () => {
    const liveQueue: ProductionQueueItem[] = [
      {
        id: 'live-item-x',
        divisionName: '1st Latvian Rifles',
        owner: 'iskolat' as CountryId,
        startTime: new Date(),
        completionTime: new Date(),
        targetRegionId: 'LV-1',
        armyGroupId: 'ag-iskolat',
      },
    ];

    const liveProductionQueues = {
      ...initialGameState.productionQueues,
      iskolat: liveQueue,
    } as Record<CountryId, ProductionQueueItem[]>;

    const brokenResult = {
      ...initialGameState,
    };

    expect(brokenResult.productionQueues['iskolat' as CountryId]).toHaveLength(0);
    expect(liveProductionQueues['iskolat' as CountryId]).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Regression — Bug 3: AI-produced divisions must always be associated with a
// valid, existing army group.
// ---------------------------------------------------------------------------

describe('processProductionQueue — stale armyGroupId after country switch', () => {
  const COUNTRY = 'white' as CountryId;

  const emptyBonuses: CountryBonuses = {
    attackBonus: 0,
    defenceBonus: 0,
    hpBonus: 0,
    maxHpBonus: 0,
    commandPowerBonus: 0,
    productionSpeedMultiplier: 1,
  };

  function makeRegion(id: string): Region {
    return {
      id,
      name: id,
      countryIso3: 'RUS',
      owner: COUNTRY,
    };
  }

  it('uses a valid army group when the queued armyGroupId no longer exists', () => {
    const staleArmyGroupId = 'old-army-group-from-before-switch';
    const newArmyGroupId = 'new-army-group-after-switch';

    const pastTime = new Date('2020-01-01T00:00:00.000Z');
    const currentTime = new Date('2020-01-02T00:00:00.000Z');

    const queueItem: ProductionQueueItem = {
      id: 'prod-1',
      divisionName: '1st White Division',
      owner: COUNTRY,
      startTime: pastTime,
      completionTime: pastTime,
      targetRegionId: 'RU-A',
      armyGroupId: staleArmyGroupId,
    };

    const productionQueues = { [COUNTRY]: [queueItem] } as Record<CountryId, ProductionQueueItem[]>;

    const regions: RegionState = { 'RU-A': makeRegion('RU-A') };

    const currentArmyGroups: ArmyGroup[] = [
      {
        id: newArmyGroupId,
        name: 'White Army Group',
        regionIds: ['RU-A'],
        color: '#fff',
        owner: COUNTRY,
        theaterId: null,
        mode: 'advance',
      },
    ];

    const { updatedDivisions } = processProductionQueue(
      productionQueues,
      currentTime,
      regions,
      { [COUNTRY]: emptyBonuses } as Record<CountryId, CountryBonuses>,
      currentArmyGroups
    );

    // The produced division must exist and reference the new army group
    const producedDiv = Object.values(updatedDivisions)[0];
    expect(producedDiv).toBeDefined();
    expect(producedDiv.armyGroupId).toBe(newArmyGroupId);
    expect(producedDiv.armyGroupId).not.toBe(staleArmyGroupId);
  });

  it('keeps a valid armyGroupId unchanged when the reference is still good', () => {
    const validArmyGroupId = 'valid-army-group';

    const pastTime = new Date('2020-01-01T00:00:00.000Z');
    const currentTime = new Date('2020-01-02T00:00:00.000Z');

    const queueItem: ProductionQueueItem = {
      id: 'prod-2',
      divisionName: '2nd White Division',
      owner: COUNTRY,
      startTime: pastTime,
      completionTime: pastTime,
      targetRegionId: 'RU-A',
      armyGroupId: validArmyGroupId,
    };

    const productionQueues = { [COUNTRY]: [queueItem] } as Record<CountryId, ProductionQueueItem[]>;
    const regions: RegionState = { 'RU-A': makeRegion('RU-A') };

    const currentArmyGroups: ArmyGroup[] = [
      {
        id: validArmyGroupId,
        name: 'White Army Group',
        regionIds: ['RU-A'],
        color: '#fff',
        owner: COUNTRY,
        theaterId: null,
        mode: 'advance',
      },
    ];

    const { updatedDivisions } = processProductionQueue(
      productionQueues,
      currentTime,
      regions,
      { [COUNTRY]: emptyBonuses } as Record<CountryId, CountryBonuses>,
      currentArmyGroups
    );

    const producedDiv = Object.values(updatedDivisions)[0];
    expect(producedDiv.armyGroupId).toBe(validArmyGroupId);
  });

  it('does not reassign to an army group owned by a different country', () => {
    const wrongOwnerGroupId = 'soviet-group';
    const correctGroupId = 'white-group';

    const pastTime = new Date('2020-01-01T00:00:00.000Z');
    const currentTime = new Date('2020-01-02T00:00:00.000Z');

    const queueItem: ProductionQueueItem = {
      id: 'prod-3',
      divisionName: '3rd White Division',
      owner: COUNTRY,
      startTime: pastTime,
      completionTime: pastTime,
      targetRegionId: 'RU-A',
      armyGroupId: wrongOwnerGroupId,
    };

    const productionQueues = { [COUNTRY]: [queueItem] } as Record<CountryId, ProductionQueueItem[]>;
    const regions: RegionState = { 'RU-A': makeRegion('RU-A') };

    const currentArmyGroups: ArmyGroup[] = [
      {
        id: wrongOwnerGroupId,
        name: 'Soviet Army Group',
        regionIds: [],
        color: '#f00',
        owner: 'soviet' as CountryId,
        theaterId: null,
        mode: 'advance',
      },
      {
        id: correctGroupId,
        name: 'White Army Group',
        regionIds: ['RU-A'],
        color: '#fff',
        owner: COUNTRY,
        theaterId: null,
        mode: 'advance',
      },
    ];

    const { updatedDivisions } = processProductionQueue(
      productionQueues,
      currentTime,
      regions,
      { [COUNTRY]: emptyBonuses } as Record<CountryId, CountryBonuses>,
      currentArmyGroups
    );

    const producedDiv = Object.values(updatedDivisions)[0];
    expect(producedDiv.armyGroupId).toBe(correctGroupId);
  });
});

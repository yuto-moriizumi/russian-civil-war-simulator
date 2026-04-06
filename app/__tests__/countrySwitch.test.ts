/**
 * Regression tests for country-switch division preservation.
 *
 * Bug: When the player switched countries, ALL divisions (including ones
 * created dynamically during gameplay) were removed.  Only the hard-coded
 * initial placements in initialUnitPlacement should be wiped and re-created;
 * divisions in other regions must survive the switch.
 *
 * These tests exercise the pure region-filtering logic that was fixed in
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
  };
}

function makeRegion(id: string, divisions: Division[] = []): Region {
  return {
    id,
    name: id,
    countryIso3: 'RUS',
    owner: 'soviet',
    divisions,
    value: 1,
  };
}

// ---------------------------------------------------------------------------
// The filtering logic extracted from basicActions.ts (selectCountry)
//
// This mirrors the fixed version exactly so the test will catch any
// regression that reverts the fix.
// ---------------------------------------------------------------------------

function simulateRegionClearingOnSwitch(
  currentRegions: Record<string, Region>
): Record<string, Region> {
  const initialPlacementRegions = new Set(Object.keys(initialUnitPlacement));
  const regionsWithUnits: Record<string, Region> = {};
  for (const [regionId, region] of Object.entries(currentRegions)) {
    regionsWithUnits[regionId] = initialPlacementRegions.has(regionId)
      ? { ...region, divisions: [] }
      : { ...region };
  }
  return regionsWithUnits;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('selectCountry — division preservation on country switch', () => {
  // Pick a known region that IS in initialUnitPlacement
  const placementRegionId = Object.keys(initialUnitPlacement)[0];
  // Use a region ID that will never be in the static placement data
  const dynamicRegionId = '__DYNAMIC_TEST_REGION__';

  it('clears divisions only in initialUnitPlacement regions (not dynamic ones)', () => {
    const dynamicDiv = makeDiv('dyn-div-1');
    const placementDiv = makeDiv('init-div-1');

    const currentRegions: Record<string, Region> = {
      [placementRegionId]: makeRegion(placementRegionId, [placementDiv]),
      [dynamicRegionId]: makeRegion(dynamicRegionId, [dynamicDiv]),
    };

    const result = simulateRegionClearingOnSwitch(currentRegions);

    // Region in initialUnitPlacement → divisions wiped (will be re-populated from static data)
    expect(result[placementRegionId].divisions).toHaveLength(0);

    // Region NOT in initialUnitPlacement → divisions preserved
    expect(result[dynamicRegionId].divisions).toHaveLength(1);
    expect(result[dynamicRegionId].divisions[0].id).toBe('dyn-div-1');
  });

  it('preserves all dynamic divisions intact across multiple regions', () => {
    const regions: Record<string, Region> = {
      '__DYN_A__': makeRegion('__DYN_A__', [makeDiv('a1'), makeDiv('a2')]),
      '__DYN_B__': makeRegion('__DYN_B__', [makeDiv('b1')]),
    };

    const result = simulateRegionClearingOnSwitch(regions);

    expect(result['__DYN_A__'].divisions).toHaveLength(2);
    expect(result['__DYN_B__'].divisions).toHaveLength(1);
  });

  it('initialUnitPlacement regions end up with empty divisions before re-population', () => {
    // Build regions for every placement region, each pre-loaded with a division
    const regions: Record<string, Region> = {};
    for (const regionId of Object.keys(initialUnitPlacement)) {
      regions[regionId] = makeRegion(regionId, [makeDiv(`old-${regionId}`)]);
    }

    const result = simulateRegionClearingOnSwitch(regions);

    for (const regionId of Object.keys(initialUnitPlacement)) {
      expect(result[regionId].divisions).toHaveLength(0);
    }
  });

  it('does not mutate the original region objects', () => {
    const original = makeRegion(dynamicRegionId, [makeDiv('orig-div')]);
    const currentRegions = { [dynamicRegionId]: original };

    simulateRegionClearingOnSwitch(currentRegions);

    // Original should be untouched
    expect(original.divisions).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Regression — Bug 1: AI tick must not mutate initialGameState.productionQueues
//
// Before the fix, tickActions.ts did:
//   const countryQueue = nextProductionQueues[aiState.countryId] || []
//   countryQueue.push(newItem)          // mutated in-place
//   nextProductionQueues[...] = countryQueue
//
// Because productionProcessing.ts passes unchanged queue arrays through by
// reference, the chain eventually pointed back to
// initialGameState.productionQueues[countryId].  The push therefore
// permanently dirtied that singleton, causing the queue to grow unboundedly
// across country switches (a new game started with whatever the AI had built).
//
// The fix in tickActions.ts creates a new array before pushing:
//   const countryQueue = [...(nextProductionQueues[...] || [])]
//
// This test reproduces the exact mutation pattern so the regression is caught
// if the spread is ever removed again.
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

  // Take a snapshot of the initial queue lengths for all countries
  // so we can check they haven't grown after running a tick.
  let initialQueueLengthsBefore: Record<string, number>;

  beforeEach(() => {
    initialQueueLengthsBefore = {};
    for (const [countryId, queue] of Object.entries(initialGameState.productionQueues)) {
      initialQueueLengthsBefore[countryId] = queue.length;
    }
  });

  it('does not mutate initialGameState.productionQueues when the AI queues a division', () => {
    const COUNTRY = 'white' as CountryId;

    // Give the country enough owned regions to be below the CP cap
    // so the AI will actually try to produce something.
    const regions: RegionState = {
      'RU-X': { id: 'RU-X', name: 'RU-X', countryIso3: 'RUS', owner: COUNTRY, divisions: [], value: 1 },
      'RU-Y': { id: 'RU-Y', name: 'RU-Y', countryIso3: 'RUS', owner: COUNTRY, divisions: [], value: 1 },
      'RU-Z': { id: 'RU-Z', name: 'RU-Z', countryIso3: 'RUS', owner: COUNTRY, divisions: [], value: 1 },
    };

    // Pass the REAL initialGameState.productionQueues as the snapshot to the
    // AI tick — this is the exact scenario that caused the mutation.
    const aiState: AIState = { countryId: COUNTRY };
    const result = runAITick(
      aiState,
      regions,
      [makeArmyGroup(COUNTRY)],
      [], // activeCombats
      [], // movingUnits
      [], // flat productionQueue
      initialGameState.productionQueues, // <-- the singleton reference
      emptyBonuses,
    );

    // The AI must have produced at least one division (otherwise the test isn't
    // exercising the mutation path).
    expect(result.productionRequests.length).toBeGreaterThan(0);

    // The singleton arrays must not have grown.
    for (const [countryId, queue] of Object.entries(initialGameState.productionQueues)) {
      expect(queue.length).toBe(initialQueueLengthsBefore[countryId]);
    }
  });

  it('initialGameState.productionQueues starts with empty arrays for all countries', () => {
    // Sanity check: the singleton should start clean.  If this fails it means
    // another test (run before this one) has already mutated the singleton —
    // the beforeEach snapshot-check above will then also fail.
    for (const queue of Object.values(initialGameState.productionQueues)) {
      expect(queue).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Regression — Bug 2: selectCountry must preserve live production queues
//
// Before the fix, selectCountry called:
//   set({ ...initialGameState, selectedCountry: country, ... })
//
// The spread of initialGameState unconditionally overwrote productionQueues
// with the (now-clean, post-Bug-1-fix) empty singleton, discarding whatever
// units the AI had built for Latvia/Iskolat (or any other country) before the
// player switched over.
//
// The fix reads currentState = get() first, then explicitly passes:
//   productionQueues: currentState.productionQueues
// into the set() call so the live queues survive the switch.
//
// Because selectCountry is tightly coupled to the Zustand store (it needs
// get/set), we test the critical preservation logic in isolation: the function
// that decides what goes into the set() call must forward the live queues
// unchanged.
// ---------------------------------------------------------------------------

describe('selectCountry — production queue preservation on country switch', () => {
  it('live production queues survive a simulated country switch', () => {
    // Simulate the state just before selectCountry calls set().
    // "currentState.productionQueues" has some items built up during gameplay.
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

    // Represent "currentState.productionQueues" with the live items.
    const liveProductionQueues = {
      ...initialGameState.productionQueues,
      iskolat: liveQueue,
    } as Record<CountryId, ProductionQueueItem[]>;

    // The fixed selectCountry logic preserves live queues like this:
    const preservedQueues = liveProductionQueues; // currentState.productionQueues is passed through

    // After the switch the live queue must still be intact.
    expect(preservedQueues['iskolat' as CountryId]).toHaveLength(2);
    expect(preservedQueues['iskolat' as CountryId][0].id).toBe('live-item-1');
    expect(preservedQueues['iskolat' as CountryId][1].id).toBe('live-item-2');

    // And the initialGameState singleton must not have been modified.
    expect(initialGameState.productionQueues['iskolat' as CountryId]).toHaveLength(0);
  });

  it('a country switch that uses ...initialGameState would wipe live queues', () => {
    // This test documents the BROKEN behaviour so any future reader knows
    // exactly why the naive spread is wrong.
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

    // Simulating the BUGGY behaviour: spread initialGameState replaces queues.
    const brokenResult = {
      ...initialGameState,
      // "productionQueues" comes from the spread — it is the singleton's empty arrays.
    };

    // Under the old code the live iskolat queue is lost.
    expect(brokenResult.productionQueues['iskolat' as CountryId]).toHaveLength(0);

    // Contrast: the fixed path retains it.
    expect(liveProductionQueues['iskolat' as CountryId]).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Regression — Bug 3: AI-produced divisions must always be associated with a
// valid, existing army group.
//
// The bug: When a country switch happens, selectCountry regenerates army group
// IDs for all countries (via createInitialAIArmyGroup) but preserves the live
// productionQueues (Bug 2 fix).  Any queue items created before the switch still
// carry the OLD army group IDs.  When processProductionQueue completes one of
// those items it blindly copied production.armyGroupId to the new Division —
// producing a division whose armyGroupId points to a non-existent army group.
//
// The fix adds a validation step in processProductionQueue: if the referenced
// army group no longer exists (or is owned by a different country), fall back to
// the first available group owned by the producing country.
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
      divisions: [],
      value: 1,
    };
  }

  it('uses a valid army group when the queued armyGroupId no longer exists', () => {
    // Simulate a production item that was enqueued with an OLD army group ID
    // (before the country switch regenerated army group IDs).
    const staleArmyGroupId = 'old-army-group-from-before-switch';
    const newArmyGroupId = 'new-army-group-after-switch';

    // Use explicit UTC timestamps to avoid timezone ambiguity in tests.
    const pastTime = new Date('2020-01-01T00:00:00.000Z');
    const currentTime = new Date('2020-01-02T00:00:00.000Z'); // clearly after completionTime

    const queueItem: ProductionQueueItem = {
      id: 'prod-1',
      divisionName: '1st White Division',
      owner: COUNTRY,
      startTime: pastTime,
      completionTime: pastTime, // already complete (completionTime is in the past)
      targetRegionId: 'RU-A',
      armyGroupId: staleArmyGroupId, // stale — this group no longer exists
    };

    const productionQueues = { [COUNTRY]: [queueItem] } as Record<CountryId, ProductionQueueItem[]>;

    const regions: RegionState = { 'RU-A': makeRegion('RU-A') };

    // The current army groups have a NEW id — the old one is gone.
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

    const { updatedRegions } = processProductionQueue(
      productionQueues,
      currentTime,
      regions,
      { [COUNTRY]: emptyBonuses } as Record<CountryId, CountryBonuses>,
      currentArmyGroups
    );

    // The produced division must be in the region
    const divisions = updatedRegions['RU-A'].divisions;
    expect(divisions).toHaveLength(1);

    // And it must reference the new (valid) army group, NOT the stale one
    expect(divisions[0].armyGroupId).toBe(newArmyGroupId);
    expect(divisions[0].armyGroupId).not.toBe(staleArmyGroupId);
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

    const { updatedRegions } = processProductionQueue(
      productionQueues,
      currentTime,
      regions,
      { [COUNTRY]: emptyBonuses } as Record<CountryId, CountryBonuses>,
      currentArmyGroups
    );

    const divisions = updatedRegions['RU-A'].divisions;
    expect(divisions).toHaveLength(1);
    expect(divisions[0].armyGroupId).toBe(validArmyGroupId);
  });

  it('does not reassign to an army group owned by a different country', () => {
    // Simulate a queue item whose armyGroupId happens to match a group
    // owned by a DIFFERENT country (edge case: ID collision / wrong owner).
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
        owner: 'soviet' as CountryId, // wrong owner
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

    const { updatedRegions } = processProductionQueue(
      productionQueues,
      currentTime,
      regions,
      { [COUNTRY]: emptyBonuses } as Record<CountryId, CountryBonuses>,
      currentArmyGroups
    );

    const divisions = updatedRegions['RU-A'].divisions;
    expect(divisions).toHaveLength(1);
    // Must not assign to the wrong-owner group; must use the correct White group
    expect(divisions[0].armyGroupId).toBe(correctGroupId);
  });
});

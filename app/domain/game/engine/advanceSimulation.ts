import { CountryId, ProductionQueueItem } from '../../../types/game';
import { buildRegionUpdate, extractRegionOwners } from '../../../utils/regionState';
import { detectTheatersForCountries, syncAIArmyGroupsToTheaters } from '../../../utils/aiArmyGroupTheaters';
import {
  validateDivisions,
  processMovements,
  processCombats,
  applyCompletedMovements,
  applyFinishedCombats,
  regenerateDivisionHP,
  syncArmyGroupTerritories,
  checkAndCompleteMissions,
  checkAndClaimAIMissions,
  processProductionQueue,
  processScheduledEvents,
  detectDivisionDuplicates,
  logDivisionDuplicates,
} from '../../../store/game/tickHelpers';
import {
  getEffectiveAIStates,
  processAITick,
  hasOwnershipChangedForCountries,
  initializeAIStatesForNewCountries,
} from '../../../store/game/tickHelpers/aiTick';
import { attackArmyGroup } from '../../../store/game/armyGroupAttack';
import { defendArmyGroup } from '../../../store/game/armyGroupDefend';
import { EngineSimulationState, SimulationDeps, SimulationResult } from './types';
import { GameStore } from '../../../store/game/types';

let _tickCounter = 0;

function checkDuplicates(
  label: string,
  tickNum: number,
  state: EngineSimulationState,
): void {
  const result = detectDivisionDuplicates(state.regions, state.movingUnits, state.activeCombats);
  if (result.hasDuplicates) {
    logDivisionDuplicates(result.reports, tickNum);
    console.error(`  [DUPLICATE] introduced during: ${label}`);
  }
}

/**
 * Advances the simulation by one tick.
 * Pure function: reads state + deps, returns next state.
 * No Zustand imports or browser side-effects.
 */
export function advanceSimulation(
  state: EngineSimulationState,
  deps: SimulationDeps,
): SimulationResult {
  _tickCounter++;
  const tickNum = _tickCounter;

  const {
    dateTime,
    selectedCountry,
    regions,
    regionDefinitions,
    adjacency,
    movingUnits,
    activeCombats,
    aiStates,
    gameEvents,
    notifications,
    armyGroups,
    productionQueues,
    relationships,
    regionCentroids,
    scheduledEvents,
    divisions,
  } = state;

  const preCheck = detectDivisionDuplicates(regions, movingUnits, activeCombats);
  if (preCheck.hasDuplicates) {
    logDivisionDuplicates(preCheck.reports, tickNum);
    console.error('  [DUPLICATE] detected at TICK START — leftovers from previous tick');
  }

  // Step 1: validate divisions
  const { updatedRegions, updatedMovingUnits, updatedDivisions: divisionsAfterValidation } =
    validateDivisions(regions, movingUnits, armyGroups, divisions);

  // Step 2: production
  const {
    remainingProductions,
    updatedDivisions: divisionsAfterProduction,
    completedProductions,
  } = processProductionQueue(
    productionQueues,
    dateTime,
    updatedRegions,
    state.countryBonuses,
    armyGroups,
    divisionsAfterValidation,
  );
  const regionsAfterProduction = updatedRegions;

  const playerProductions = completedProductions.filter(p => p.owner === selectedCountry?.id);
  const productionEvents = playerProductions.map(p => ({
    id: `event-${Date.now()}-${p.id}`,
    type: 'production_completed' as const,
    timestamp: dateTime,
    title: 'Production Complete',
    description: `${p.divisionName} has been produced and deployed.`,
    country: p.owner,
  }));
  const productionNotifications = playerProductions.map(p => ({
    id: `notif-${Date.now()}-${p.id}`,
    type: 'production_completed' as const,
    timestamp: dateTime,
    title: 'Production Complete',
    description: `${p.divisionName} has been produced and deployed.`,
    country: p.owner,
    expiresAt: new Date(dateTime.getTime() + deps.gameConfig.NOTIFICATION.DURATION_HOURS * 60 * 60 * 1000),
  }));

  const newDate = new Date(dateTime);
  newDate.setHours(newDate.getHours() + 1);

  // Step 3: scheduled events
  const {
    updatedScheduledEvents,
    updatedRegions: regionsAfterEvents,
    updatedRelationships: relationshipsAfterEvents,
    updatedArmyGroups: armyGroupsAfterEvents,
    updatedDivisions: divisionsAfterEvents,
    newEvents: scheduledEventEvents,
    newNotifications: scheduledEventNotifications,
  } = processScheduledEvents(
    scheduledEvents,
    newDate,
    regionsAfterProduction,
    relationships,
    armyGroups,
    divisionsAfterProduction,
  );

  const aiStatesAfterEvents = initializeAIStatesForNewCountries(
    aiStates,
    regionsAfterEvents,
    selectedCountry?.id,
  );

  // Step 4: movements
  const {
    remainingMovements,
    completedMovements,
    newMidTransitCombats,
    updatedDivisions: divisionsAfterMovements,
  } = processMovements(
    updatedMovingUnits,
    newDate,
    activeCombats,
    regionsAfterEvents,
    relationshipsAfterEvents,
    divisionsAfterEvents,
  );

  // Step 4.5: mid-transit combats
  let combatsBeforeStep5 = activeCombats;
  if (newMidTransitCombats.length > 0) {
    combatsBeforeStep5 = [...activeCombats, ...newMidTransitCombats];
  }

  // Step 5: combats
  const {
    updatedCombats,
    finishedCombats,
    newCombatEvents,
    newCombatNotifications,
    retreatMovements,
    updatedDivisions: divisionsAfterCombats,
  } = processCombats(
    combatsBeforeStep5,
    newDate,
    regionsAfterEvents,
    adjacency,
    regionCentroids,
    divisionsAfterMovements,
  );

  // Step 6: apply movements
  let nextRegions: typeof regionsAfterEvents;
  let nextDivisions = divisionsAfterCombats;
  const { nextCombats, nextEvents, nextNotifications, interceptedMovementIds, newHopMovements } =
    (() => {
      const result = applyCompletedMovements(
        completedMovements,
        updatedMovingUnits,
        {
          regions: regionsAfterEvents,
          divisions: divisionsAfterCombats,
          combats: updatedCombats,
          finishedCombats,
          events: [...gameEvents, ...newCombatEvents, ...productionEvents, ...scheduledEventEvents],
          notifications: [
            ...notifications,
            ...newCombatNotifications,
            ...productionNotifications,
            ...scheduledEventNotifications,
          ],
          relationships: relationshipsAfterEvents,
          countries: deps.countries,
          regionCentroids,
        },
        newDate,
      );
      nextRegions = result.nextRegions;
      nextDivisions = result.nextDivisions;
      return result;
    })();

  const combatResult = applyFinishedCombats(
    finishedCombats,
    nextRegions,
    nextDivisions,
    deps.countries,
    relationshipsAfterEvents,
  );
  nextRegions = combatResult.nextRegions;
  nextDivisions = combatResult.nextDivisions;

  // Step 6b: merge movements
  const finishedCombatIds = new Set(finishedCombats.map(c => c.id));
  let nextMovingUnits = [...remainingMovements, ...retreatMovements, ...newHopMovements].filter(
    m =>
      !interceptedMovementIds.includes(m.id) &&
      !(m.pendingCombatId && finishedCombatIds.has(m.pendingCombatId)),
  );

  const midState: EngineSimulationState = {
    ...state,
    regions: nextRegions,
    movingUnits: nextMovingUnits,
    activeCombats: nextCombats,
    divisions: nextDivisions,
  };
  checkDuplicates('apply movements / combats', tickNum, midState);

  // Step 7: HP regen
  nextDivisions = regenerateDivisionHP(nextDivisions);

  // Step 8: AI
  const effectiveAIStates = getEffectiveAIStates(
    aiStatesAfterEvents,
    selectedCountry?.id,
    state.isPlayerAIEnabled,
  );
  const effectiveAICountryIds = effectiveAIStates.map(aiState => aiState.countryId);
  let nextAIStates = effectiveAIStates.filter(
    aiState => aiState.countryId !== selectedCountry?.id,
  );
  let nextArmyGroups = armyGroupsAfterEvents;
  let nextProductionQueues: Record<CountryId, ProductionQueueItem[]> = { ...remainingProductions };
  let nextActiveCombats = nextCombats;

  const prevAIStateIds = new Set(aiStatesAfterEvents.map(s => s.countryId));
  const hasNewAICountries = effectiveAICountryIds.some(id => !prevAIStateIds.has(id));
  const theaterCountryIds = new Set([
    ...effectiveAICountryIds,
    ...(selectedCountry ? [selectedCountry.id] : []),
  ]);
  const theaterInputsChanged =
    hasNewAICountries ||
    relationshipsAfterEvents !== relationships ||
    hasOwnershipChangedForCountries(theaterCountryIds, regions, nextRegions);

  const nextTheaters = theaterInputsChanged
    ? detectTheatersForCountries({
        regions: nextRegions,
        adjacency,
        countryIds: Array.from(theaterCountryIds),
        existingTheaters: state.theaters,
        relationships: relationshipsAfterEvents,
      })
    : state.theaters;

  if (effectiveAICountryIds.length > 0 && theaterInputsChanged) {
    const aiArmyGroupSync = syncAIArmyGroupsToTheaters({
      aiCountryIds: effectiveAICountryIds,
      theaters: nextTheaters,
      armyGroups: nextArmyGroups,
      regions: nextRegions,
      divisions: nextDivisions,
      movingUnits: nextMovingUnits,
      activeCombats: nextActiveCombats,
      productionQueues: nextProductionQueues,
    });

    nextArmyGroups = aiArmyGroupSync.armyGroups;
    nextRegions = aiArmyGroupSync.regions;
    nextDivisions = aiArmyGroupSync.divisions;
    nextMovingUnits = aiArmyGroupSync.movingUnits;
    nextActiveCombats = aiArmyGroupSync.activeCombats;
    nextProductionQueues = aiArmyGroupSync.productionQueues;
  }

  if (effectiveAIStates.length > 0) {
    const aiResult = processAITick({
      effectiveAIStates,
      nextArmyGroups,
      nextProductionQueues,
      nextRegions,
      nextDivisions,
      nextMovingUnits,
      nextActiveCombats,
      countryBonuses: state.countryBonuses,
      newDate,
      selectedCountryId: selectedCountry?.id,
    });
    nextAIStates = aiResult.nextAIStates;
    nextArmyGroups = aiResult.nextArmyGroups;
    nextProductionQueues = aiResult.nextProductionQueues;
  }

  const afterAIState: EngineSimulationState = {
    ...state,
    regions: nextRegions,
    movingUnits: nextMovingUnits,
    activeCombats: nextActiveCombats,
    divisions: nextDivisions,
  };
  checkDuplicates('AI tick / army group sync', tickNum, afterAIState);

  // Step 9: army group sync
  nextArmyGroups = syncArmyGroupTerritories(
    nextArmyGroups,
    nextRegions,
    nextMovingUnits,
    nextDivisions,
  );

  // Build post-step-9 state before army group actions
  const stateAfterStep9: EngineSimulationState = {
    ...state,
    dateTime: newDate,
    movingUnits: nextMovingUnits,
    activeCombats: nextActiveCombats,
    regions: nextRegions,
    divisions: nextDivisions,
    gameEvents: nextEvents,
    notifications: nextNotifications,
    aiStates: nextAIStates,
    armyGroups: nextArmyGroups,
    theaters: nextTheaters,
    productionQueues: nextProductionQueues,
    scheduledEvents: updatedScheduledEvents,
    relationships: relationshipsAfterEvents,
  };

  // Step 10: army group mode actions (advance/defend)
  // These helpers currently depend on a GameStore-like object, so we bridge here.
  const armyGroupActionsNeeded = nextArmyGroups.filter(g => g.mode !== 'none');
  let currentState = stateAfterStep9;

  if (armyGroupActionsNeeded.length > 0) {
    const patches: Partial<GameStore>[] = [];
    const fakeStore = buildFakeStore(currentState);
    let batchFakeStore = fakeStore;

    const collectPatch = (partial: Partial<GameStore>) => {
      const patch = partial.regions
        ? { ...partial, ...buildRegionUpdate(regionDefinitions, extractRegionOwners(partial.regions)) }
        : partial;
      patches.push(patch);
      batchFakeStore = { ...batchFakeStore, ...patch };
    };

    armyGroupActionsNeeded.forEach(group => {
      if (group.mode === 'advance') {
        attackArmyGroup(group.id, batchFakeStore, collectPatch);
      } else if (group.mode === 'defend') {
        defendArmyGroup(group.id, batchFakeStore, collectPatch);
      }
    });

    if (patches.length > 0) {
      const mergedPatch: Partial<GameStore> = {};
      for (const patch of patches) {
        Object.assign(mergedPatch, patch);
      }
      const finalFakeStore: GameStore = { ...batchFakeStore };
      for (const key of Object.keys(mergedPatch) as (keyof GameStore)[]) {
        (finalFakeStore as unknown as Record<string, unknown>)[key] = batchFakeStore[key];
      }
      currentState = applyStorePatchToEngineState(currentState, finalFakeStore, regionDefinitions);
    }
  }

  checkDuplicates('army group actions', tickNum, currentState);

  // Step 11: missions
  let finalState = currentState;

  if (selectedCountry && !state.isPlayerAIEnabled) {
    const fakeGet = () => buildFakeStore(finalState);
    const missionResults = checkAndCompleteMissions(fakeGet as never, selectedCountry);

    if (missionResults.updatedMissions.some((m, i) => m.completed !== finalState.missions[i].completed)) {
      finalState = {
        ...finalState,
        missions: missionResults.updatedMissions,
        gameEvents: [...finalState.gameEvents, ...missionResults.newEvents],
        notifications: [...finalState.notifications, ...missionResults.newNotifications],
      };
    }
  }

  const aiMissionCountryIds = effectiveAIStates
    .map(aiState => aiState.countryId)
    .filter(
      countryId => countryId !== selectedCountry?.id || state.isPlayerAIEnabled,
    );
  if (aiMissionCountryIds.length > 0) {
    const fakeStore = buildFakeStore(finalState);
    const aiMissionResults = checkAndClaimAIMissions(fakeStore as never, aiMissionCountryIds);

    if (aiMissionResults.changed) {
      finalState = {
        ...finalState,
        missions: aiMissionResults.updatedMissions,
        countryBonuses: aiMissionResults.countryBonuses,
        regions: aiMissionResults.regions,
        divisions: aiMissionResults.divisions,
        movingUnits: aiMissionResults.movingUnits,
        relationships: aiMissionResults.relationships,
        armyGroups: aiMissionResults.armyGroups,
        aiStates: aiMissionResults.aiStates,
        gameEvents: [...finalState.gameEvents, ...aiMissionResults.newEvents],
      };
    }
  }

  return { state: finalState };
}

/**
 * Builds a minimal GameStore-shaped object from EngineSimulationState for helpers that
 * still depend on the store interface. This bridge will shrink as helpers are migrated.
 */
function buildFakeStore(state: EngineSimulationState): GameStore {
  return state as unknown as GameStore;
}

function applyStorePatchToEngineState(
  base: EngineSimulationState,
  patch: GameStore,
  regionDefinitions: EngineSimulationState['regionDefinitions'],
): EngineSimulationState {
  const next: EngineSimulationState = { ...base };
  const simKeys: (keyof EngineSimulationState)[] = [
    'dateTime', 'selectedCountry', 'isPlayerAIEnabled',
    'regions', 'regionDefinitions', 'adjacency', 'regionCentroids',
    'divisions', 'movingUnits', 'activeCombats', 'armyGroups', 'theaters',
    'productionQueues', 'relationships', 'scheduledEvents', 'countryBonuses',
    'aiStates', 'missions', 'gameEvents', 'notifications',
  ];
  for (const key of simKeys) {
    if (key in patch) {
      (next as unknown as Record<string, unknown>)[key] = (patch as unknown as Record<string, unknown>)[key];
    }
  }
  // Ensure regions is re-derived if regionOwners changed (patch may have set regions directly)
  if ('regions' in patch) {
    next.regions = (patch as unknown as { regions: EngineSimulationState['regions'] }).regions;
  }
  return next;
}

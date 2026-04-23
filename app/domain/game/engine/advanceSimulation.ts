import { CountryId, ProductionQueueItem } from '../../../types/game';
import { detectTheatersForCountries, syncAIArmyGroupsToTheaters } from '../../../utils/aiArmyGroupTheaters';
import {
  validateDivisions,
  processMovements,
  processCombats,
  applyCompletedMovements,
  applyFinishedCombats,
  regenerateDivisionHP,
  syncArmyGroupTerritories,
  processProductionQueue,
  processScheduledEvents,
  detectDivisionDuplicates,
  logDivisionDuplicates,
} from '../tickHelpers';
import {
  getEffectiveAIStates,
  processAITick,
  hasOwnershipChangedForCountries,
  initializeAIStatesForNewCountries,
} from '../tickHelpers/aiTick';
import { applyArmyGroupActions, applyMissions } from './postTick';
import { EngineSimulationState, SimulationDeps, SimulationLogger, SimulationResult } from './types';

let _tickCounter = 0;

function checkDuplicates(
  label: string,
  tickNum: number,
  state: EngineSimulationState,
  logger: SimulationLogger,
): void {
  const result = detectDivisionDuplicates(state.regions, state.movingUnits, state.activeCombats);
  if (result.hasDuplicates) {
    logDivisionDuplicates(result.reports, tickNum, logger);
    logger.error(`  [DUPLICATE] introduced during: ${label}`);
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
  logger: SimulationLogger = console,
): SimulationResult {
  _tickCounter++;
  const tickNum = _tickCounter;

  const {
    dateTime,
    selectedCountry,
    regions,
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
    logDivisionDuplicates(preCheck.reports, tickNum, logger);
    logger.error('  [DUPLICATE] detected at TICK START — leftovers from previous tick');
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
    logger,
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
    logger,
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
        logger,
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
  checkDuplicates('apply movements / combats', tickNum, midState, logger);

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
  checkDuplicates('AI tick / army group sync', tickNum, afterAIState, logger);

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
  const currentState = applyArmyGroupActions(stateAfterStep9, logger);
  checkDuplicates('army group actions', tickNum, currentState, logger);

  // Step 11: missions
  const finalState = applyMissions(currentState, selectedCountry, {
    effectiveAICountryIds,
    effectiveAIStates,
    selectedCountryId: selectedCountry?.id,
    isPlayerAIEnabled: state.isPlayerAIEnabled,
  }, logger);

  return { state: finalState };
}


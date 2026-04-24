import { CountryId, ProductionQueueItem } from '../../../../types/game';
import { detectTheatersForCountries, syncAIArmyGroupsToTheaters } from '../../../../utils/aiArmyGroupTheaters';
import {
  getEffectiveAIStates,
  processAITick,
  hasOwnershipChangedForCountries,
  initializeAIStatesForNewCountries,
} from '../../logic/aiTick';
import type { SimulationContext, SimulationDeps, SimulationLogger, EngineSimulationState } from '../types';

export function processAIStep(
  context: SimulationContext,
  _deps: SimulationDeps,
  _logger: SimulationLogger,
): SimulationContext {
  const { state } = context;
  const {
    aiStates,
    selectedCountry,
    isPlayerAIEnabled,
    regions,
    adjacency,
    relationships,
    armyGroups,
    divisions,
    movingUnits,
    activeCombats,
    theaters,
    productionQueues,
  } = state;

  const aiStatesAfterEvents = initializeAIStatesForNewCountries(
    aiStates,
    regions,
    selectedCountry?.id,
  );

  const effectiveAIStates = getEffectiveAIStates(
    aiStatesAfterEvents,
    selectedCountry?.id,
    isPlayerAIEnabled,
  );
  const effectiveAICountryIds = effectiveAIStates.map(s => s.countryId);
  let nextAIStates = effectiveAIStates.filter(s => s.countryId !== selectedCountry?.id);
  let nextArmyGroups = armyGroups;
  let nextProductionQueues: Record<CountryId, ProductionQueueItem[]> = {
    ...((context.remainingProductions as Record<CountryId, ProductionQueueItem[]>) ?? productionQueues),
  };
  let nextActiveCombats = activeCombats;
  let nextRegions = regions;
  let nextDivisions = divisions;
  let nextMovingUnits = movingUnits;

  const prevAIStateIds = new Set(aiStatesAfterEvents.map(s => s.countryId));
  const hasNewAICountries = effectiveAICountryIds.some(id => !prevAIStateIds.has(id));
  const theaterCountryIds = new Set([
    ...effectiveAICountryIds,
    ...(selectedCountry ? [selectedCountry.id] : []),
  ]);
  const theaterInputsChanged =
    hasNewAICountries ||
    relationships !== state.relationships ||
    hasOwnershipChangedForCountries(theaterCountryIds, regions, nextRegions);

  const nextTheaters = theaterInputsChanged
    ? detectTheatersForCountries({
        regions: nextRegions,
        adjacency,
        countryIds: Array.from(theaterCountryIds),
        existingTheaters: theaters,
        relationships,
      })
    : theaters;

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
      modifiers: state.modifiers,
      newDate: context.newDate,
      selectedCountryId: selectedCountry?.id,
      theaters: nextTheaters,
      relationships,
    });
    nextAIStates = aiResult.nextAIStates;
    nextArmyGroups = aiResult.nextArmyGroups;
    nextProductionQueues = aiResult.nextProductionQueues;
    nextDivisions = aiResult.nextDivisions;
  }

  const nextState: EngineSimulationState = {
    ...state,
    regions: nextRegions,
    movingUnits: nextMovingUnits,
    activeCombats: nextActiveCombats,
    divisions: nextDivisions,
    aiStates: nextAIStates,
    armyGroups: nextArmyGroups,
    theaters: nextTheaters,
    productionQueues: nextProductionQueues,
  };

  return {
    ...context,
    state: nextState,
    effectiveAICountryIds,
    theaterInputsChanged,
    nextTheaters,
  };
}

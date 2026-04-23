import { CountryId } from '../../../../types/game';
import { checkAndCompleteMissions, checkAndClaimAIMissions } from '../../tickHelpers';
import type { SimulationContext, SimulationDeps, SimulationLogger, EngineSimulationState } from '../types';

export function applyMissionsStep(
  context: SimulationContext,
  _deps: SimulationDeps,
  _logger: SimulationLogger,
): SimulationContext {
  const { state } = context;
  const {
    missions,
    regions,
    dateTime,
    gameEvents,
    selectedCountry,
    theaters,
    armyGroups,
    adjacency,
    relationships,
    divisions,
    movingUnits,
    countryBonuses,
    aiStates,
    notifications,
    isPlayerAIEnabled,
    effectiveAICountryIds,
  } = {
    ...state,
    effectiveAICountryIds: context.effectiveAICountryIds ?? [],
  };

  let finalState: EngineSimulationState = state;

  if (selectedCountry && !isPlayerAIEnabled) {
    const missionState = {
      missions,
      regions,
      dateTime,
      gameEvents,
      selectedCountry,
      theaters,
      armyGroups,
      adjacency,
      relationships,
      divisions,
      movingUnits,
      countryBonuses,
      aiStates,
      notifications,
    };
    const missionResults = checkAndCompleteMissions(missionState, selectedCountry);

    if (missionResults.updatedMissions.some((m, i) => m.completed !== missions[i].completed)) {
      finalState = {
        ...finalState,
        missions: missionResults.updatedMissions,
        gameEvents: [...finalState.gameEvents, ...missionResults.newEvents],
        notifications: [...finalState.notifications, ...missionResults.newNotifications],
      };
    }
  }

  const aiMissionCountryIds = (effectiveAICountryIds as CountryId[])
    .filter(countryId => countryId !== selectedCountry?.id || isPlayerAIEnabled);

  if (aiMissionCountryIds.length > 0) {
    const missionState = {
      missions: finalState.missions,
      regions: finalState.regions,
      dateTime: finalState.dateTime,
      gameEvents: finalState.gameEvents,
      selectedCountry: finalState.selectedCountry,
      theaters: finalState.theaters,
      armyGroups: finalState.armyGroups,
      adjacency: finalState.adjacency,
      relationships: finalState.relationships,
      divisions: finalState.divisions,
      movingUnits: finalState.movingUnits,
      countryBonuses: finalState.countryBonuses,
      aiStates: finalState.aiStates,
      notifications: finalState.notifications,
    };
    const aiMissionResults = checkAndClaimAIMissions(missionState, aiMissionCountryIds);

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

  return { ...context, state: finalState };
}

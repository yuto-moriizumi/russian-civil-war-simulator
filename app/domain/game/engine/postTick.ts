import { CountryId } from '../../../types/game';
import { checkAndCompleteMissions, checkAndClaimAIMissions } from '../tickHelpers';
import { attackArmyGroup } from '../armyGroupAttack';
import { defendArmyGroup } from '../armyGroupDefend';
import { EngineSimulationState, SimulationLogger, noOpLogger } from './types';

interface PostAICtx {
  effectiveAICountryIds: CountryId[];
  effectiveAIStates: import('../../../types/game').AIState[];
  selectedCountryId: CountryId | undefined;
  isPlayerAIEnabled: boolean;
}

export function applyArmyGroupActions(
  state: EngineSimulationState,
  logger: SimulationLogger = noOpLogger(),
): EngineSimulationState {
  const armyGroupActionsNeeded = state.armyGroups.filter(g => g.mode !== 'none');
  if (armyGroupActionsNeeded.length === 0) return state;

  let current = state;
  for (const group of armyGroupActionsNeeded) {
    let patch: Partial<EngineSimulationState> | null;
    if (group.mode === 'advance') {
      patch = attackArmyGroup(group.id, current, logger);
    } else if (group.mode === 'defend') {
      patch = defendArmyGroup(group.id, current, logger);
    } else {
      patch = null;
    }
    if (patch) {
      current = { ...current, ...patch };
    }
  }
  return current;
}

export function applyMissions(
  state: EngineSimulationState,
  selectedCountry: EngineSimulationState['selectedCountry'],
  ctx: PostAICtx,
  _logger: SimulationLogger = noOpLogger(),
): EngineSimulationState {
  let finalState = state;

  if (selectedCountry && !state.isPlayerAIEnabled) {
    const missionState = {
      missions: finalState.missions,
      regions: finalState.regions,
      dateTime: finalState.dateTime,
      gameEvents: finalState.gameEvents,
      selectedCountry,
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
    const missionResults = checkAndCompleteMissions(missionState, selectedCountry);

    if (missionResults.updatedMissions.some((m, i) => m.completed !== finalState.missions[i].completed)) {
      finalState = {
        ...finalState,
        missions: missionResults.updatedMissions,
        gameEvents: [...finalState.gameEvents, ...missionResults.newEvents],
        notifications: [...finalState.notifications, ...missionResults.newNotifications],
      };
    }
  }

  const aiMissionCountryIds = ctx.effectiveAIStates
    .map(aiState => aiState.countryId)
    .filter(
      countryId => countryId !== ctx.selectedCountryId || state.isPlayerAIEnabled,
    );
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

  return finalState;
}

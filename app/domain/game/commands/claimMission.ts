import { createGameEvent, createNotification } from '../eventUtils';
import { EngineSimulationState } from '../engine/types';
import {
  applyClaimedMissionRewards,
  buildMissionRewardDescription,
} from '../missionRewards';
import { GameCommandResult } from './types';

export function applyClaimMissionCommand(
  state: EngineSimulationState,
  missionId: string,
): GameCommandResult {
  const mission = state.missions.find(item => item.id === missionId);
  if (
    !mission ||
    !mission.completed ||
    mission.claimed ||
    !state.selectedCountry ||
    mission.country !== state.selectedCountry.id
  ) {
    return { state, applied: false };
  }

  const countryId = mission.country;
  const rewardDescription = buildMissionRewardDescription(mission.rewards);
  const claimEvent = createGameEvent(
    'mission_claimed',
    `Mission Completed: ${mission.name}`,
    `Mission "${mission.name}" completed! Bonuses gained: ${rewardDescription}.`,
    state.dateTime,
    countryId,
  );

  const updatedMissions = state.missions.map(item =>
    item.id === missionId ? { ...item, claimed: true } : item,
  );

  const rewards = applyClaimedMissionRewards(
    {
      regions: state.regions,
      movingUnits: state.movingUnits,
      relationships: state.relationships,
      armyGroups: state.armyGroups,
      aiStates: state.aiStates,
      selectedCountry: state.selectedCountry,
      countryBonuses: state.countryBonuses,
      dateTime: state.dateTime,
      divisions: state.divisions,
      activeCombats: state.activeCombats,
    },
    mission,
    countryId,
    updatedMissions,
  );

  const nextEvents = [...state.gameEvents, claimEvent];
  const nextNotifications = [
    ...state.notifications,
    createNotification(claimEvent, state.dateTime),
  ];

  if (mission.rewards.gameVictory) {
    const victoryEvent = createGameEvent(
      'game_victory',
      'Victory!',
      `${state.selectedCountry.name} has achieved total victory in the Russian Civil War!`,
      state.dateTime,
      countryId,
    );
    nextEvents.push(victoryEvent);
    nextNotifications.push(createNotification(victoryEvent, state.dateTime));
  }

  for (const event of rewards.rewardEvents) {
    nextEvents.push(event);
    nextNotifications.push(createNotification(event, state.dateTime));
  }

  return {
    applied: true,
    state: {
      ...state,
      missions: updatedMissions,
      countryBonuses: {
        ...state.countryBonuses,
        [countryId]: rewards.updatedCountryBonuses,
      },
      regions: rewards.updatedRegions,
      divisions: rewards.updatedDivisions,
      movingUnits: rewards.updatedMovingUnits,
      relationships: rewards.updatedRelationships,
      armyGroups: rewards.updatedArmyGroups,
      aiStates: rewards.updatedAIStates,
      gameEvents: nextEvents,
      notifications: nextNotifications,
    },
  };
}

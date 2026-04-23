import { createGameEvent, createNotification } from '../../../utils/eventUtils';
import { applyClaimedMissionRewards, buildMissionRewardDescription } from '../missionRewards';
import { buildRegionUpdate, extractRegionOwners } from '../../../utils/regionState';
import type { GameStore } from '../types';

export function buildClaimMissionPatch(state: GameStore, missionId: string): Partial<GameStore> | null {
  const mission = state.missions.find(m => m.id === missionId);
  if (!mission || !mission.completed || mission.claimed || !state.selectedCountry || mission.country !== state.selectedCountry.id) {
    return null;
  }

  const countryId = mission.country;
  const events = [...state.gameEvents];
  const notifs = [...state.notifications];
  const rewardDescription = buildMissionRewardDescription(mission.rewards);

  const claimEvent = createGameEvent(
    'mission_claimed',
    `Mission Completed: ${mission.name}`,
    `Mission "${mission.name}" completed! Bonuses gained: ${rewardDescription}.`,
    state.dateTime,
    countryId
  );
  events.push(claimEvent);
  notifs.push(createNotification(claimEvent, state.dateTime));

  if (mission.rewards.gameVictory) {
    const victoryEvent = createGameEvent(
      'game_victory',
      'Victory!',
      `${state.selectedCountry.name} has achieved total victory in the Russian Civil War!`,
      state.dateTime,
      countryId
    );
    events.push(victoryEvent);
    notifs.push(createNotification(victoryEvent, state.dateTime));
  }

  const updatedMissions = state.missions.map(m =>
    m.id === missionId ? { ...m, claimed: true } : m
  );

  const rewards = applyClaimedMissionRewards(state, mission, countryId, updatedMissions);

  console.log(`[MISSION CLAIMED] ${mission.name} - Applied bonuses to ${countryId} divisions`);
  console.log(`[BONUSES] Attack: +${rewards.updatedCountryBonuses.attackBonus}, Defence: +${rewards.updatedCountryBonuses.defenceBonus}, HP: +${rewards.updatedCountryBonuses.hpBonus}, Command Power: +${rewards.updatedCountryBonuses.commandPowerBonus}, Prod Speed: ${rewards.updatedCountryBonuses.productionSpeedMultiplier.toFixed(2)}x`);

  rewards.rewardEvents.forEach(e => {
    events.push(e);
    notifs.push(createNotification(e, state.dateTime));
  });

  return {
    missions: updatedMissions,
    countryBonuses: {
      ...state.countryBonuses,
      [countryId]: rewards.updatedCountryBonuses,
    },
    ...buildRegionUpdate(state.regionDefinitions, extractRegionOwners(rewards.updatedRegions)),
    divisions: rewards.updatedDivisions,
    movingUnits: rewards.updatedMovingUnits,
    relationships: rewards.updatedRelationships,
    armyGroups: rewards.updatedArmyGroups,
    aiStates: rewards.updatedAIStates,
    gameEvents: events,
    notifications: notifs,
  };
}

import { Mission, GameEvent, NotificationItem, Country, CountryId, CountryBonuses, RegionState, Movement, Relationship, ArmyGroup, AIState, DivisionState } from '../../../types/game';
import { areMissionConditionsMet } from '../missionHelpers';
import { createGameEvent, createNotification } from '../../../utils/eventUtils';
import { applyClaimedMissionRewards } from '../missionRewards';
import { getCountryName } from '../../../data/countries';

interface MissionState {
  missions: Mission[];
  regions: RegionState;
  dateTime: Date;
  gameEvents: GameEvent[];
  selectedCountry: Country | null;
  theaters: import('../../../types/game').Theater[];
  armyGroups: ArmyGroup[];
  adjacency: import('../../../types/game').Adjacency;
  relationships: Relationship[];
  divisions: DivisionState;
  movingUnits: Movement[];
  countryBonuses: Record<CountryId, CountryBonuses>;
  aiStates: AIState[];
  notifications: NotificationItem[];
}

interface MissionCheckResult {
  updatedMissions: Mission[];
  newEvents: GameEvent[];
  newNotifications: NotificationItem[];
}

interface AIMissionCheckResult {
  updatedMissions: Mission[];
  countryBonuses: Record<CountryId, CountryBonuses>;
  regions: RegionState;
  divisions: DivisionState;
  movingUnits: Movement[];
  relationships: Relationship[];
  armyGroups: ArmyGroup[];
  aiStates: AIState[];
  newEvents: GameEvent[];
  changed: boolean;
}

function arePrerequisitesClaimed(mission: Mission, missions: Mission[]): boolean {
  return mission.prerequisites.every(prereqId => {
    const prereqMission = missions.find(m => m.id === prereqId);
    return prereqMission?.claimed;
  });
}

export function checkAndCompleteMissions(
  state: MissionState,
  selectedCountry: Country
): MissionCheckResult {
  const newEvents: GameEvent[] = [];
  const newNotifications: NotificationItem[] = [];

  const updatedMissions = state.missions.map(mission => {
    if (mission.country !== selectedCountry.id) return mission;
    if (mission.completed) return mission;

    const prerequisitesMet = arePrerequisitesClaimed(mission, state.missions);
    if (!prerequisitesMet) return mission;

    const conditionsMet = areMissionConditionsMet(mission, {
      regions: state.regions,
      dateTime: state.dateTime,
      gameEvents: state.gameEvents,
      selectedCountry,
      countryId: selectedCountry.id,
      theaters: state.theaters,
      armyGroups: state.armyGroups,
      adjacency: state.adjacency,
      relationships: state.relationships,
      divisions: state.divisions,
    });

    if (conditionsMet) {
      const completionEvent = createGameEvent(
        'mission_completed',
        `Mission Complete: ${mission.name}`,
        mission.description,
        state.dateTime,
        selectedCountry.id
      );
      const completionNotification = createNotification(completionEvent, state.dateTime);
      newEvents.push(completionEvent);
      newNotifications.push(completionNotification);
      return { ...mission, completed: true };
    }

    return mission;
  });

  return { updatedMissions, newEvents, newNotifications };
}

export function checkAndClaimAIMissions(
  state: MissionState,
  aiCountryIds: CountryId[]
): AIMissionCheckResult {
  const aiCountries = new Set(aiCountryIds);
  let updatedMissions = state.missions;
  let countryBonuses = state.countryBonuses;
  let regions = state.regions;
  let divisions = state.divisions;
  let movingUnits = state.movingUnits;
  let relationships = state.relationships;
  let armyGroups = state.armyGroups;
  let aiStates = state.aiStates;
  const newEvents: GameEvent[] = [];
  let changed = false;

  const makeWorkingState = () => ({
    ...state,
    missions: updatedMissions,
    countryBonuses,
    regions,
    divisions,
    movingUnits,
    relationships,
    armyGroups,
    aiStates,
  });

  for (const countryId of aiCountries) {
    let claimedMissionThisPass = true;

    while (claimedMissionThisPass) {
      claimedMissionThisPass = false;

      for (const mission of updatedMissions) {
        if (mission.country !== countryId || mission.claimed) continue;
        if (!arePrerequisitesClaimed(mission, updatedMissions)) continue;

        const workingState = makeWorkingState();
        if (!mission.completed) {
          const conditionsMet = areMissionConditionsMet(mission, {
            regions,
            dateTime: state.dateTime,
            gameEvents: state.gameEvents,
            selectedCountry: state.selectedCountry,
            countryId,
            theaters: state.theaters,
            armyGroups,
            adjacency: state.adjacency,
            relationships,
            divisions: state.divisions,
          });
          if (!conditionsMet) continue;
        }

        const completedMission: Mission = { ...mission, completed: true, claimed: true };
        updatedMissions = updatedMissions.map(m =>
          m.id === mission.id ? completedMission : m
        );

        const rewards = applyClaimedMissionRewards(
          workingState,
          completedMission,
          countryId,
          updatedMissions
        );

        countryBonuses = {
          ...countryBonuses,
          [countryId]: rewards.updatedCountryBonuses,
        };
        regions = rewards.updatedRegions;
        divisions = rewards.updatedDivisions;
        movingUnits = rewards.updatedMovingUnits;
        relationships = rewards.updatedRelationships;
        armyGroups = rewards.updatedArmyGroups;
        aiStates = rewards.updatedAIStates;
        newEvents.push(...rewards.rewardEvents);
        if (completedMission.rewards.gameVictory) {
          newEvents.push(createGameEvent(
            'game_victory',
            'AI Victory',
            `${getCountryName(countryId)} has achieved total victory in the Russian Civil War!`,
            state.dateTime,
            countryId
          ));
        }
        changed = true;
        claimedMissionThisPass = true;
      }
    }
  }

  return {
    updatedMissions,
    countryBonuses,
    regions,
    divisions,
    movingUnits,
    relationships,
    armyGroups,
    aiStates,
    newEvents,
    changed,
  };
}

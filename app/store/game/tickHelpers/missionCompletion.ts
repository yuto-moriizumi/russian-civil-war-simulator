import { Mission, GameEvent, NotificationItem, Country, CountryId } from '../../../types/game';
import { areMissionConditionsMet } from '../missionHelpers';
import { createGameEvent, createNotification } from '../../../domain/game/eventUtils';
import { StoreApi } from 'zustand';
import { ActionsState } from '../types';
import { applyClaimedMissionRewards } from '../missionRewards';
import { getCountryName } from '../../../data/countries';

interface MissionCheckResult {
  updatedMissions: Mission[];
  newEvents: GameEvent[];
  newNotifications: NotificationItem[];
}

interface AIMissionCheckResult {
  updatedMissions: Mission[];
  countryBonuses: ActionsState['countryBonuses'];
  regions: ActionsState['regions'];
  divisions: ActionsState['divisions'];
  movingUnits: ActionsState['movingUnits'];
  relationships: ActionsState['relationships'];
  armyGroups: ActionsState['armyGroups'];
  aiStates: ActionsState['aiStates'];
  newEvents: GameEvent[];
  changed: boolean;
}

function arePrerequisitesClaimed(mission: Mission, missions: Mission[]): boolean {
  return mission.prerequisites.every(prereqId => {
    const prereqMission = missions.find(m => m.id === prereqId);
    return prereqMission?.claimed;
  });
}

/**
 * Checks and auto-completes missions based on conditions
 */
export function checkAndCompleteMissions(
  get: StoreApi<ActionsState>['getState'],
  selectedCountry: Country
): MissionCheckResult {
  const currentState = get();
  const newEvents: GameEvent[] = [];
  const newNotifications: NotificationItem[] = [];
  
  const updatedMissions = currentState.missions.map(mission => {
    if (mission.country !== selectedCountry.id) {
      return mission;
    }

    // Skip if mission is already completed
    if (mission.completed) {
      return mission;
    }
    
    // Check if prerequisites are met (all must be claimed)
    const prerequisitesMet = arePrerequisitesClaimed(mission, currentState.missions);
    
    if (!prerequisitesMet) {
      return mission;
    }
    
    // Check if all availability conditions are met
    const conditionsMet = areMissionConditionsMet(mission, {
      regions: currentState.regions,
      dateTime: currentState.dateTime,
      gameEvents: currentState.gameEvents,
      selectedCountry,
      countryId: selectedCountry.id,
      theaters: currentState.theaters,
      armyGroups: currentState.armyGroups,
      adjacency: currentState.adjacency,
      relationships: currentState.relationships,
      divisions: currentState.divisions,
    });
    
    if (conditionsMet) {
      // Auto-complete the mission
      const completionEvent = createGameEvent(
        'mission_completed',
        `Mission Complete: ${mission.name}`,
        mission.description,
        currentState.dateTime,
        selectedCountry.id
      );
      
      const completionNotification = createNotification(completionEvent, currentState.dateTime);
      
      newEvents.push(completionEvent);
      newNotifications.push(completionNotification);
      
      return { ...mission, completed: true };
    }
    
    return mission;
  });
  
  return { updatedMissions, newEvents, newNotifications };
}

/**
 * AI countries do not have a mission screen to click through, so they complete
 * and claim every currently available mission during the tick.
 */
export function checkAndClaimAIMissions(
  state: ActionsState,
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

  const makeWorkingState = (): ActionsState => ({
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
        // If already completed (conditions were met previously), claim immediately
        // Otherwise check if conditions are currently met
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

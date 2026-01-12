import { Mission, GameEvent, NotificationItem, Country } from '../../../types/game';
import { areMissionConditionsMet } from '../missionHelpers';
import { createGameEvent, createNotification } from '../../../utils/eventUtils';
import { StoreApi } from 'zustand';
import { GameStore } from '../types';

interface MissionCheckResult {
  updatedMissions: Mission[];
  newEvents: GameEvent[];
  newNotifications: NotificationItem[];
}

/**
 * Checks and auto-completes missions based on conditions
 */
export function checkAndCompleteMissions(
  get: StoreApi<GameStore>['getState'],
  selectedCountry: Country
): MissionCheckResult {
  const currentState = get();
  const newEvents: GameEvent[] = [];
  const newNotifications: NotificationItem[] = [];
  
  const updatedMissions = currentState.missions.map(mission => {
    // Skip if mission is already completed
    if (mission.completed) {
      return mission;
    }
    
    // Check if prerequisites are met (all must be claimed)
    const prerequisitesMet = mission.prerequisites.every(prereqId => {
      const prereqMission = currentState.missions.find(m => m.id === prereqId);
      return prereqMission?.claimed;
    });
    
    if (!prerequisitesMet) {
      return mission;
    }
    
    // Check if all availability conditions are met
    const conditionsMet = areMissionConditionsMet(mission, {
      regions: currentState.regions,
      money: currentState.money,
      dateTime: currentState.dateTime,
      gameEvents: currentState.gameEvents,
      selectedCountry: currentState.selectedCountry!,
      theaters: currentState.theaters,
      armyGroups: currentState.armyGroups,
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

import { calculateFactionIncome } from '../../utils/mapUtils';
import { runAITick } from '../../ai/cpuPlayer';
import { GameStore } from './types';
import { StoreApi } from 'zustand';
import { 
  validateDivisions, 
  processMovements, 
  processCombats, 
  applyCompletedMovements, 
  applyFinishedCombats, 
  regenerateDivisionHP, 
  syncArmyGroupTerritories, 
  checkAndCompleteMissions 
} from './tickHelpers';

/**
 * Defines the game tick action which runs every game hour
 * This is the main game loop that processes:
 * - Unit movements
 * - Combat resolution
 * - HP regeneration
 * - AI actions
 * - Mission completion
 * - Theater updates
 */
export const createTickActions = (
  set: StoreApi<GameStore>['setState'],
  get: StoreApi<GameStore>['getState']
) => ({
  tick: () => {
    const state = get();
    if (!state.isPlaying) return;

    const { dateTime, selectedCountry, regions, adjacency, movingUnits, activeCombats, money, aiStates, gameEvents, notifications, armyGroups } = state;
    
    // Step 1: Validate divisions (development mode only)
    const { updatedRegions, updatedMovingUnits } = validateDivisions(regions, movingUnits, armyGroups);
    
    // Step 2: Calculate income and advance time
    const playerFaction = selectedCountry?.id;
    const playerIncome = playerFaction ? calculateFactionIncome(updatedRegions, playerFaction, updatedMovingUnits) : 0;
    const newDate = new Date(dateTime);
    newDate.setHours(newDate.getHours() + 1);
    const newMoney = money + playerIncome;
    
    // Step 3: Process unit movements
    const { remainingMovements, completedMovements } = processMovements(updatedMovingUnits, newDate);

    // Step 4: Process active combats
    const { updatedCombats, finishedCombats, newCombatEvents, newCombatNotifications, retreatMovements } = processCombats(activeCombats, newDate, updatedRegions, adjacency);

    // Step 5: Apply completed movements to regions
    let nextRegions: typeof updatedRegions;
    const { nextCombats, nextEvents, nextNotifications } = (() => {
      const result = applyCompletedMovements(
        completedMovements,
        {
          regions: updatedRegions,
          combats: updatedCombats,
          events: [...gameEvents, ...newCombatEvents],
          notifications: [...notifications, ...newCombatNotifications],
        },
        newDate
      );
      nextRegions = result.nextRegions;
      return result;
    })();

    // Step 6: Apply finished combats to regions
    nextRegions = applyFinishedCombats(finishedCombats, nextRegions);

    // Step 6b: Add retreat movements to the moving units list
    const nextMovingUnits = [...remainingMovements, ...retreatMovements];

    // Step 7: Regenerate HP for all stationary divisions
    nextRegions = regenerateDivisionHP(nextRegions);

    // Step 8: AI Tick - process AI actions and deployments for all AI factions
    let nextAIStates = aiStates;
    let nextArmyGroups = armyGroups;
    if (aiStates.length > 0) {
      // Process each AI faction
      nextAIStates = aiStates.map(aiState => {
        const aiActions = runAITick(aiState, nextRegions, nextArmyGroups, nextCombats, remainingMovements);
        
        // If AI created a new army group, add it
        if (aiActions.newArmyGroup) {
          nextArmyGroups = [...nextArmyGroups, aiActions.newArmyGroup];
        }
        
        // Apply AI deployments
        if (aiActions.deployments.length > 0) {
          aiActions.deployments.forEach(deployment => {
            if (nextRegions[deployment.regionId]) {
              nextRegions[deployment.regionId] = {
                ...nextRegions[deployment.regionId],
                divisions: [...nextRegions[deployment.regionId].divisions, ...deployment.divisions],
              };
            }
          });
        }
        
        return aiActions.updatedAIState;
      });
    }

    // Step 9: Sync army group territories with actual division locations
    nextArmyGroups = syncArmyGroupTerritories(nextArmyGroups, nextRegions, nextMovingUnits);

    // Step 9b: Process army group automatic modes (advance/defend)
    // This needs to be done before updating state to ensure actions are queued
    const armyGroupActionsNeeded = nextArmyGroups.filter(g => g.mode !== 'none' && g.owner === playerFaction);
    
    // Update state first so actions have latest data
    set({
      dateTime: newDate,
      money: newMoney,
      income: playerIncome,
      movingUnits: nextMovingUnits,
      activeCombats: nextCombats,
      regions: nextRegions,
      gameEvents: nextEvents,
      notifications: nextNotifications,
      aiStates: nextAIStates, // Updated AI states
      armyGroups: nextArmyGroups,
    });

    // Now trigger automatic actions for army groups in advance/defend mode
    armyGroupActionsNeeded.forEach(group => {
      if (group.mode === 'advance') {
        get().advanceArmyGroup(group.id);
      } else if (group.mode === 'defend') {
        get().defendArmyGroup(group.id);
      }
    });
    
    // Step 11: Check and auto-complete missions
    if (selectedCountry) {
      const missionResults = checkAndCompleteMissions(get, selectedCountry);
      
      // Only update if missions changed
      if (missionResults.updatedMissions.some((m, i) => m.completed !== get().missions[i].completed)) {
        set({
          missions: missionResults.updatedMissions,
          gameEvents: [...get().gameEvents, ...missionResults.newEvents],
          notifications: [...get().notifications, ...missionResults.newNotifications],
        });
      }
    }
    
    // Step 12: Update theaters after regions change
    get().detectAndUpdateTheaters();
  },
});

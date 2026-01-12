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

    const { dateTime, selectedCountry, regions, movingUnits, activeCombats, money, aiState, gameEvents, notifications, armyGroups } = state;
    
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
    const { updatedCombats, finishedCombats, newCombatEvents, newCombatNotifications } = processCombats(activeCombats, newDate);

    // Step 5: Apply completed movements to regions
    let { nextRegions, nextCombats, nextEvents, nextNotifications } = applyCompletedMovements(
      completedMovements,
      {
        regions: updatedRegions,
        combats: updatedCombats,
        events: [...gameEvents, ...newCombatEvents],
        notifications: [...notifications, ...newCombatNotifications],
      },
      newDate
    );

    // Step 6: Apply finished combats to regions
    nextRegions = applyFinishedCombats(finishedCombats, nextRegions);

    // Step 7: Regenerate HP for all stationary divisions
    nextRegions = regenerateDivisionHP(nextRegions);

    // Step 8: AI Tick - process AI actions and deployments
    let nextAIState = aiState;
    let nextArmyGroups = armyGroups;
    if (aiState) {
      const aiActions = runAITick(aiState, nextRegions, armyGroups, nextCombats, remainingMovements);
      nextAIState = aiActions.updatedAIState;
      
      // If AI created a new army group, add it
      if (aiActions.newArmyGroup) {
        nextArmyGroups = [...armyGroups, aiActions.newArmyGroup];
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
    }

    // Step 9: Sync army group territories with actual division locations
    nextArmyGroups = syncArmyGroupTerritories(nextArmyGroups, nextRegions, remainingMovements);

    // Step 10: Update game state
    set({
      dateTime: newDate,
      money: newMoney,
      income: playerIncome,
      movingUnits: remainingMovements,
      activeCombats: nextCombats,
      regions: nextRegions,
      gameEvents: nextEvents,
      notifications: nextNotifications,
      aiState: nextAIState,
      armyGroups: nextArmyGroups,
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

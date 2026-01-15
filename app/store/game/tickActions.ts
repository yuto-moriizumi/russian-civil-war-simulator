import { calculateFactionIncome } from '../../utils/mapUtils';
import { runAITick } from '../../ai/cpuPlayer';
import { GameStore } from './types';
import { StoreApi } from 'zustand';
import { ProductionQueueItem, FactionId } from '../../types/game';
import { 
  validateDivisions, 
  processMovements, 
  processCombats, 
  applyCompletedMovements, 
  applyFinishedCombats, 
  regenerateDivisionHP, 
  syncArmyGroupTerritories, 
  checkAndCompleteMissions,
  processProductionQueue
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

    const { dateTime, selectedCountry, regions, adjacency, movingUnits, activeCombats, money, aiStates, gameEvents, notifications, armyGroups, productionQueues, relationships } = state;
    
    // Step 1: Validate divisions (development mode only)
    const { updatedRegions, updatedMovingUnits } = validateDivisions(regions, movingUnits, armyGroups);
    
    // Step 2: Process production queue
    const { remainingProductions, updatedRegions: regionsAfterProduction, completedProductions } = processProductionQueue(
      productionQueues,
      dateTime,
      updatedRegions
    );
    
    // Create events for completed productions
    const productionEvents = completedProductions
      .filter(p => p.owner === selectedCountry?.id) // Only show events for player
      .map(p => ({
        id: `event-${Date.now()}-${p.id}`,
        type: 'production_completed' as const,
        timestamp: dateTime,
        title: 'Production Complete',
        description: `${p.divisionName} has been produced and deployed.`,
        faction: p.owner,
      }));
    
    const productionNotifications = completedProductions
      .filter(p => p.owner === selectedCountry?.id)
      .map(p => ({
        id: `notif-${Date.now()}-${p.id}`,
        type: 'production_completed' as const,
        timestamp: dateTime,
        title: 'Production Complete',
        description: `${p.divisionName} has been produced and deployed.`,
        faction: p.owner,
        expiresAt: new Date(dateTime.getTime() + 6 * 60 * 60 * 1000), // 6 hours
      }));
    
    // Step 3: Calculate income and advance time
    const playerFaction = selectedCountry?.id;
    const playerIncome = playerFaction ? calculateFactionIncome(regionsAfterProduction, playerFaction, updatedMovingUnits) : 0;
    const newDate = new Date(dateTime);
    newDate.setHours(newDate.getHours() + 1);
    const newMoney = money + playerIncome;
    
    // Step 4: Process unit movements
    const { remainingMovements, completedMovements } = processMovements(updatedMovingUnits, newDate);

    // Step 5: Process active combats
    const { updatedCombats, finishedCombats, newCombatEvents, newCombatNotifications, retreatMovements } = processCombats(activeCombats, newDate, regionsAfterProduction, adjacency);

    // Step 6: Apply completed movements to regions
    let nextRegions: typeof regionsAfterProduction;
    const { nextCombats, nextEvents, nextNotifications } = (() => {
      const result = applyCompletedMovements(
        completedMovements,
        {
          regions: regionsAfterProduction,
          combats: updatedCombats,
          events: [...gameEvents, ...newCombatEvents, ...productionEvents],
          notifications: [...notifications, ...newCombatNotifications, ...productionNotifications],
          relationships,
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
    const nextProductionQueues: Record<FactionId, ProductionQueueItem[]> = { ...remainingProductions };

    if (aiStates.length > 0) {
      // Process each AI faction
      nextAIStates = aiStates.map(aiState => {
        const aiActions = runAITick(aiState, nextRegions, nextArmyGroups, nextCombats, remainingMovements, nextProductionQueues[aiState.factionId] || [], nextProductionQueues);
        
        // If AI created a new army group, add it
        if (aiActions.newArmyGroup) {
          nextArmyGroups = [...nextArmyGroups, aiActions.newArmyGroup];
        }
        
        // Handle AI production requests
        if (aiActions.productionRequests.length > 0) {
          // Get or initialize the faction's queue
          const factionQueue = nextProductionQueues[aiState.factionId] || [];
          
          aiActions.productionRequests.forEach(req => {
            const completionTime = new Date(newDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours production
            factionQueue.push({
              id: `prod-ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              divisionName: req.divisionName,
              owner: aiState.factionId,
              startTime: newDate,
              completionTime,
              targetRegionId: req.targetRegionId,
              armyGroupId: req.armyGroupId,
            });
          });
          
          // Update the faction's queue
          nextProductionQueues[aiState.factionId] = factionQueue;
        }
        
        return aiActions.updatedAIState;
      });
    }

    // Step 9: Sync army group territories with actual division locations
    nextArmyGroups = syncArmyGroupTerritories(nextArmyGroups, nextRegions, nextMovingUnits);

    // Step 9b: Process army group automatic modes (advance/defend)
    // This needs to be done before updating state to ensure actions are queued
    const armyGroupActionsNeeded = nextArmyGroups.filter(g => g.mode !== 'none');
    
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
      productionQueues: nextProductionQueues, // Update production queues
    });

    // Now trigger automatic actions for ALL army groups in advance/defend mode (player + AI)
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

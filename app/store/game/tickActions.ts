import { runAITick } from '../../ai/cpuPlayer';
import { GameStore } from './types';
import { StoreApi } from 'zustand';
import { ProductionQueueItem, CountryId } from '../../types/game';
import { getBaseProductionTime } from '../../utils/bonusCalculator';
import { clampProductionQueueToCommandPower } from '../../utils/commandPower';
import { countries } from '../../data/gameData';
import { 
  validateDivisions, 
  processMovements, 
  processCombats, 
  applyCompletedMovements, 
  applyFinishedCombats, 
  regenerateDivisionHP, 
  syncArmyGroupTerritories, 
  checkAndCompleteMissions,
  processProductionQueue,
  processScheduledEvents
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

    console.time('[tick] total');

    const { dateTime, selectedCountry, regions, adjacency, movingUnits, activeCombats, aiStates, gameEvents, notifications, armyGroups, productionQueues, relationships, regionCentroids, scheduledEvents } = state;
    
    // Step 1: Validate divisions (development mode only)
    console.time('[tick] 1-validate');
    const { updatedRegions, updatedMovingUnits } = validateDivisions(regions, movingUnits, armyGroups);
    console.timeEnd('[tick] 1-validate');
    
    // Step 2: Process production queue
    console.time('[tick] 2-production');
    const { remainingProductions, updatedRegions: regionsAfterProduction, completedProductions } = processProductionQueue(
      productionQueues,
      dateTime,
      updatedRegions,
      state.countryBonuses,
      armyGroups
    );
    console.timeEnd('[tick] 2-production');
    
    // Create events for completed productions
    const productionEvents = completedProductions
      .filter(p => p.owner === selectedCountry?.id) // Only show events for player
      .map(p => ({
        id: `event-${Date.now()}-${p.id}`,
        type: 'production_completed' as const,
        timestamp: dateTime,
        title: 'Production Complete',
        description: `${p.divisionName} has been produced and deployed.`,
        country: p.owner,
      }));
    
    const productionNotifications = completedProductions
      .filter(p => p.owner === selectedCountry?.id)
      .map(p => ({
        id: `notif-${Date.now()}-${p.id}`,
        type: 'production_completed' as const,
        timestamp: dateTime,
        title: 'Production Complete',
        description: `${p.divisionName} has been produced and deployed.`,
        country: p.owner,
        expiresAt: new Date(dateTime.getTime() + 6 * 60 * 60 * 1000), // 6 hours
      }));
    
    // Step 3: Advance time
    const newDate = new Date(dateTime);
    newDate.setHours(newDate.getHours() + 1);
    
    // Step 3.5: Process scheduled events (historical events that trigger on specific dates)
    console.time('[tick] 3-scheduled-events');
    const {
      updatedScheduledEvents,
      updatedRegions: regionsAfterEvents,
      updatedRelationships: relationshipsAfterEvents,
      newEvents: scheduledEventEvents,
      newNotifications: scheduledEventNotifications
    } = processScheduledEvents(
      scheduledEvents,
      newDate,
      regionsAfterProduction,
      relationships
    );
    console.timeEnd('[tick] 3-scheduled-events');
    
    // Step 4: Process unit movements
    console.time('[tick] 4-movements');
    const { remainingMovements, completedMovements } = processMovements(updatedMovingUnits, newDate, activeCombats);
    console.timeEnd('[tick] 4-movements');

    // Step 5: Process active combats
    console.time('[tick] 5-combats');
    const { updatedCombats, finishedCombats, newCombatEvents, newCombatNotifications, retreatMovements } = processCombats(activeCombats, newDate, regionsAfterEvents, adjacency, regionCentroids);
    console.timeEnd('[tick] 5-combats');

    // Step 6: Apply completed movements to regions
    console.time('[tick] 6-apply-movements');
    let nextRegions: typeof regionsAfterEvents;
    const { nextCombats, nextEvents, nextNotifications, interceptedMovementIds, newHopMovements } = (() => {
      const result = applyCompletedMovements(
        completedMovements,
        updatedMovingUnits,
        {
          regions: regionsAfterEvents,
          combats: updatedCombats,
          finishedCombats,
          events: [...gameEvents, ...newCombatEvents, ...productionEvents, ...scheduledEventEvents],
          notifications: [...notifications, ...newCombatNotifications, ...productionNotifications, ...scheduledEventNotifications],
          relationships: relationshipsAfterEvents,
          regionCentroids,
        },
        newDate
      );
      nextRegions = result.nextRegions;
      return result;
    })();

    // Step 6: Apply finished combats to regions
    nextRegions = applyFinishedCombats(finishedCombats, nextRegions);
    console.timeEnd('[tick] 6-apply-movements');

    // Step 6b: Add retreat movements to the moving units list, filtering out:
    //   - intercepted movements
    //   - movements whose linked combat just finished (their result is already
    //     applied by applyFinishedCombats; keeping them would double the divisions)
    // Also include newHopMovements from multi-step routes.
    const finishedCombatIds = new Set(finishedCombats.map(c => c.id));
    const nextMovingUnits = [...remainingMovements, ...retreatMovements, ...newHopMovements].filter(m =>
      !interceptedMovementIds.includes(m.id) &&
      !(m.pendingCombatId && finishedCombatIds.has(m.pendingCombatId))
    );

    // Step 7: Regenerate HP for all stationary divisions
    console.time('[tick] 7-hp-regen');
    nextRegions = regenerateDivisionHP(nextRegions);
    console.timeEnd('[tick] 7-hp-regen');

    // Step 8: AI Tick - process AI actions and deployments for all AI countries
    console.time('[tick] 8-ai');
    let nextAIStates = aiStates;
    let nextArmyGroups = armyGroups;
    const nextProductionQueues: Record<CountryId, ProductionQueueItem[]> = { ...remainingProductions };

    if (aiStates.length > 0) {
      // Process each AI country
      nextAIStates = aiStates.map(aiState => {
        const country = countries.find(c => c.id === aiState.countryId);
        const countryBonuses = state.countryBonuses[aiState.countryId];
        const trimmedQueue = clampProductionQueueToCommandPower(
          aiState.countryId,
          nextProductionQueues[aiState.countryId] || [],
          nextRegions,
          nextMovingUnits,
          countryBonuses,
          country?.coreRegions
        );

        if (trimmedQueue !== nextProductionQueues[aiState.countryId]) {
          nextProductionQueues[aiState.countryId] = trimmedQueue;
        }

        const aiActions = runAITick(
          aiState, 
          nextRegions, 
          nextArmyGroups, 
          nextCombats, 
          nextMovingUnits, 
          nextProductionQueues[aiState.countryId] || [], 
          nextProductionQueues,
          countryBonuses,
          country?.coreRegions
        );
        
        // If AI created a new army group, add it
        if (aiActions.newArmyGroup) {
          nextArmyGroups = [...nextArmyGroups, aiActions.newArmyGroup];
        }
        
        // Handle AI production requests
        if (aiActions.productionRequests.length > 0) {
          // Get or initialize the country's queue — always create a new array so
          // we never mutate a reference that may point back to initialGameState.
          const countryQueue = [...(nextProductionQueues[aiState.countryId] || [])];
          const bonuses = state.countryBonuses[aiState.countryId];
          const productionTimeHours = getBaseProductionTime(bonuses);
          
          aiActions.productionRequests.forEach(req => {
            const completionTime = new Date(newDate.getTime() + productionTimeHours * 60 * 60 * 1000);
            const newItem = {
              id: `prod-ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              divisionName: req.divisionName,
              owner: aiState.countryId,
              startTime: newDate,
              completionTime,
              targetRegionId: req.targetRegionId,
              armyGroupId: req.armyGroupId,
            };
            countryQueue.push(newItem);
          });
          
          // Update the country's queue
          nextProductionQueues[aiState.countryId] = countryQueue;
        }
        
        return aiActions.updatedAIState;
      });
    }
    console.timeEnd('[tick] 8-ai');

    // Step 9: Sync army group territories with actual division locations
    console.time('[tick] 9-army-group-sync');
    nextArmyGroups = syncArmyGroupTerritories(nextArmyGroups, nextRegions, nextMovingUnits);
    console.timeEnd('[tick] 9-army-group-sync');

    // Step 9b: Process army group automatic modes (advance/defend)
    // This needs to be done before updating state to ensure actions are queued
    const armyGroupActionsNeeded = nextArmyGroups.filter(g => g.mode !== 'none');
    
    // Update state first so actions have latest data
    console.time('[tick] 10-set-state');
    set({
      dateTime: newDate,
      movingUnits: nextMovingUnits,
      activeCombats: nextCombats,
      regions: nextRegions,
      gameEvents: nextEvents,
      notifications: nextNotifications,
      aiStates: nextAIStates, // Updated AI states
      armyGroups: nextArmyGroups,
      productionQueues: nextProductionQueues, // Update production queues
      scheduledEvents: updatedScheduledEvents, // Update scheduled events
      relationships: relationshipsAfterEvents, // Save updated relationships from events
    });
    console.timeEnd('[tick] 10-set-state');

    // Now trigger automatic actions for ALL army groups in advance/defend mode (player + AI)
    console.time('[tick] 11-army-group-actions');
    armyGroupActionsNeeded.forEach(group => {
      if (group.mode === 'advance') {
        get().advanceArmyGroup(group.id);
      } else if (group.mode === 'defend') {
        get().defendArmyGroup(group.id);
      }
    });
    console.timeEnd('[tick] 11-army-group-actions');
    
    // Step 11: Check and auto-complete missions
    console.time('[tick] 12-missions');
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
    console.timeEnd('[tick] 12-missions');
    
    // Step 12: Update theaters after regions change
    console.time('[tick] 13-theaters');
    get().detectAndUpdateTheaters();
    console.timeEnd('[tick] 13-theaters');

    console.timeEnd('[tick] total');
  },
});

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
import { attackArmyGroup } from './armyGroupAttack';
import { defendArmyGroup } from './armyGroupDefend';
import { TickPerf } from './tickPerformance';

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

    TickPerf.tickStart();
    TickPerf.start('[tick] total');

    const { dateTime, selectedCountry, regions, adjacency, movingUnits, activeCombats, aiStates, gameEvents, notifications, armyGroups, productionQueues, relationships, regionCentroids, scheduledEvents } = state;
    
    // Step 1: Validate divisions (development mode only)
    TickPerf.start('[tick] 1-validate');
    const { updatedRegions, updatedMovingUnits } = validateDivisions(regions, movingUnits, armyGroups);
    TickPerf.end('[tick] 1-validate');
    
    // Step 2: Process production queue
    TickPerf.start('[tick] 2-production');
    const { remainingProductions, updatedRegions: regionsAfterProduction, completedProductions } = processProductionQueue(
      productionQueues,
      dateTime,
      updatedRegions,
      state.countryBonuses,
      armyGroups
    );
    TickPerf.end('[tick] 2-production');
    
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
    TickPerf.start('[tick] 3-scheduled-events');
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
    TickPerf.end('[tick] 3-scheduled-events');
    
    // Step 4: Process unit movements
    TickPerf.start('[tick] 4-movements');
    const { remainingMovements, completedMovements, newMidTransitCombats } = processMovements(
      updatedMovingUnits,
      newDate,
      activeCombats,
      regionsAfterEvents,
      relationshipsAfterEvents
    );
    TickPerf.end('[tick] 4-movements');

    // Step 4.5: Incorporate mid-transit combats (enemy appeared at destination after movement started)
    // Merge new combats into the active list and clear the defender divisions from those regions
    // so they are absorbed into the combat (matching the behaviour of combats started at dispatch time).
    let combatsBeforeStep5 = activeCombats;
    let regionsBeforeStep5 = regionsAfterEvents;
    if (newMidTransitCombats.length > 0) {
      combatsBeforeStep5 = [...activeCombats, ...newMidTransitCombats];
      const clearedRegions = { ...regionsBeforeStep5 };
      newMidTransitCombats.forEach(combat => {
        // Only clear defender divisions if this is the first combat on this region
        const existingCombatsOnRegion = combatsBeforeStep5.filter(
          c => c.defenderRegionId === combat.defenderRegionId && !c.isComplete
        );
        if (existingCombatsOnRegion.length === 0) {
          const r = clearedRegions[combat.defenderRegionId];
          if (r) {
            clearedRegions[combat.defenderRegionId] = { ...r, divisions: [] };
          }
        }
      });
      regionsBeforeStep5 = clearedRegions;
    }

    // Step 5: Process active combats
    TickPerf.start('[tick] 5-combats');
    const { updatedCombats, finishedCombats, newCombatEvents, newCombatNotifications, retreatMovements } = processCombats(combatsBeforeStep5, newDate, regionsBeforeStep5, adjacency, regionCentroids);
    TickPerf.end('[tick] 5-combats');

    // Step 6: Apply completed movements to regions
    TickPerf.start('[tick] 6-apply-movements');
    let nextRegions: typeof regionsAfterEvents;
    const { nextCombats, nextEvents, nextNotifications, interceptedMovementIds, newHopMovements } = (() => {
      const result = applyCompletedMovements(
        completedMovements,
        updatedMovingUnits,
        {
          regions: regionsBeforeStep5,
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
    TickPerf.end('[tick] 6-apply-movements');

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
    TickPerf.start('[tick] 7-hp-regen');
    nextRegions = regenerateDivisionHP(nextRegions);
    TickPerf.end('[tick] 7-hp-regen');

    // Step 8: AI Tick - process AI actions and deployments for all AI countries
    TickPerf.start('[tick] 8-ai');
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
    TickPerf.end('[tick] 8-ai');

    // Step 9: Sync army group territories with actual division locations
    TickPerf.start('[tick] 9-army-group-sync');
    nextArmyGroups = syncArmyGroupTerritories(nextArmyGroups, nextRegions, nextMovingUnits);
    TickPerf.end('[tick] 9-army-group-sync');

    // Step 9b: Process army group automatic modes (advance/defend)
    // This needs to be done before updating state to ensure actions are queued
    const armyGroupActionsNeeded = nextArmyGroups.filter(g => g.mode !== 'none');
    
    // Update state first so actions have latest data
    TickPerf.start('[tick] 10-set-state');
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
    TickPerf.end('[tick] 10-set-state');

    // Now trigger automatic actions for ALL army groups in advance/defend mode (player + AI)
    // All patches are collected in-memory and merged into a single setState call at the end.
    TickPerf.start('[tick] 11-army-group-actions');
    const armyGroupPatches: Partial<GameStore>[] = [];

    // Snapshot of current state after step 10 — each pure function reads from this
    // and writes its patch into armyGroupPatches. We thread updated state through
    // so that later groups see the regions/movingUnits produced by earlier groups.
    let batchState = get();

    armyGroupActionsNeeded.forEach(group => {
      const collectPatch = (partial: Partial<GameStore>) => {
        armyGroupPatches.push(partial);
        // Keep batchState in sync so subsequent groups see already-committed moves
        batchState = { ...batchState, ...partial };
      };

      if (group.mode === 'advance') {
        attackArmyGroup(group.id, batchState, collectPatch);
      } else if (group.mode === 'defend') {
        defendArmyGroup(group.id, batchState, collectPatch);
      }
    });

    // Merge all patches into a single setState call — only commit fields that changed
    if (armyGroupPatches.length > 0) {
      // Build a merged patch from all keys touched by any individual patch
      const mergedPatch: Partial<GameStore> = {};
      for (const patch of armyGroupPatches) {
        Object.assign(mergedPatch, patch);
      }
      // The final values for each key live in batchState (threaded through above)
      const finalPatch: Partial<GameStore> = {};
      for (const key of Object.keys(mergedPatch) as (keyof GameStore)[]) {
        (finalPatch as Record<string, unknown>)[key] = batchState[key];
      }
      set(finalPatch);
    }
    TickPerf.end('[tick] 11-army-group-actions');
    
    // Step 11: Check and auto-complete missions
    TickPerf.start('[tick] 12-missions');
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
    TickPerf.end('[tick] 12-missions');
    
    // Step 12: Update theaters after regions change
    TickPerf.start('[tick] 13-theaters');
    get().detectAndUpdateTheaters();
    TickPerf.end('[tick] 13-theaters');
    TickPerf.end('[tick] total');
    TickPerf.logIfNeeded();
  },
});

import { GameStore } from './types';
import { StoreApi } from 'zustand';
import { ProductionQueueItem, CountryId } from '../../types/game';
import { detectTheatersForCountries, syncAIArmyGroupsToTheaters } from '../../utils/aiArmyGroupTheaters';
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
  checkAndClaimAIMissions,
  processProductionQueue,
  processScheduledEvents
} from './tickHelpers';
import { discoverNewAIStates, getEffectiveAIStates, processAITick } from './tickHelpers/aiTick';
import { attackArmyGroup } from './armyGroupAttack';
import { defendArmyGroup } from './armyGroupDefend';
import { TickPerf } from './tickPerformance';

export { discoverNewAIStates, getEffectiveAIStates } from './tickHelpers/aiTick';

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
    
    const playerProductions = completedProductions.filter(p => p.owner === selectedCountry?.id);
    const productionEvents = playerProductions.map(p => ({
      id: `event-${Date.now()}-${p.id}`,
      type: 'production_completed' as const,
      timestamp: dateTime,
      title: 'Production Complete',
      description: `${p.divisionName} has been produced and deployed.`,
      country: p.owner,
    }));
    const productionNotifications = playerProductions.map(p => ({
      id: `notif-${Date.now()}-${p.id}`,
      type: 'production_completed' as const,
      timestamp: dateTime,
      title: 'Production Complete',
      description: `${p.divisionName} has been produced and deployed.`,
      country: p.owner,
      expiresAt: new Date(dateTime.getTime() + 6 * 60 * 60 * 1000),
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
      updatedArmyGroups: armyGroupsAfterEvents,
      newEvents: scheduledEventEvents,
      newNotifications: scheduledEventNotifications
    } = processScheduledEvents(
      scheduledEvents,
      newDate,
      regionsAfterProduction,
      relationships,
      armyGroups
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

    // Step 4.5: Incorporate mid-transit combats
    TickPerf.start('[tick] 4.5-mid-transit-combats');
    let combatsBeforeStep5 = activeCombats;
    let regionsBeforeStep5 = regionsAfterEvents;
    if (newMidTransitCombats.length > 0) {
      combatsBeforeStep5 = [...activeCombats, ...newMidTransitCombats];
      const clearedRegions = { ...regionsBeforeStep5 };
      newMidTransitCombats.forEach(combat => {
        const existingCombatsOnRegion = activeCombats.filter(
          c => c.defenderRegionId === combat.defenderRegionId && !c.isComplete
        );
        if (existingCombatsOnRegion.length === 0) {
          const r = clearedRegions[combat.defenderRegionId];
          if (r) {
            const defenderIds = new Set(combat.defenderDivisions.map(d => d.id));
            clearedRegions[combat.defenderRegionId] = {
              ...r,
              divisions: r.divisions.filter(d => !defenderIds.has(d.id)),
            };
          }
        }
      });
      regionsBeforeStep5 = clearedRegions;
    }

    TickPerf.end('[tick] 4.5-mid-transit-combats');

    // Step 5: Process active combats
    TickPerf.start('[tick] 5-combats');
    const { updatedCombats, finishedCombats, newCombatEvents, newCombatNotifications, retreatMovements, retreatingDivisionUpdates } = processCombats(combatsBeforeStep5, newDate, regionsBeforeStep5, adjacency, regionCentroids);
    TickPerf.end('[tick] 5-combats');

    // Step 5.5: Apply retreating division HP updates
    TickPerf.start('[tick] 5.5-retreating-hp');
    if (retreatingDivisionUpdates.length > 0) {
      retreatingDivisionUpdates.forEach(({ regionId, division }) => {
        const region = regionsBeforeStep5[regionId];
        if (!region) return;
        regionsBeforeStep5 = {
          ...regionsBeforeStep5,
          [regionId]: {
            ...region,
            divisions: region.divisions.map(d => d.id === division.id ? division : d),
          },
        };
      });
    }

    TickPerf.end('[tick] 5.5-retreating-hp');

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
          countries,
          regionCentroids,
        },
        newDate
      );
      nextRegions = result.nextRegions;
      return result;
    })();

    // Step 6: Apply finished combats to regions
    nextRegions = applyFinishedCombats(finishedCombats, nextRegions, countries, relationshipsAfterEvents);
    TickPerf.end('[tick] 6-apply-movements');

    // Step 6b: Merge retreat, intercepted, and new-hop movements
    TickPerf.start('[tick] 6b-merge-movements');
    const finishedCombatIds = new Set(finishedCombats.map(c => c.id));
    let nextMovingUnits = [...remainingMovements, ...retreatMovements, ...newHopMovements].filter(m =>
      !interceptedMovementIds.includes(m.id) &&
      !(m.pendingCombatId && finishedCombatIds.has(m.pendingCombatId))
    );

    TickPerf.end('[tick] 6b-merge-movements');

    // Step 7: Regenerate HP for all stationary divisions
    TickPerf.start('[tick] 7-hp-regen');
    nextRegions = regenerateDivisionHP(nextRegions);
    TickPerf.end('[tick] 7-hp-regen');

    // Step 8: AI Tick - process AI actions and deployments for all AI countries
    TickPerf.start('[tick] 8-ai');
    const effectiveAIStates = getEffectiveAIStates(
      discoverNewAIStates(aiStates, nextRegions, selectedCountry?.id),
      selectedCountry?.id,
      state.isPlayerAIEnabled
    );
    const effectiveAICountryIds = effectiveAIStates.map(aiState => aiState.countryId);
    let nextAIStates = effectiveAIStates.filter(aiState => aiState.countryId !== selectedCountry?.id);
    let nextArmyGroups = armyGroupsAfterEvents;
    let nextProductionQueues: Record<CountryId, ProductionQueueItem[]> = { ...remainingProductions };
    const nextTheaters = detectTheatersForCountries({
      regions: nextRegions,
      adjacency,
      countryIds: Array.from(new Set([
        ...effectiveAICountryIds,
        ...(selectedCountry ? [selectedCountry.id] : []),
      ])),
      existingTheaters: state.theaters,
      relationships: relationshipsAfterEvents,
    });
    let nextActiveCombats = nextCombats;

    if (effectiveAICountryIds.length > 0) {
      const aiArmyGroupSync = syncAIArmyGroupsToTheaters({
        aiCountryIds: effectiveAICountryIds,
        theaters: nextTheaters,
        armyGroups: nextArmyGroups,
        regions: nextRegions,
        movingUnits: nextMovingUnits,
        activeCombats: nextActiveCombats,
        productionQueues: nextProductionQueues,
      });

      nextArmyGroups = aiArmyGroupSync.armyGroups;
      nextRegions = aiArmyGroupSync.regions;
      nextMovingUnits = aiArmyGroupSync.movingUnits;
      nextActiveCombats = aiArmyGroupSync.activeCombats;
      nextProductionQueues = aiArmyGroupSync.productionQueues;
    }

    if (effectiveAIStates.length > 0) {
      const aiResult = processAITick({
        effectiveAIStates,
        nextArmyGroups,
        nextProductionQueues,
        nextRegions,
        nextMovingUnits,
        nextActiveCombats,
        countryBonuses: state.countryBonuses,
        newDate,
        selectedCountryId: selectedCountry?.id,
      });
      nextAIStates = aiResult.nextAIStates;
      nextArmyGroups = aiResult.nextArmyGroups;
      nextProductionQueues = aiResult.nextProductionQueues;
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
      activeCombats: nextActiveCombats,
      regions: nextRegions,
      gameEvents: nextEvents,
      notifications: nextNotifications,
      aiStates: nextAIStates,
      armyGroups: nextArmyGroups,
      theaters: nextTheaters,
      productionQueues: nextProductionQueues,
      scheduledEvents: updatedScheduledEvents,
      relationships: relationshipsAfterEvents,
    });
    TickPerf.end('[tick] 10-set-state');

    TickPerf.start('[tick] 11-army-group-actions');
    const armyGroupPatches: Partial<GameStore>[] = [];
    let batchState = get();
    armyGroupActionsNeeded.forEach(group => {
      const collectPatch = (partial: Partial<GameStore>) => {
        armyGroupPatches.push(partial);
        batchState = { ...batchState, ...partial };
      };

      if (group.mode === 'advance') {
        attackArmyGroup(group.id, batchState, collectPatch);
      } else if (group.mode === 'defend') {
        defendArmyGroup(group.id, batchState, collectPatch);
      }
    });

    if (armyGroupPatches.length > 0) {
      const mergedPatch: Partial<GameStore> = {};
      for (const patch of armyGroupPatches) { Object.assign(mergedPatch, patch); }
      const finalPatch: Partial<GameStore> = {};
      for (const key of Object.keys(mergedPatch) as (keyof GameStore)[]) {
        (finalPatch as Record<string, unknown>)[key] = batchState[key];
      }
      set(finalPatch);
    }
    TickPerf.end('[tick] 11-army-group-actions');
    
    // Step 11: Check and auto-complete missions
    TickPerf.start('[tick] 12-missions');
    if (selectedCountry && !state.isPlayerAIEnabled) {
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

    // Include player country in AI mission processing when player AI mode is enabled
    const aiMissionCountryIds = effectiveAIStates
      .map(aiState => aiState.countryId)
      .filter(countryId => countryId !== selectedCountry?.id || state.isPlayerAIEnabled);
    if (aiMissionCountryIds.length > 0) {
      const aiMissionResults = checkAndClaimAIMissions(get(), aiMissionCountryIds);

      if (aiMissionResults.changed) {
        set({
          missions: aiMissionResults.updatedMissions,
          countryBonuses: aiMissionResults.countryBonuses,
          regions: aiMissionResults.regions,
          movingUnits: aiMissionResults.movingUnits,
          relationships: aiMissionResults.relationships,
          armyGroups: aiMissionResults.armyGroups,
          aiStates: aiMissionResults.aiStates,
          gameEvents: [...get().gameEvents, ...aiMissionResults.newEvents],
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

import { GAME_CONFIG } from '../../constants/gameConfig';
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
  processScheduledEvents,
  detectDivisionDuplicates,
  logDivisionDuplicates,
} from './tickHelpers';
import { getEffectiveAIStates, processAITick, hasOwnershipChangedForCountries, initializeAIStatesForNewCountries } from './tickHelpers/aiTick';
import { attackArmyGroup } from './armyGroupAttack';
import { defendArmyGroup } from './armyGroupDefend';
import { TickPerf } from './tickPerformance';
import { RegionState } from '../../types/game';
import { buildDivisionState } from '../../utils/divisionState';
import { createRegionOwnersPatch } from '../../utils/regionState';

export { getEffectiveAIStates } from './tickHelpers/aiTick';

let _tickCounter = 0;

/** Helper: check for duplicates mid-tick and log with a source label */
function _checkDuplicates(label: string, tickNum: number, regions: RegionState, movingUnits: import('../../types/game').Movement[], activeCombats: import('../../types/game').ActiveCombat[]) {
  const result = detectDivisionDuplicates(regions, movingUnits, activeCombats);
  if (result.hasDuplicates) {
    logDivisionDuplicates(result.reports, tickNum);
    console.error(`  [DUPLICATE] introduced during: ${label}`);
  }
}

export const createTickActions = (
  set: StoreApi<GameStore>['setState'],
  get: StoreApi<GameStore>['getState']
) => ({
  tick: () => {
    const state = get();
    if (!state.isPlaying) return;

    _tickCounter++;
    const tickNum = _tickCounter;

    TickPerf.tickStart();
    TickPerf.start('[tick] total');

    // ── Duplicate detection (start of tick) ──────────────────────────────────
    TickPerf.start('[tick] 0-duplicates');
    const preCheck = detectDivisionDuplicates(state.regions, state.movingUnits, state.activeCombats);
    if (preCheck.hasDuplicates) {
      logDivisionDuplicates(preCheck.reports, tickNum);
      console.error('  [DUPLICATE] detected at TICK START — leftovers from previous tick');
    }
    TickPerf.end('[tick] 0-duplicates');
    // ─────────────────────────────────────────────────────────────────────────

    const { dateTime, selectedCountry, regions, adjacency, movingUnits, activeCombats, aiStates, gameEvents, notifications, armyGroups, productionQueues, relationships, regionCentroids, scheduledEvents, divisions } = state;
    
    // Step 1: Validate divisions (development mode only)
    TickPerf.start('[tick] 1-validate');
    const { updatedRegions, updatedMovingUnits, updatedDivisions: divisionsAfterValidation } = validateDivisions(regions, movingUnits, armyGroups, divisions);
    TickPerf.end('[tick] 1-validate');

    // Step 2: Process production queue
    TickPerf.start('[tick] 2-production');
    const { remainingProductions, updatedDivisions: divisionsAfterProduction, completedProductions } = processProductionQueue(
      productionQueues,
      dateTime,
      updatedRegions,
      state.countryBonuses,
      armyGroups,
      divisionsAfterValidation
    );
    const regionsAfterProduction = updatedRegions;
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
      expiresAt: new Date(dateTime.getTime() + GAME_CONFIG.NOTIFICATION.DURATION_HOURS * 60 * 60 * 1000),
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
      updatedDivisions: divisionsAfterEvents,
      newEvents: scheduledEventEvents,
      newNotifications: scheduledEventNotifications
    } = processScheduledEvents(
      scheduledEvents,
      newDate,
      regionsAfterProduction,
      relationships,
      armyGroups,
      divisionsAfterProduction
    );
    TickPerf.end('[tick] 3-scheduled-events');

    // Initialize AI states for any new countries that appeared via scheduled events
    const aiStatesAfterEvents = initializeAIStatesForNewCountries(aiStates, regionsAfterEvents, selectedCountry?.id);

    // Step 4: Process unit movements
    TickPerf.start('[tick] 4-movements');
    const { remainingMovements, completedMovements, newMidTransitCombats } = processMovements(
      updatedMovingUnits,
      newDate,
      activeCombats,
      regionsAfterEvents,
      relationshipsAfterEvents,
      divisionsAfterEvents
    );
    TickPerf.end('[tick] 4-movements');

    // Step 4.5: Incorporate mid-transit combats
    TickPerf.start('[tick] 4.5-mid-transit-combats');
    let combatsBeforeStep5 = activeCombats;
    const regionsBeforeStep5 = regionsAfterEvents;
    let divisionsBeforeStep5 = divisionsAfterEvents;
    if (newMidTransitCombats.length > 0) {
      combatsBeforeStep5 = [...activeCombats, ...newMidTransitCombats];
      // Clear defender divisions from DivisionState (regionId = null) for new mid-transit combats
      newMidTransitCombats.forEach(combat => {
        const existingCombatsOnRegion = activeCombats.filter(
          c => c.defenderRegionId === combat.defenderRegionId && !c.isComplete
        );
        if (existingCombatsOnRegion.length === 0) {
          const defenderIds = new Set(combat.defenderDivisions.map(d => d.id));
          for (const [id, div] of Object.entries(divisionsBeforeStep5)) {
            if (defenderIds.has(id)) {
              divisionsBeforeStep5 = { ...divisionsBeforeStep5, [id]: { ...div, regionId: null } };
            }
          }
        }
      });
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
        divisionsBeforeStep5 = { ...divisionsBeforeStep5, [division.id]: { ...division, regionId } };
      });
    }

    TickPerf.end('[tick] 5.5-retreating-hp');

    // Step 6: Apply completed movements to regions
    TickPerf.start('[tick] 6-apply-movements');
    let nextRegions: typeof regionsAfterEvents;
    let nextDivisions = divisionsBeforeStep5;
    const { nextCombats, nextEvents, nextNotifications, interceptedMovementIds, newHopMovements } = (() => {
      const result = applyCompletedMovements(
        completedMovements,
        updatedMovingUnits,
        {
          regions: regionsBeforeStep5,
          divisions: divisionsBeforeStep5,
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
      nextDivisions = result.nextDivisions;
      return result;
    })();

    // Step 6: Apply finished combats to regions
    const combatResult = applyFinishedCombats(finishedCombats, nextRegions, nextDivisions, countries, relationshipsAfterEvents);
    nextRegions = combatResult.nextRegions;
    nextDivisions = combatResult.nextDivisions;
    TickPerf.end('[tick] 6-apply-movements');

    // Step 6b: Merge retreat, intercepted, and new-hop movements
    TickPerf.start('[tick] 6b-merge-movements');
    const finishedCombatIds = new Set(finishedCombats.map(c => c.id));
    let nextMovingUnits = [...remainingMovements, ...retreatMovements, ...newHopMovements].filter(m =>
      !interceptedMovementIds.includes(m.id) &&
      !(m.pendingCombatId && finishedCombatIds.has(m.pendingCombatId))
    );

    TickPerf.end('[tick] 6b-merge-movements');

    // ── Duplicate detection after movements/combats ──────────────────────────
    _checkDuplicates('apply movements / combats', tickNum, nextRegions, nextMovingUnits, nextCombats);
    // ─────────────────────────────────────────────────────────────────────────

    // Step 7: Regenerate HP for all stationary divisions
    TickPerf.start('[tick] 7-hp-regen');
    nextDivisions = regenerateDivisionHP(nextDivisions, nextMovingUnits);
    TickPerf.end('[tick] 7-hp-regen');

    // Step 8: AI Tick - process AI actions and deployments for all AI countries
    TickPerf.start('[tick] 8-ai');
    const effectiveAIStates = getEffectiveAIStates(
      aiStatesAfterEvents,
      selectedCountry?.id,
      state.isPlayerAIEnabled
    );
    const effectiveAICountryIds = effectiveAIStates.map(aiState => aiState.countryId);
    let nextAIStates = effectiveAIStates.filter(aiState => aiState.countryId !== selectedCountry?.id);
    let nextArmyGroups = armyGroupsAfterEvents;
    let nextProductionQueues: Record<CountryId, ProductionQueueItem[]> = { ...remainingProductions };
    let nextActiveCombats = nextCombats;

    const prevAIStateIds = new Set(aiStatesAfterEvents.map(s => s.countryId));
    const hasNewAICountries = effectiveAICountryIds.some(id => !prevAIStateIds.has(id));
    const theaterCountryIds = new Set([
      ...effectiveAICountryIds,
      ...(selectedCountry ? [selectedCountry.id] : []),
    ]);
    const theaterInputsChanged =
      hasNewAICountries ||
      relationshipsAfterEvents !== state.relationships ||
      hasOwnershipChangedForCountries(theaterCountryIds, regions, nextRegions);

    const nextTheaters = theaterInputsChanged
      ? detectTheatersForCountries({
          regions: nextRegions,
          adjacency,
          countryIds: Array.from(theaterCountryIds),
          existingTheaters: state.theaters,
          relationships: relationshipsAfterEvents,
        })
      : state.theaters;

    if (effectiveAICountryIds.length > 0 && theaterInputsChanged) {
      const aiArmyGroupSync = syncAIArmyGroupsToTheaters({
        aiCountryIds: effectiveAICountryIds,
        theaters: nextTheaters,
        armyGroups: nextArmyGroups,
        regions: nextRegions,
        divisions: nextDivisions,
        movingUnits: nextMovingUnits,
        activeCombats: nextActiveCombats,
        productionQueues: nextProductionQueues,
      });

      nextArmyGroups = aiArmyGroupSync.armyGroups;
      nextRegions = aiArmyGroupSync.regions;
      nextDivisions = aiArmyGroupSync.divisions;
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
        nextDivisions,
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

    // ── Duplicate detection after AI tick / army group sync ──────────────────
    _checkDuplicates('AI tick / army group sync', tickNum, nextRegions, nextMovingUnits, nextActiveCombats);
    // ─────────────────────────────────────────────────────────────────────────

    // Step 9: Sync army group territories with actual division locations
    TickPerf.start('[tick] 9-army-group-sync');
    nextArmyGroups = syncArmyGroupTerritories(nextArmyGroups, nextRegions, nextMovingUnits, nextDivisions);
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
      ...createRegionOwnersPatch(nextRegions),
      divisions: buildDivisionState(nextMovingUnits, nextActiveCombats, nextDivisions),
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
        const patch = partial.regions
          ? { ...partial, ...createRegionOwnersPatch(partial.regions) }
          : partial;
        armyGroupPatches.push(patch);
        batchState = { ...batchState, ...patch };
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
      const syncedState = get();
      set({ divisions: buildDivisionState(syncedState.movingUnits, syncedState.activeCombats, syncedState.divisions) });
    }
    TickPerf.end('[tick] 11-army-group-actions');

    // ── Duplicate detection after army group actions ────────────────────────
    const agState = get();
    _checkDuplicates('army group actions', tickNum, agState.regions, agState.movingUnits, agState.activeCombats);
    // ────────────────────────────────────────────────────────────────────────

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
          ...createRegionOwnersPatch(aiMissionResults.regions),
          divisions: buildDivisionState(aiMissionResults.movingUnits, get().activeCombats, aiMissionResults.divisions),
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

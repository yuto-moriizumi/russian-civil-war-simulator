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
import { buildRegionUpdate, extractRegionOwners } from '../../utils/regionState';

export { getEffectiveAIStates } from './tickHelpers/aiTick';

let _tickCounter = 0;

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

    TickPerf.start('[tick] 0-duplicates');
    const preCheck = detectDivisionDuplicates(state.regions, state.movingUnits, state.activeCombats);
    if (preCheck.hasDuplicates) {
      logDivisionDuplicates(preCheck.reports, tickNum);
      console.error('  [DUPLICATE] detected at TICK START — leftovers from previous tick');
    }
    TickPerf.end('[tick] 0-duplicates');

    const { dateTime, selectedCountry, regions, regionDefinitions, adjacency, movingUnits, activeCombats, aiStates, gameEvents, notifications, armyGroups, productionQueues, relationships, regionCentroids, scheduledEvents, divisions } = state;

    TickPerf.start('[tick] 1-validate');
    const { updatedRegions, updatedMovingUnits, updatedDivisions: divisionsAfterValidation } = validateDivisions(regions, movingUnits, armyGroups, divisions);
    TickPerf.end('[tick] 1-validate');

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

    const newDate = new Date(dateTime);
    newDate.setHours(newDate.getHours() + 1);

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

    const aiStatesAfterEvents = initializeAIStatesForNewCountries(aiStates, regionsAfterEvents, selectedCountry?.id);

    TickPerf.start('[tick] 4-movements');
    const { remainingMovements, completedMovements, newMidTransitCombats, updatedDivisions: divisionsAfterMovements } = processMovements(
      updatedMovingUnits,
      newDate,
      activeCombats,
      regionsAfterEvents,
      relationshipsAfterEvents,
      divisionsAfterEvents
    );
    TickPerf.end('[tick] 4-movements');

    TickPerf.start('[tick] 4.5-mid-transit-combats');
    let combatsBeforeStep5 = activeCombats;
    const divisionsBeforeStep5 = divisionsAfterMovements;
    if (newMidTransitCombats.length > 0) {
      combatsBeforeStep5 = [...activeCombats, ...newMidTransitCombats];
      // Defender divisions were already set to regionId=null in processMovements
    }
    TickPerf.end('[tick] 4.5-mid-transit-combats');

    TickPerf.start('[tick] 5-combats');
    const { updatedCombats, finishedCombats, newCombatEvents, newCombatNotifications, retreatMovements, updatedDivisions: divisionsAfterCombats } = processCombats(
      combatsBeforeStep5, newDate, regionsAfterEvents, adjacency, regionCentroids, divisionsBeforeStep5
    );
    TickPerf.end('[tick] 5-combats');

    TickPerf.start('[tick] 6-apply-movements');
    let nextRegions: typeof regionsAfterEvents;
    let nextDivisions = divisionsAfterCombats;
    const { nextCombats, nextEvents, nextNotifications, interceptedMovementIds, newHopMovements } = (() => {
      const result = applyCompletedMovements(
        completedMovements,
        updatedMovingUnits,
        {
          regions: regionsAfterEvents,
          divisions: divisionsAfterCombats,
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

    const combatResult = applyFinishedCombats(finishedCombats, nextRegions, nextDivisions, countries, relationshipsAfterEvents);
    nextRegions = combatResult.nextRegions;
    nextDivisions = combatResult.nextDivisions;
    TickPerf.end('[tick] 6-apply-movements');

    TickPerf.start('[tick] 6b-merge-movements');
    const finishedCombatIds = new Set(finishedCombats.map(c => c.id));
    let nextMovingUnits = [...remainingMovements, ...retreatMovements, ...newHopMovements].filter(m =>
      !interceptedMovementIds.includes(m.id) &&
      !(m.pendingCombatId && finishedCombatIds.has(m.pendingCombatId))
    );
    TickPerf.end('[tick] 6b-merge-movements');

    _checkDuplicates('apply movements / combats', tickNum, nextRegions, nextMovingUnits, nextCombats);

    TickPerf.start('[tick] 7-hp-regen');
    nextDivisions = regenerateDivisionHP(nextDivisions);
    TickPerf.end('[tick] 7-hp-regen');

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

    _checkDuplicates('AI tick / army group sync', tickNum, nextRegions, nextMovingUnits, nextActiveCombats);

    TickPerf.start('[tick] 9-army-group-sync');
    nextArmyGroups = syncArmyGroupTerritories(nextArmyGroups, nextRegions, nextMovingUnits, nextDivisions);
    TickPerf.end('[tick] 9-army-group-sync');

    const armyGroupActionsNeeded = nextArmyGroups.filter(g => g.mode !== 'none');

    TickPerf.start('[tick] 10-set-state');
    set({
      dateTime: newDate,
      movingUnits: nextMovingUnits,
      activeCombats: nextActiveCombats,
      ...buildRegionUpdate(regionDefinitions, extractRegionOwners(nextRegions)),
      divisions: nextDivisions,
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
          ? { ...partial, ...buildRegionUpdate(regionDefinitions, extractRegionOwners(partial.regions)) }
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
    }
    TickPerf.end('[tick] 11-army-group-actions');

    _checkDuplicates('army group actions', tickNum, get().regions, get().movingUnits, get().activeCombats);

    TickPerf.start('[tick] 12-missions');
    if (selectedCountry && !state.isPlayerAIEnabled) {
      const missionResults = checkAndCompleteMissions(get, selectedCountry);

      if (missionResults.updatedMissions.some((m, i) => m.completed !== get().missions[i].completed)) {
        set({
          missions: missionResults.updatedMissions,
          gameEvents: [...get().gameEvents, ...missionResults.newEvents],
          notifications: [...get().notifications, ...missionResults.newNotifications],
        });
      }
    }

    const aiMissionCountryIds = effectiveAIStates
      .map(aiState => aiState.countryId)
      .filter(countryId => countryId !== selectedCountry?.id || state.isPlayerAIEnabled);
    if (aiMissionCountryIds.length > 0) {
      const aiMissionResults = checkAndClaimAIMissions(get(), aiMissionCountryIds);

      if (aiMissionResults.changed) {
        set({
          missions: aiMissionResults.updatedMissions,
          countryBonuses: aiMissionResults.countryBonuses,
          ...buildRegionUpdate(regionDefinitions, extractRegionOwners(aiMissionResults.regions)),
          divisions: aiMissionResults.divisions,
          movingUnits: aiMissionResults.movingUnits,
          relationships: aiMissionResults.relationships,
          armyGroups: aiMissionResults.armyGroups,
          aiStates: aiMissionResults.aiStates,
          gameEvents: [...get().gameEvents, ...aiMissionResults.newEvents],
        });
      }
    }
    TickPerf.end('[tick] 12-missions');

    TickPerf.start('[tick] 13-theaters');
    get().detectAndUpdateTheaters();
    TickPerf.end('[tick] 13-theaters');
    TickPerf.end('[tick] total');
    TickPerf.logIfNeeded();
  },
});

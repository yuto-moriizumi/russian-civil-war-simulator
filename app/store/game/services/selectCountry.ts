import {
  ArmyGroup,
  Country,
  DivisionState,
  RegionState,
} from '../../../types/game';
import { initialGameState } from '../initialState';
import { initialUnitPlacement, initialArmyGroupDefs } from '../../../data/map/initialUnitPlacement';
import { createDivision } from '../../../utils/combat';
import { getDivisionPrefix } from '../../../data/countries';
import { createInitialAIState, createInitialAIArmyGroup } from '../../../ai/cpuPlayer';
import { mergeMissionsWithInitial } from '../basicActions';
import { buildRegionUpdate, extractRegionOwners } from '../../../utils/regionState';
import type { GameStore } from '../types';

export function buildSelectCountryPatch(
  currentState: GameStore,
  country: Country,
  isInitial: boolean,
  aiCountries: import('../../../types/game').CountryId[]
) {
  const playerArmyGroupMode = currentState.isPlayerAIEnabled ? 'advance' : 'none';
  const aiStates = aiCountries.map(countryId => createInitialAIState(countryId));

  let placementArmyGroups: ArmyGroup[] = currentState.placementArmyGroups ?? [];
  let regionsForState = currentState.regions;
  let divisionsForState = currentState.divisions;
  let armyGroupsForState = currentState.armyGroups;

  if (isInitial) {
    const placementGroupsByCountry: Record<string, Record<string, ArmyGroup>> = {};

    for (const [countryId, defs] of Object.entries(initialArmyGroupDefs)) {
      if (!defs || defs.length === 0) continue;
      placementGroupsByCountry[countryId] = {};
      for (const def of defs) {
        const groupId = `placement-${countryId}-${def.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        placementGroupsByCountry[countryId][def.name] = {
          id: groupId,
          name: def.name,
          regionIds: [],
          color: def.color,
          owner: countryId as import('../../../types/game').CountryId,
          theaterId: null,
          mode: country.id === countryId ? playerArmyGroupMode : 'advance',
        };
      }
    }

    const regionsWithUnits: RegionState = {};
    for (const [regionId, region] of Object.entries(currentState.regions)) {
      regionsWithUnits[regionId] = { ...region };
    }

    const divCounters: Record<string, number> = {};
    const initialDivisions: DivisionState = {};

    for (const [regionId, entries] of Object.entries(initialUnitPlacement)) {
      if (!regionsWithUnits[regionId]) continue;
      for (const entry of entries) {
        const { owner, armyGroupName, count } = entry;
        const countryGroups = placementGroupsByCountry[owner];
        let armyGroup = countryGroups?.[armyGroupName];

        if (!armyGroup) {
          if (!placementGroupsByCountry[owner]) placementGroupsByCountry[owner] = {};
          const groupId = `placement-${owner}-${armyGroupName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          armyGroup = {
            id: groupId,
            name: armyGroupName,
            regionIds: [],
            color: '#6B7280',
            owner: owner as import('../../../types/game').CountryId,
            theaterId: null,
            mode: country.id === owner ? playerArmyGroupMode : 'advance',
          };
          placementGroupsByCountry[owner][armyGroupName] = armyGroup;
        }

        if (!armyGroup.regionIds.includes(regionId)) {
          armyGroup.regionIds.push(regionId);
        }

        const initialBonuses = currentState.countryBonuses?.[owner as import('../../../types/game').CountryId] ??
          { attackBonus: 0, defenceBonus: 0, hpBonus: 0, commandPowerBonus: 0, productionSpeedMultiplier: 1 };
        const prefix = getDivisionPrefix(owner as import('../../../types/game').CountryId);
        for (let i = 0; i < count; i++) {
          divCounters[owner] = (divCounters[owner] ?? 0) + 1;
          const n = divCounters[owner];
          const suffix = n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
          const name = `${suffix} ${prefix}`;
          const division = createDivision(owner as import('../../../types/game').CountryId, name, armyGroup.id, initialBonuses);
          initialDivisions[division.id] = { ...division, regionId };
        }
      }
    }

    placementArmyGroups = Object.values(placementGroupsByCountry)
      .flatMap(groupMap => Object.values(groupMap));

    const countriesWithPlacement = new Set(Object.keys(placementGroupsByCountry));
    const allCountries = [country.id, ...aiCountries];
    const autoGroups = allCountries
      .filter(countryId => !countriesWithPlacement.has(countryId))
      .map(countryId => {
        const g = createInitialAIArmyGroup(countryId, regionsWithUnits);
        if (countryId === country.id) g.mode = playerArmyGroupMode;
        return g;
      });

    regionsForState = regionsWithUnits;
    divisionsForState = initialDivisions;
    armyGroupsForState = [...autoGroups, ...placementArmyGroups];
  } else {
    const allCountries = [country.id, ...aiCountries];
    const countriesWithGroups = new Set(currentState.armyGroups.map((g: ArmyGroup) => g.owner));
    const missingGroups = allCountries
      .filter(countryId => !countriesWithGroups.has(countryId))
      .map(countryId => {
        const g = createInitialAIArmyGroup(countryId, currentState.regions);
        if (countryId === country.id) g.mode = playerArmyGroupMode;
        return g;
      });
    armyGroupsForState = [...currentState.armyGroups, ...missingGroups];
    divisionsForState = currentState.divisions;
  }

  return {
    ...initialGameState,
    selectedCountry: country,
    currentScreen: 'main' as const,
    missions: mergeMissionsWithInitial(currentState.missions),
    aiStates,
    armyGroups: armyGroupsForState,
    placementArmyGroups,
    ...buildRegionUpdate(currentState.regionDefinitions, extractRegionOwners(regionsForState)),
    regionDefinitions: currentState.regionDefinitions,
    divisions: divisionsForState,
    adjacency: currentState.adjacency,
    mapDataLoaded: currentState.mapDataLoaded,
    regionCentroids: currentState.regionCentroids,
    borderMidpoints: currentState.borderMidpoints,
    productionQueues: currentState.productionQueues,
    dateTime: currentState.dateTime,
    isPlaying: currentState.isPlaying,
    gameSpeed: currentState.gameSpeed,
    gameEvents: currentState.gameEvents,
    notifications: currentState.notifications,
    activeCombats: currentState.activeCombats,
    movingUnits: currentState.movingUnits,
    countryBonuses: currentState.countryBonuses,
    relationships: currentState.relationships,
    scheduledEvents: currentState.scheduledEvents,
    theaters: currentState.theaters,
    isPlayerAIEnabled: currentState.isPlayerAIEnabled,
  };
}

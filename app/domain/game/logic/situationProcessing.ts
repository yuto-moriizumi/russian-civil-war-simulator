import { Situation, ScheduledEventCondition, ScheduledEventAction, Relationship, CountryId } from '../../../types/game';
import { RegionState } from '../../../types/game';
import { EngineSimulationState } from '../engine/types';
import { getCountryAndPuppets } from '../relationshipUtils';
import { applyRelationshipChange, declareWarBetweenCoalitions, joinPuppetToOverlordWars } from '../relationshipUtils';
import { COUNTRY_METADATA } from '../../../data/countryMetadata';
import { createGameEvent, createNotification } from '../eventUtils';

function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateWarScore(
  situation: Situation,
  regions: RegionState,
  relationships: Relationship[]
): number {
  if (situation.contestedRegions.length === 0) return 50;

  const controlledCountries = getCountryAndPuppets(situation.scoreCountry, relationships);
  let controlled = 0;
  for (const regionId of situation.contestedRegions) {
    const region = regions[regionId];
    if (region && controlledCountries.includes(region.owner)) {
      controlled++;
    }
  }
  return Math.round((controlled / situation.contestedRegions.length) * 100);
}

function evaluateActivationConditions(
  conditions: ScheduledEventCondition[],
  currentDateString: string,
  regions: RegionState,
  relationships: Relationship[],
  scheduledEvents: EngineSimulationState['scheduledEvents']
): boolean {
  return conditions.every(condition => {
    if (condition.type === 'eventTriggered') {
      return scheduledEvents.some(e => e.id === condition.eventId && e.triggered);
    }
    if (condition.type === 'date') {
      return currentDateString >= condition.date;
    }
    if (condition.type === 'atLeastOneRegionOwnedByOrPuppetOf') {
      return condition.regions!.some(regionId => {
        const region = regions[regionId];
        if (!region) return false;
        if (region.owner === condition.country) return true;
        return relationships.some(r =>
          r.fromCountry === condition.country &&
          r.toCountry === region.owner &&
          r.type === 'autonomy'
        );
      });
    }
    return true;
  });
}

function applyActions(
  actions: ScheduledEventAction[],
  state: EngineSimulationState
): Pick<EngineSimulationState, 'regions' | 'relationships' | 'armyGroups' | 'divisions'> {
  let { regions, relationships, armyGroups, divisions } = state;

  for (const action of actions) {
    if (action.type === 'removeRelationship' && action.fromCountry && action.toCountry) {
      relationships = relationships.filter(r => !(
        r.fromCountry === action.fromCountry &&
        r.toCountry === action.toCountry &&
        (!action.relationshipType || r.type === action.relationshipType)
      ));
    } else if (action.type === 'endWarWithCountryAndPuppets' && action.masterCountry && action.enemyCountry) {
      const belligerents = getCountryAndPuppets(action.masterCountry, relationships);
      relationships = relationships.filter(r => !(
        r.type === 'war' &&
        (
          (belligerents.includes(r.fromCountry) && r.toCountry === action.enemyCountry) ||
          (r.fromCountry === action.enemyCountry && belligerents.includes(r.toCountry))
        )
      ));
    } else if (action.type === 'setRelationship' && action.fromCountry && action.toCountry && action.relationshipType) {
      relationships = applyRelationshipChange(relationships, action.fromCountry, action.toCountry, action.relationshipType);
      if (action.relationshipType === 'autonomy') {
        relationships = joinPuppetToOverlordWars(relationships, action.fromCountry, action.toCountry).updatedRelationships;
      }
    } else if (action.type === 'declareWar' && action.fromCountry && action.toCountry) {
      relationships = declareWarBetweenCoalitions(relationships, action.fromCountry, action.toCountry).updatedRelationships;
    } else if (action.type === 'transferRegion' && action.regionId && action.newOwner) {
      const region = regions[action.regionId];
      if (region) {
        regions = { ...regions, [action.regionId]: { ...region, owner: action.newOwner } };
      }
    } else if (action.type === 'transferCoreRegionsFromCountry' && action.newOwner && action.fromCountry) {
      const countryData = COUNTRY_METADATA[action.newOwner];
      if (countryData?.coreRegions) {
        for (const regionId of countryData.coreRegions) {
          const region = regions[regionId];
          if (region && region.owner === action.fromCountry) {
            regions = { ...regions, [regionId]: { ...region, owner: action.newOwner } };
          }
        }
      }
    }
  }

  return { regions, relationships, armyGroups, divisions };
}

export function processSituations(
  state: EngineSimulationState,
  currentDate: Date
): Partial<EngineSimulationState> {
  const currentDateString = formatDateToYYYYMMDD(currentDate);
  let { regions, relationships, armyGroups, divisions } = state;
  let situations = state.situations ?? [];
  const newGameEvents = [...state.gameEvents];
  const newNotifications = [...state.notifications];

  situations = situations.map(situation => {
    if (situation.resolved) return situation;

    if (!situation.active) {
      const shouldActivate = evaluateActivationConditions(
        situation.activationConditions,
        currentDateString,
        regions,
        relationships,
        state.scheduledEvents
      );
      if (!shouldActivate) return situation;
      return { ...situation, active: true };
    }

    const warScore = calculateWarScore(situation, regions, relationships);
    const updated = { ...situation, warScore };

    if (warScore >= situation.highBranch.threshold) {
      const applied = applyActions(situation.highBranch.actions, { ...state, regions, relationships, armyGroups, divisions });
      regions = applied.regions;
      relationships = applied.relationships;
      armyGroups = applied.armyGroups;
      divisions = applied.divisions;

      const event = createGameEvent('war_declared', situation.title, situation.highBranch.label, currentDate);
      newGameEvents.push(event);
      newNotifications.push(createNotification(event, currentDate));

      return { ...updated, resolved: true };
    }

    if (warScore <= situation.lowBranch.threshold) {
      const applied = applyActions(situation.lowBranch.actions, { ...state, regions, relationships, armyGroups, divisions });
      regions = applied.regions;
      relationships = applied.relationships;
      armyGroups = applied.armyGroups;
      divisions = applied.divisions;

      const event = createGameEvent('war_declared', situation.title, situation.lowBranch.label, currentDate);
      newGameEvents.push(event);
      newNotifications.push(createNotification(event, currentDate));

      return { ...updated, resolved: true };
    }

    return updated;
  });

  return {
    situations,
    regions,
    relationships,
    armyGroups,
    divisions,
    gameEvents: newGameEvents,
    notifications: newNotifications,
  };
}

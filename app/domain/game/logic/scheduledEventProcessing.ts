import { Region, GameEvent, NotificationItem, CountryId, Relationship, ScheduledEvent, ScheduledEventAction, ScheduledEventCondition, ArmyGroup, Division, DivisionState } from '../../../types/game';
import { createGameEvent, createNotification } from '../eventUtils';
import { BASE_DIVISION_STATS } from '../bonusCalculator';
import { applyRelationshipChange, declareWarBetweenCoalitions, getCountryAndPuppets as getCoalitionCountries, joinPuppetToOverlordWars } from '../relationshipUtils';
import { COUNTRY_METADATA } from '../../../data/countryMetadata';

/**
 * Process scheduled events that should trigger on the current date
 * Returns updated regions, events, notifications, relationships, army groups, and updated scheduled events
 */
export function processScheduledEvents(
  scheduledEvents: ScheduledEvent[],
  currentDate: Date,
  regions: Record<string, Region>,
  relationships: Relationship[],
  armyGroups: ArmyGroup[],
  divisions: DivisionState = {}
): {
  updatedScheduledEvents: ScheduledEvent[];
  updatedRegions: Record<string, Region>;
  updatedRelationships: Relationship[];
  updatedArmyGroups: ArmyGroup[];
  updatedDivisions: DivisionState;
  newEvents: GameEvent[];
  newNotifications: NotificationItem[];
} {
  const dateString = formatDateToYYYYMMDD(currentDate);

  const updatedRegions = { ...regions };
  let updatedRelationships = [...relationships];
  let updatedArmyGroups = [...armyGroups];
  let updatedDivisions = { ...divisions };
  const newEvents: GameEvent[] = [];
  const newNotifications: NotificationItem[] = [];

  // Find events that should trigger today
  const updatedScheduledEvents = scheduledEvents.map(event => {
    if (event.triggered) return event;

    // Events with conditions trigger on first date >= event.date where all conditions pass
    // Events without conditions trigger exactly on event.date
    const dateMatches = event.conditions
      ? dateString >= event.date
      : event.date === dateString;

    if (!dateMatches) return event;

    if (event.conditions && !checkConditions(event.conditions, updatedRegions, relationships)) {
      return event;
    }

    // Process each action in the event
    event.actions.forEach((action: ScheduledEventAction) => {
      if (action.type === 'transferRegion' && action.regionId && action.newOwner) {
        const region = updatedRegions[action.regionId];
        if (region) {
          updatedRegions[action.regionId] = { ...region, owner: action.newOwner };
        }
      } else if (action.type === 'transferRegionIfOwnedByOrPuppetOf' && action.regionId && action.newOwner && action.overlordCountry) {
        const region = updatedRegions[action.regionId];
        if (region && isOwnedByOrPuppetOf(region.owner, action.overlordCountry, relationships)) {
          updatedRegions[action.regionId] = { ...region, owner: action.newOwner };
        }
      } else if (action.type === 'declareWar' && action.fromCountry && action.toCountry) {
        updatedRelationships = applyWarDeclaration(
          updatedRelationships,
          action.fromCountry,
          action.toCountry
        );
      } else if (action.type === 'setRelationship' && action.fromCountry && action.toCountry && action.relationshipType) {
        updatedRelationships = applyRelationshipChange(
          updatedRelationships,
          action.fromCountry,
          action.toCountry,
          action.relationshipType
        );
        if (action.relationshipType === 'autonomy') {
          updatedRelationships = joinPuppetToOverlordWars(
            updatedRelationships,
            action.fromCountry,
            action.toCountry
          ).updatedRelationships;
        }
      } else if (action.type === 'removeRelationship' && action.fromCountry && action.toCountry) {
        updatedRelationships = removeRelationship(
          updatedRelationships,
          action.fromCountry,
          action.toCountry,
          action.relationshipType
        );
      } else if (action.type === 'endWarWithCountryAndPuppets' && action.masterCountry && action.enemyCountry) {
        updatedRelationships = endWarWithCountryAndPuppets(
          updatedRelationships,
          action.masterCountry,
          action.enemyCountry
        );
      } else if (action.type === 'spawnDivision' && action.owner && action.regionId) {
        const groupName = action.armyGroupName ?? `${action.owner} Army`;
        let armyGroup = updatedArmyGroups.find(g => g.owner === action.owner && g.name === groupName);
        if (!armyGroup) {
          armyGroup = {
            id: `${action.owner}-ag-spawned`,
            name: groupName,
            regionIds: [action.regionId],
            color: '#CE1126',
            owner: action.owner,
            theaterId: null,
            mode: 'none',
          };
          updatedArmyGroups = [...updatedArmyGroups, armyGroup];
        }
        const division: Division = {
          id: `${action.owner}-spawned-${dateString}`,
          name: `1st ${groupName}`,
          owner: action.owner,
          armyGroupId: armyGroup.id,
          hp: BASE_DIVISION_STATS.hp,
          maxHp: BASE_DIVISION_STATS.maxHp,
          attack: BASE_DIVISION_STATS.attack,
          defence: BASE_DIVISION_STATS.defence,
          regionId: action.regionId,
        };
        if (updatedRegions[action.regionId]) {
          updatedDivisions = { ...updatedDivisions, [division.id]: division };
        }
      } else if (action.type === 'transferCoreRegionsFromCountry' && action.newOwner && action.fromCountry) {
        const countryData = COUNTRY_METADATA[action.newOwner];
        if (countryData?.coreRegions) {
          for (const regionId of countryData.coreRegions) {
            const region = updatedRegions[regionId];
            if (region && region.owner === action.fromCountry) {
              updatedRegions[regionId] = { ...region, owner: action.newOwner };
            }
          }
        }
      }
    });

    // Create event and notification for this scheduled event
    const gameEvent = createGameEvent(
      'war_declared',
      event.title,
      event.description,
      currentDate
    );
    newEvents.push(gameEvent);
    newNotifications.push(createNotification(gameEvent, currentDate));

    // Mark event as triggered
    return { ...event, triggered: true };
  });

  return {
    updatedScheduledEvents,
    updatedRegions,
    updatedRelationships,
    updatedArmyGroups,
    updatedDivisions,
    newEvents,
    newNotifications,
  };
}

function isOwnedByOrPuppetOf(owner: CountryId, overlord: CountryId, relationships: Relationship[]): boolean {
  if (owner === overlord) return true;
  return relationships.some(r => r.fromCountry === overlord && r.toCountry === owner && r.type === 'autonomy');
}

function checkConditions(
  conditions: ScheduledEventCondition[],
  regions: Record<string, Region>,
  relationships: Relationship[]
): boolean {
  return conditions.every(condition => {
    if (condition.type === 'atLeastOneRegionOwnedByOrPuppetOf') {
      return condition.regions.some(regionId => {
        const region = regions[regionId];
        return region && isOwnedByOrPuppetOf(region.owner, condition.country, relationships);
      });
    }
    return true;
  });
}

/**
 * Apply war declaration between two countries
 * Returns updated relationships array
 */
function applyWarDeclaration(
  relationships: Relationship[],
  fromCountry: CountryId,
  toCountry: CountryId
): Relationship[] {
  return declareWarBetweenCoalitions(relationships, fromCountry, toCountry).updatedRelationships;
}

function removeRelationship(
  relationships: Relationship[],
  fromCountry: CountryId,
  toCountry: CountryId,
  relationshipType?: Relationship['type']
): Relationship[] {
  return relationships.filter(r => !(
    r.fromCountry === fromCountry &&
    r.toCountry === toCountry &&
    (!relationshipType || r.type === relationshipType)
  ));
}

function endWarWithCountryAndPuppets(
  relationships: Relationship[],
  masterCountry: CountryId,
  enemyCountry: CountryId
): Relationship[] {
  const belligerents = getCountryAndPuppets(masterCountry, relationships);

  return relationships.filter(r => !(
    r.type === 'war' &&
    (
      (belligerents.has(r.fromCountry) && r.toCountry === enemyCountry) ||
      (r.fromCountry === enemyCountry && belligerents.has(r.toCountry))
    )
  ));
}

function getCountryAndPuppets(masterCountry: CountryId, relationships: Relationship[]): Set<CountryId> {
  return new Set(getCoalitionCountries(masterCountry, relationships));
}

/**
 * Format date to YYYY-MM-DD string
 */
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

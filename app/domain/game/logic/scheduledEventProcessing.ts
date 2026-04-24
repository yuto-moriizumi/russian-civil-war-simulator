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
  divisions: DivisionState = {},
  allScheduledEvents: ScheduledEvent[] = scheduledEvents
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

    // Events with conditions trigger based on conditionLogic:
    // - 'and' (default): trigger on first date >= event.date where all conditions pass
    // - 'or': trigger when date >= event.date OR conditions pass (whichever comes first)
    // Events without conditions trigger exactly on event.date
    if (event.conditions) {
      const conditionLogic = event.conditionLogic ?? 'and';
      const dateReached = dateString >= event.date;
      const conditionsMet = checkConditions(
        event.conditions,
        dateString,
        updatedRegions,
        relationships,
        allScheduledEvents,
        conditionLogic
      );

      if (conditionLogic === 'or') {
        if (!dateReached && !conditionsMet) return event;
      } else {
        // 'and' logic
        if (!dateReached || !conditionsMet) return event;
      }
    } else {
      if (event.date !== dateString) return event;
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
        const spawnCount = Math.max(1, action.count ?? 1);
        const existingDivisionCount = Object.values(updatedDivisions).filter(
          division => division.armyGroupId === armyGroup.id
        ).length;

        if (updatedRegions[action.regionId]) {
          for (let i = 0; i < spawnCount; i++) {
            const divisionNumber = existingDivisionCount + i + 1;
            const defaultId = `${action.owner}-spawned-${dateString}`;
            const divisionId =
              spawnCount === 1 && !updatedDivisions[defaultId]
                ? defaultId
                : `${defaultId}-${divisionNumber}`;
            const division: Division = {
              id: divisionId,
              name: `${formatOrdinal(divisionNumber)} ${groupName}`,
              owner: action.owner,
              armyGroupId: armyGroup.id,
              hp: BASE_DIVISION_STATS.hp,
              maxHp: BASE_DIVISION_STATS.maxHp,
              attack: BASE_DIVISION_STATS.attack,
              defence: BASE_DIVISION_STATS.defence,
              regionId: action.regionId,
            };
            updatedDivisions = { ...updatedDivisions, [division.id]: division };
          }
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
      } else if (action.type === 'transferCoreRegionsIfOwnedByOrPuppetOf' && action.newOwner && action.overlordCountry) {
        const countryData = COUNTRY_METADATA[action.newOwner];
        const eligibleOwners = getCountryAndPuppets(action.overlordCountry, updatedRelationships);
        if (countryData?.coreRegions) {
          for (const regionId of countryData.coreRegions) {
            const region = updatedRegions[regionId];
            if (region && eligibleOwners.has(region.owner)) {
              updatedRegions[regionId] = { ...region, owner: action.newOwner };
            }
          }
        }
      } else if (action.type === 'transferAllRegionsFromCountry' && action.newOwner && action.fromCountry) {
        for (const [regionId, region] of Object.entries(updatedRegions)) {
          if (region.owner === action.fromCountry) {
            updatedRegions[regionId] = { ...region, owner: action.newOwner };
          }
        }
      } else if (action.type === 'mergeCountry' && action.newOwner && action.fromCountry) {
        // Transfer all regions owned by fromCountry to newOwner
        for (const [regionId, region] of Object.entries(updatedRegions)) {
          if (region.owner === action.fromCountry) {
            updatedRegions[regionId] = { ...region, owner: action.newOwner };
          }
        }
        // Transfer all divisions owned by fromCountry to newOwner
        for (const [divisionId, division] of Object.entries(updatedDivisions)) {
          if (division.owner === action.fromCountry) {
            updatedDivisions[divisionId] = { ...division, owner: action.newOwner };
          }
        }
        // Transfer army groups owned by fromCountry to newOwner
        for (let i = 0; i < updatedArmyGroups.length; i++) {
          if (updatedArmyGroups[i].owner === action.fromCountry) {
            updatedArmyGroups[i] = { ...updatedArmyGroups[i], owner: action.newOwner };
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
  currentDateString: string,
  regions: Record<string, Region>,
  relationships: Relationship[],
  scheduledEvents: ScheduledEvent[] = [],
  conditionLogic: 'and' | 'or' = 'and'
): boolean {
  const evaluateCondition = (condition: ScheduledEventCondition): boolean => {
    if (condition.type === 'and' || condition.type === 'or') {
      return checkConditions(
        condition.conditions,
        currentDateString,
        regions,
        relationships,
        scheduledEvents,
        condition.type
      );
    }
    if (condition.type === 'atLeastOneRegionOwnedByOrPuppetOf') {
      return condition.regions!.some(regionId => {
        const region = regions[regionId];
        return region && isOwnedByOrPuppetOf(region.owner, condition.country!, relationships);
      });
    }
    if (condition.type === 'atLeastOneRegionNotOwnedByOrPuppetOf') {
      return condition.regions!.some(regionId => {
        const region = regions[regionId];
        return region && !isOwnedByOrPuppetOf(region.owner, condition.country!, relationships);
      });
    }
    if (condition.type === 'eventTriggered') {
      return scheduledEvents.some(e => e.id === condition.eventId && e.triggered);
    }
    if (condition.type === 'date') {
      return currentDateString === condition.date;
    }
    return true;
  };

  return conditionLogic === 'or'
    ? conditions.some(evaluateCondition)
    : conditions.every(evaluateCondition);
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

function formatOrdinal(value: number): string {
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

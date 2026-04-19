import { Region, GameEvent, NotificationItem, CountryId, Relationship, ScheduledEvent, ScheduledEventAction, ArmyGroup, Division } from '../../../types/game';
import { createGameEvent, createNotification } from '../../../utils/eventUtils';
import { BASE_DIVISION_STATS } from '../../../utils/bonusCalculator';

/**
 * Process scheduled events that should trigger on the current date
 * Returns updated regions, events, notifications, relationships, army groups, and updated scheduled events
 */
export function processScheduledEvents(
  scheduledEvents: ScheduledEvent[],
  currentDate: Date,
  regions: Record<string, Region>,
  relationships: Relationship[],
  armyGroups: ArmyGroup[]
): {
  updatedScheduledEvents: ScheduledEvent[];
  updatedRegions: Record<string, Region>;
  updatedRelationships: Relationship[];
  updatedArmyGroups: ArmyGroup[];
  newEvents: GameEvent[];
  newNotifications: NotificationItem[];
} {
  const dateString = formatDateToYYYYMMDD(currentDate);

  const updatedRegions = { ...regions };
  let updatedRelationships = [...relationships];
  let updatedArmyGroups = [...armyGroups];
  const newEvents: GameEvent[] = [];
  const newNotifications: NotificationItem[] = [];

  // Find events that should trigger today
  const updatedScheduledEvents = scheduledEvents.map(event => {
    // Skip if already triggered or date doesn't match
    if (event.triggered || event.date !== dateString) {
      return event;
    }

    // Process each action in the event
    event.actions.forEach((action: ScheduledEventAction) => {
      if (action.type === 'transferRegion' && action.regionId && action.newOwner) {
        const region = updatedRegions[action.regionId];
        if (region) {
          updatedRegions[action.regionId] = {
            ...region,
            owner: action.newOwner,
            divisions: [],
          };
        }
      } else if (action.type === 'declareWar' && action.fromCountry && action.toCountry) {
        updatedRelationships = applyWarDeclaration(
          updatedRelationships,
          action.fromCountry,
          action.toCountry
        );
      } else if (action.type === 'setRelationship' && action.fromCountry && action.toCountry && action.relationshipType) {
        updatedRelationships = updatedRelationships.filter(
          r => !(r.fromCountry === action.fromCountry && r.toCountry === action.toCountry)
        );
        updatedRelationships.push({
          fromCountry: action.fromCountry,
          toCountry: action.toCountry!,
          type: action.relationshipType,
        });
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
        };
        const region = updatedRegions[action.regionId];
        if (region) {
          updatedRegions[action.regionId] = {
            ...region,
            divisions: [...region.divisions, division],
          };
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
    newEvents,
    newNotifications,
  };
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
  let updatedRelationships = [...relationships];
  
  // Remove any existing relationship between these countries
  updatedRelationships = updatedRelationships.filter(
    r => !(
      (r.fromCountry === fromCountry && r.toCountry === toCountry) ||
      (r.fromCountry === toCountry && r.toCountry === fromCountry)
    )
  );
  
  // Add mutual war relationships
  updatedRelationships.push({
    fromCountry,
    toCountry,
    type: 'war',
  });
  
  updatedRelationships.push({
    fromCountry: toCountry,
    toCountry: fromCountry,
    type: 'war',
  });
  
  return updatedRelationships;
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

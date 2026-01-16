import { Region, GameEvent, NotificationItem, CountryId, Relationship, ScheduledEvent, ScheduledEventAction } from '../../../types/game';
import { createGameEvent, createNotification } from '../../../utils/eventUtils';

/**
 * Process scheduled events that should trigger on the current date
 * Returns updated regions, events, notifications, relationships, and updated scheduled events
 */
export function processScheduledEvents(
  scheduledEvents: ScheduledEvent[],
  currentDate: Date,
  regions: Record<string, Region>,
  relationships: Relationship[]
): {
  updatedScheduledEvents: ScheduledEvent[];
  updatedRegions: Record<string, Region>;
  updatedRelationships: Relationship[];
  newEvents: GameEvent[];
  newNotifications: NotificationItem[];
} {
  const dateString = formatDateToYYYYMMDD(currentDate);
  
  const updatedRegions = { ...regions };
  let updatedRelationships = [...relationships];
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
        // Transfer region ownership
        const region = updatedRegions[action.regionId];
        if (region) {
          updatedRegions[action.regionId] = {
            ...region,
            owner: action.newOwner,
            // Clear divisions when transferring ownership (simulating rebellion/defection)
            divisions: [],
          };
        }
      } else if (action.type === 'declareWar' && action.fromCountry && action.toCountry) {
        // Declare war between factions
        updatedRelationships = applyWarDeclaration(
          updatedRelationships,
          action.fromCountry,
          action.toCountry
        );
      }
    });
    
    // Create event and notification for this scheduled event
    const gameEvent = createGameEvent(
      'war_declared', // Using existing event type that fits best
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
    newEvents,
    newNotifications,
  };
}

/**
 * Apply war declaration between two factions
 * Returns updated relationships array
 */
function applyWarDeclaration(
  relationships: Relationship[],
  fromCountry: CountryId,
  toCountry: CountryId
): Relationship[] {
  let updatedRelationships = [...relationships];
  
  // Remove any existing relationship between these factions
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

import { FactionId, GameEvent, GameEventType, NotificationItem } from '../types/game';

// Helper function to create game events
export function createGameEvent(
  type: GameEventType,
  title: string,
  description: string,
  timestamp: Date,
  faction?: FactionId,
  regionId?: string
): GameEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    description,
    timestamp: new Date(timestamp),
    faction,
    regionId,
  };
}

// Helper function to create a notification from a game event
// Notifications auto-dismiss after 6 game hours
export function createNotification(
  event: GameEvent,
  currentGameTime: Date,
  durationHours: number = 6
): NotificationItem {
  const expiresAt = new Date(currentGameTime);
  expiresAt.setHours(expiresAt.getHours() + durationHours);
  
  return {
    ...event,
    expiresAt,
  };
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
export function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

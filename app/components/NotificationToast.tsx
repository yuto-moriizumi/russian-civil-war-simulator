'use client';

import { useEffect } from 'react';
import { GameEventType, NotificationItem } from '../types/game';

interface NotificationToastProps {
  notifications: NotificationItem[];
  currentGameTime: Date;
  onDismiss: (id: string) => void;
}

const eventIcons: Record<GameEventType, string> = {
  combat_victory: '⚔️',
  combat_defeat: '💀',
  region_captured: '🏴',
  region_lost: '🏳️',
  unit_created: '🎖️',
  unit_deployed: '📍',
  mission_completed: '✓',
  mission_claimed: '💰',
  game_victory: '👑',
};

const eventColors: Record<GameEventType, string> = {
  combat_victory: 'border-green-600/70 bg-green-900/90',
  combat_defeat: 'border-red-600/70 bg-red-900/90',
  region_captured: 'border-green-600/70 bg-green-900/90',
  region_lost: 'border-red-600/70 bg-red-900/90',
  unit_created: 'border-amber-600/70 bg-amber-900/90',
  unit_deployed: 'border-cyan-600/70 bg-cyan-900/90',
  mission_completed: 'border-purple-600/70 bg-purple-900/90',
  mission_claimed: 'border-amber-600/70 bg-amber-900/90',
  game_victory: 'border-yellow-600/70 bg-yellow-900/90',
};

export default function NotificationToast({ 
  notifications, 
  currentGameTime,
  onDismiss 
}: NotificationToastProps) {
  // Filter notifications that haven't expired yet (derived state, no useState needed)
  const visibleNotifications = notifications.filter(n => 
    new Date(n.expiresAt).getTime() > new Date(currentGameTime).getTime()
  );

  // Auto-dismiss expired notifications
  useEffect(() => {
    const expired = notifications.filter(n => 
      new Date(n.expiresAt).getTime() <= new Date(currentGameTime).getTime()
    );
    expired.forEach(n => onDismiss(n.id));
  }, [notifications, currentGameTime, onDismiss]);

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {visibleNotifications.map((notification, index) => (
        <div
          key={notification.id}
          className={`
            pointer-events-auto
            w-80 rounded-lg border-2 p-4 shadow-2xl
            animate-slide-in-right
            ${eventColors[notification.type]}
          `}
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{eventIcons[notification.type]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-white text-sm leading-tight">
                  {notification.title}
                </h3>
                <button
                  onClick={() => onDismiss(notification.id)}
                  className="flex-shrink-0 text-stone-400 hover:text-white transition-colors text-lg leading-none"
                  title="Dismiss"
                >
                  ×
                </button>
              </div>
              <p className="mt-1 text-xs text-stone-200 leading-snug">
                {notification.description}
              </p>
              <div className="mt-2 text-xs text-stone-400">
                {formatEventTime(notification.timestamp)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatEventTime(timestamp: Date): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

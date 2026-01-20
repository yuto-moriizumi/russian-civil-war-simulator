'use client';

import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { GameEventType } from '../types/game';

const eventIcons: Record<GameEventType, string> = {
  combat_victory: '⚔️',
  combat_defeat: '💀',
  region_captured: '🏴',
  region_lost: '🏳️',
  unit_created: '🎖️',
  unit_deployed: '📍',
  production_started: '🏭',
  production_completed: '✅',
  mission_completed: '✓',
  mission_claimed: '💰',
  war_declared: '⚔️',
  game_victory: '👑',
};

const eventColors: Record<GameEventType, string> = {
  combat_victory: 'border-green-600/70 bg-green-900/90',
  combat_defeat: 'border-red-600/70 bg-red-900/90',
  region_captured: 'border-green-600/70 bg-green-900/90',
  region_lost: 'border-red-600/70 bg-red-900/90',
  unit_created: 'border-amber-600/70 bg-amber-900/90',
  unit_deployed: 'border-cyan-600/70 bg-cyan-900/90',
  production_started: 'border-blue-600/70 bg-blue-900/90',
  production_completed: 'border-emerald-600/70 bg-emerald-900/90',
  mission_completed: 'border-purple-600/70 bg-purple-900/90',
  mission_claimed: 'border-amber-600/70 bg-amber-900/90',
  war_declared: 'border-red-600/70 bg-red-900/90',
  game_victory: 'border-yellow-600/70 bg-yellow-900/90',
};

export default function NotificationToast() { 
  const notifications = useGameStore(state => state.notifications);
  const currentGameTime = useGameStore(state => state.dateTime);
  const onDismiss = useGameStore(state => state.dismissNotification);

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
      {visibleNotifications.map((notification, index) => {
        // Calculate progress percentage (0-100)
        const createdAt = new Date(notification.timestamp).getTime();
        const expiresAt = new Date(notification.expiresAt).getTime();
        const now = new Date(currentGameTime).getTime();
        const totalDuration = expiresAt - createdAt;
        const elapsed = now - createdAt;
        const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));

        return (
          <div
            key={notification.id}
            className={`
              pointer-events-auto
              w-80 rounded-lg border-2 shadow-2xl
              animate-slide-in-right
              overflow-hidden
              ${eventColors[notification.type]}
            `}
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-xl flex-shrink-0">{eventIcons[notification.type]}</span>
              <h3 className="flex-1 font-semibold text-white text-sm leading-tight">
                {notification.title}
              </h3>
              <button
                onClick={() => onDismiss(notification.id)}
                className="flex-shrink-0 text-stone-400 hover:text-white transition-colors text-xl leading-none"
                title="Dismiss"
              >
                ×
              </button>
            </div>
            {/* Progress bar */}
            <div className="h-1 bg-black/30">
              <div 
                className="h-full bg-white/40 transition-all duration-300"
                style={{ width: `${100 - progress}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

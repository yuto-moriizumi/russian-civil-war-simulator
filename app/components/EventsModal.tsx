'use client';

import { useGameStore } from '../store/useGameStore';
import { GameEventType } from '../types/game';
import Modal from './Modal';

const eventIcons: Record<GameEventType, string> = {
  combat_victory: '',
  combat_defeat: '',
  region_captured: '',
  region_lost: '',
  unit_created: '',
  unit_deployed: '',
  production_started: '',
  production_completed: '',
  mission_completed: '',
  mission_claimed: '',
  war_declared: '⚔️',
  game_victory: '',
};

const eventColors: Record<GameEventType, string> = {
  combat_victory: 'text-green-400 border-green-600/50 bg-green-900/20',
  combat_defeat: 'text-red-400 border-red-600/50 bg-red-900/20',
  region_captured: 'text-green-400 border-green-600/50 bg-green-900/20',
  region_lost: 'text-red-400 border-red-600/50 bg-red-900/20',
  unit_created: 'text-amber-400 border-amber-600/50 bg-amber-900/20',
  unit_deployed: 'text-cyan-400 border-cyan-600/50 bg-cyan-900/20',
  production_started: 'text-blue-400 border-blue-600/50 bg-blue-900/20',
  production_completed: 'text-emerald-400 border-emerald-600/50 bg-emerald-900/20',
  mission_completed: 'text-purple-400 border-purple-600/50 bg-purple-900/20',
  mission_claimed: 'text-amber-400 border-amber-600/50 bg-amber-900/20',
  war_declared: 'text-red-400 border-red-600/50 bg-red-900/20',
  game_victory: 'text-yellow-400 border-yellow-600/50 bg-yellow-900/20',
};

function formatEventTime(timestamp: Date): string {
  return timestamp.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EventsModal() {
  const isOpen = useGameStore(state => state.isEventsModalOpen);
  const setIsOpen = useGameStore(state => state.setIsEventsModalOpen);
  const events = useGameStore(state => state.gameEvents);

  const onClose = () => setIsOpen(false);

  // Sort events by timestamp, newest first
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="GAME EVENTS" size="lg">
      {sortedEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-stone-400">
          <span className="mb-2 text-4xl">...</span>
          <p>No events recorded yet.</p>
          <p className="mt-1 text-sm">Events will appear here as the game progresses.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEvents.map((event) => (
            <div
              key={event.id}
              className={`rounded-lg border p-4 ${eventColors[event.type]}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{eventIcons[event.type]}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{event.title}</h3>
                    <span className="text-xs text-stone-400">
                      {formatEventTime(event.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-300">{event.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

import { useEffect, useRef } from 'react';
import { GameState, RegionState, AIState } from '../types/game';
import { saveGame } from '../utils/saveLoad';

/**
 * Custom hook for autosaving the game every game day.
 * Triggers a save when the game day changes while playing.
 */
export function useAutosave(
  gameState: GameState,
  regions: RegionState,
  aiState: AIState | null,
  onSave?: () => void
): void {
  const lastDayRef = useRef<number | null>(null);

  useEffect(() => {
    // Only autosave when on main screen and playing
    if (gameState.currentScreen !== 'main' || !gameState.isPlaying) {
      return;
    }

    // Calculate current game day (days since epoch)
    const currentDay = Math.floor(
      gameState.dateTime.getTime() / (1000 * 60 * 60 * 24)
    );

    // Check if day has changed
    if (lastDayRef.current !== null && currentDay !== lastDayRef.current) {
      // Day changed - trigger autosave
      const success = saveGame(gameState, regions, aiState);
      if (success && onSave) {
        onSave();
      }
    }

    // Update last day reference
    lastDayRef.current = currentDay;
  }, [gameState, regions, aiState, onSave]);
}

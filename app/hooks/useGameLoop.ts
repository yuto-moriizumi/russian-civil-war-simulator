import { useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';

export function useGameLoop() {
  const isPlaying = useSimulationStore(state => state.isPlaying);
  const gameSpeed = useSimulationStore(state => state.gameSpeed);
  const tick = useSimulationStore(state => state.tick);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Time advances based on game speed
    // Speed 1 = 1 hour per second, Speed 5 = 5 hours per second
    const msPerHour = 1000 / gameSpeed;
    
    intervalRef.current = setInterval(() => {
      tick();
    }, msPerHour);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, gameSpeed, tick]);
}

import { useEffect } from 'react';
import { createGameAPI } from '../application/gameController';

/** Browser-facing automation API used by tests and external tooling. */
export function useGameAPI() {
  useEffect(() => {
    window.gameAPI = createGameAPI();

    return () => {
      delete window.gameAPI;
    };
  }, []);
}

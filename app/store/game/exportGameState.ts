import { toEngineState } from './services/engineStateAdapter';
import { useSimulationStore, useGameUiStore } from '../gameStores';

/**
 * In the browser DevTools, call `exportGameState()` to download
 * the current simulation state as a JSON file.
 * The file can be used as a performance test fixture.
 */
export function registerDevToolsExport() {
  if (typeof window === 'undefined') return;
  window.exportGameState = () => {
    const state = {
      ...useSimulationStore.getState(),
      ...useGameUiStore.getState(),
    };
    const engineState = toEngineState(state);
    const json = JSON.stringify(engineState, (_key, value) => {
      if (value instanceof Date) return value.toISOString();
      return value;
    }, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-state-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('[exportGameState] Downloaded game state JSON');
  };
}

declare global {
  interface Window {
    exportGameState: () => void;
  }
}

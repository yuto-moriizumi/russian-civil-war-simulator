'use client';

import { useGameStore } from '../../store/useGameStore';
import { COUNTRY_COLORS } from '../../utils/mapUtils';

export function MovingUnitInfoPanel() {
  const selectedMovementId = useGameStore(state => state.selectedMovementId);
  const setSelectedMovementId = useGameStore(state => state.setSelectedMovementId);
  const movingUnits = useGameStore(state => state.movingUnits);
  const regions = useGameStore(state => state.regions);
  const dateTime = useGameStore(state => state.dateTime);

  if (!selectedMovementId) return null;
  const movement = movingUnits.find(m => m.id === selectedMovementId);
  if (!movement) return null;

  const fromRegion = regions[movement.fromRegion];
  const toRegion = regions[movement.toRegion];
  const totalMs = movement.arrivalTime.getTime() - movement.departureTime.getTime();
  const elapsedMs = Math.max(0, dateTime.getTime() - movement.departureTime.getTime());
  const progressPct = Math.min(100, totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 100);
  const remainingMs = Math.max(0, movement.arrivalTime.getTime() - dateTime.getTime());
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const isPaused = !!movement.pendingCombatId;

  return (
    <div className="absolute left-4 bottom-16 z-10 rounded-lg border-2 border-cyan-400 bg-stone-900/95 p-4 min-w-[280px]">
      <div className="mb-2 text-lg font-bold text-cyan-400 flex items-center gap-2">
        <span>In Transit</span>
        {isPaused && (
          <span className="text-xs font-normal text-yellow-400 bg-yellow-900/40 px-1.5 py-0.5 rounded">
            Combat Pending
          </span>
        )}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-stone-400">From:</span>
          <span className="text-white">{fromRegion?.name ?? movement.fromRegion}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-stone-400">To:</span>
          <span className="text-white">{toRegion?.name ?? movement.toRegion}</span>
        </div>
        {movement.finalDestination && movement.finalDestination !== movement.toRegion && (
          <div className="flex items-center gap-2">
            <span className="text-stone-400">Final:</span>
            <span className="text-white">{regions[movement.finalDestination]?.name ?? movement.finalDestination}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-stone-400">Owner:</span>
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: COUNTRY_COLORS[movement.owner] }}
          />
          <span className="capitalize text-white">{movement.owner}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-stone-400 mb-1">
          <span>Progress</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2 rounded bg-stone-700 overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {!isPaused && remainingMs > 0 && (
          <div className="mt-1 text-xs text-stone-400">
            ETA: {remainingHours}h {remainingMins}m
          </div>
        )}
        {isPaused && (
          <div className="mt-1 text-xs text-yellow-400">
            Waiting for combat to resolve
          </div>
        )}
      </div>

      {/* Division stats */}
      {movement.divisions.length > 0 && (
        <div className="mt-3 rounded bg-stone-800 p-2">
          <div className="text-xs font-semibold text-stone-300 mb-1">
            Divisions ({movement.divisions.length}):
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {movement.divisions.map((div) => (
              <div key={div.id} className="flex items-center justify-between text-xs">
                <span className="text-stone-400 truncate max-w-[120px]" title={div.name}>
                  {div.name.length > 15 ? div.name.substring(0, 15) + '...' : div.name}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-red-400" title="HP">❤ {div.hp}/{div.maxHp}</span>
                  <span className="text-orange-400" title="Attack">⚔ {div.attack}</span>
                  <span className="text-blue-400" title="Defence">🛡 {div.defence}</span>
                </span>
              </div>
            ))}
            <div className="border-t border-stone-700 pt-1 mt-1 flex justify-between text-xs font-semibold">
              <span className="text-stone-300">Total:</span>
              <span className="flex items-center gap-2">
                <span className="text-red-400">❤ {movement.divisions.reduce((s, d) => s + d.hp, 0)}</span>
                <span className="text-orange-400">⚔ {movement.divisions.reduce((s, d) => s + d.attack, 0)}</span>
                <span className="text-blue-400">🛡 {Math.round(movement.divisions.reduce((s, d) => s + d.defence, 0) / movement.divisions.length)}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setSelectedMovementId(null)}
        className="mt-3 w-full rounded bg-stone-700 py-1 text-xs text-stone-300 hover:bg-stone-600"
      >
        Deselect
      </button>

      {!isPaused && (
        <div className="mt-2 text-xs text-stone-500 text-center">
          Right-click a region to redirect
        </div>
      )}
    </div>
  );
}

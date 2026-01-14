/* eslint-disable @next/next/no-img-element */
'use client';

import { Country, GameSpeed, GameEvent, ProductionQueueItem } from '../types/game';
import SpeedControl from './SpeedControl';
import TreasuryButton from './TreasuryButton';

interface TopBarProps {
  country: Country;
  dateTime: Date;
  isPlaying: boolean;
  gameSpeed: GameSpeed;
  money: number;
  income: number;
  grossIncome: number;
  maintenanceCost: number;
  unitCount: number;
  gameEvents: GameEvent[];
  showSavedIndicator: boolean;
  productionQueue: ProductionQueueItem[];
  onTogglePlay: () => void;
  onChangeSpeed: (speed: GameSpeed) => void;
  onSaveGame: () => void;
  onOpenEvents: () => void;
  onOpenProductionQueue: () => void;
}

export default function TopBar({
  country,
  dateTime,
  isPlaying,
  gameSpeed,
  money,
  income,
  grossIncome,
  maintenanceCost,
  unitCount,
  gameEvents,
  showSavedIndicator,
  productionQueue,
  onTogglePlay,
  onChangeSpeed,
  onSaveGame,
  onOpenEvents,
  onOpenProductionQueue,
}: TopBarProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Count active productions for the player
  const activeProductions = productionQueue.filter(p => p.owner === country.id).length;

  return (
    <div className="relative z-10 flex items-center justify-between border-b border-stone-700 bg-stone-900/90 px-4 py-3">
      {/* Left Side: Country Info and Resources */}
      <div className="flex items-center gap-4">
        <div 
          className="flex h-12 w-18 items-center justify-center overflow-hidden rounded border-2"
          style={{ borderColor: country.color, backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <img 
            src={country.flag} 
            alt={`${country.name} flag`}
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">{country.name}</h1>
          <p className="text-xs text-stone-400">The struggle continues...</p>
        </div>

        {/* Resources */}
        <TreasuryButton
          money={money}
          income={income}
          grossIncome={grossIncome}
          maintenanceCost={maintenanceCost}
          unitCount={unitCount}
        />

        {/* Production Queue Button */}
        <button
          onClick={onOpenProductionQueue}
          className="relative rounded bg-emerald-700 px-3 py-1 text-stone-200 transition-colors hover:bg-emerald-600"
          title="Production Queue"
        >
          Queue
          {activeProductions > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-bold text-black">
              {activeProductions > 9 ? '9+' : activeProductions}
            </span>
          )}
        </button>

        {/* Events Button */}
        <button
          onClick={onOpenEvents}
          className="relative rounded bg-stone-700 px-3 py-1 text-stone-300 transition-colors hover:bg-stone-600"
        >
          Events
          {gameEvents.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
              {gameEvents.length > 99 ? '99+' : gameEvents.length}
            </span>
          )}
        </button>
      </div>

      {/* Right Side: Date/Time and Speed Controls */}
      <div className="flex items-stretch gap-4">
        {/* Date/Time */}
        <div className="flex flex-col justify-center rounded-lg border border-stone-600 bg-stone-800/80 px-4 py-2">
          <div className="text-sm font-semibold text-white">{formatDate(dateTime)}</div>
          <div className="text-xs text-stone-400">{formatTime(dateTime)}</div>
        </div>

        {/* Speed Controls */}
        <SpeedControl
          isPlaying={isPlaying}
          gameSpeed={gameSpeed}
          onTogglePlay={onTogglePlay}
          onChangeSpeed={onChangeSpeed}
        />

        {/* Save Button */}
        <button
          onClick={onSaveGame}
          className="rounded bg-amber-700 px-3 py-1 text-stone-200 transition-colors hover:bg-amber-600"
          title="Save Game"
        >
          Save
        </button>

        {/* Saved Indicator */}
        {showSavedIndicator && (
          <span className="flex items-center animate-pulse text-green-400 text-sm">Game Saved!</span>
        )}
      </div>
    </div>
  );
}

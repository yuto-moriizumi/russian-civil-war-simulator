/* eslint-disable @next/next/no-img-element */
'use client';

import { useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { countCountryUnits } from '../utils/mapUtils';
import { getCommandPowerInfo } from '../utils/commandPower';
import SpeedControl from './SpeedControl';

interface TopBarProps {
  showSavedIndicator: boolean;
}

export default function TopBar({ showSavedIndicator }: TopBarProps) {
  // Store selectors
  const country = useGameStore(state => state.selectedCountry);
  const dateTime = useGameStore(state => state.dateTime);
  const isPlaying = useGameStore(state => state.isPlaying);
  const gameSpeed = useGameStore(state => state.gameSpeed);
  const gameEvents = useGameStore(state => state.gameEvents);
  const productionQueue = useGameStore(state => state.productionQueues);
  const mapMode = useGameStore(state => state.mapMode);
  const regions = useGameStore(state => state.regions);
  const movingUnits = useGameStore(state => state.movingUnits);
  const countryBonuses = useGameStore(state => state.countryBonuses);
  
  // Actions
  const togglePlay = useGameStore(state => state.togglePlay);
  const setGameSpeed = useGameStore(state => state.setGameSpeed);
  const saveGame = useGameStore(state => state.saveGame);
  const setIsEventsModalOpen = useGameStore(state => state.setIsEventsModalOpen);
  const setIsProductionModalOpen = useGameStore(state => state.setIsProductionModalOpen);
  const setIsCountrySidebarOpen = useGameStore(state => state.setIsCountrySidebarOpen);
  const setMapMode = useGameStore(state => state.setMapMode);
  
  // Calculate derived values
  const unitCount = useMemo(() => 
    country ? countCountryUnits(regions, country.id, movingUnits) : 0,
    [regions, country, movingUnits]
  );
  
  const commandPowerInfo = useMemo(() => 
    country ? getCommandPowerInfo(
      country.id,
      regions,
      movingUnits,
      productionQueue,
      countryBonuses[country.id],
      country.coreRegions
    ) : { cap: 0, inProduction: 0 },
    [country, regions, movingUnits, productionQueue, countryBonuses]
  );
  
  const divisionCap = commandPowerInfo.cap;
  const inProduction = commandPowerInfo.inProduction;
  
  const handleOpenProductionQueue = () => {
    setIsCountrySidebarOpen(false);
    setIsProductionModalOpen(true);
  };
  
  if (!country) return null;
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
  const activeProductions = (productionQueue[country.id] || []).length;

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

        {/* Command Power Display */}
        {divisionCap !== undefined && (
          <div className="rounded-lg border border-blue-600/50 bg-stone-800/80 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">Command Power:</span>
              <span className="text-lg font-bold text-blue-400">{unitCount} / {divisionCap}</span>
              {inProduction !== undefined && inProduction > 0 && (
                <span className="text-xs text-emerald-400">+{inProduction}</span>
              )}
            </div>
          </div>
        )}

        {/* Production Queue Button */}
        <button
          onClick={handleOpenProductionQueue}
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
          onClick={() => setIsEventsModalOpen(true)}
          className="relative rounded bg-stone-700 px-3 py-1 text-stone-300 transition-colors hover:bg-stone-600"
        >
          Events
          {gameEvents.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
              {gameEvents.length > 99 ? '99+' : gameEvents.length}
            </span>
          )}
        </button>

        {/* Map Mode Selector */}
        <div className="flex rounded border border-stone-600 bg-stone-800/80 overflow-hidden">
          <button
            onClick={() => setMapMode('country')}
            className={`px-3 py-1 text-xs transition-colors ${
              mapMode === 'country'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-stone-300 hover:bg-stone-700'
            }`}
            title="Country Map - Colors by country"
          >
            Country
          </button>
          <button
            onClick={() => setMapMode('diplomacy')}
            className={`px-3 py-1 text-xs transition-colors ${
              mapMode === 'diplomacy'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-stone-300 hover:bg-stone-700'
            }`}
            title="Diplomacy Map - Colors by relationship"
          >
            Diplomacy
          </button>
          <button
            onClick={() => setMapMode('value')}
            className={`px-3 py-1 text-xs transition-colors ${
              mapMode === 'value'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-stone-300 hover:bg-stone-700'
            }`}
            title="Value Map - Colors by command power"
          >
            Value
          </button>
        </div>
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
          onTogglePlay={togglePlay}
          onChangeSpeed={setGameSpeed}
        />

        {/* Save Button */}
        <button
          onClick={saveGame}
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

/* eslint-disable @next/next/no-img-element */
'use client';

import { useMemo } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { useGameUiStore } from '../store/useGameUiStore';
import { getCommandPowerInfo } from '../utils/commandPower';
import SpeedControl from './SpeedControl';

interface TopBarProps {
  showSavedIndicator: boolean;
}

export default function TopBar({ showSavedIndicator }: TopBarProps) {
  // Store selectors
  const country = useSimulationStore(state => state.selectedCountry);
  const dateTime = useSimulationStore(state => state.dateTime);
  const isPlaying = useSimulationStore(state => state.isPlaying);
  const gameSpeed = useSimulationStore(state => state.gameSpeed);
  const productionQueue = useSimulationStore(state => state.productionQueues);
  const regions = useSimulationStore(state => state.regions);
  const divisions = useSimulationStore(state => state.divisions);
  const movingUnits = useSimulationStore(state => state.movingUnits);
  const countryBonuses = useSimulationStore(state => state.countryBonuses);
  const modifiers = useSimulationStore(state => state.modifiers);
  const isPlayerAIEnabled = useSimulationStore(state => state.isPlayerAIEnabled);
  const mapMode = useGameUiStore(state => state.mapMode);
  const isSwitchModeActive = useGameUiStore(state => state.isSwitchModeActive);
  
  // Actions
  const togglePlay = useSimulationStore(state => state.togglePlay);
  const setGameSpeed = useSimulationStore(state => state.setGameSpeed);
  const saveGame = useSimulationStore(state => state.saveGame);
  const setPlayerAIEnabled = useSimulationStore(state => state.setPlayerAIEnabled);
  const setIsProductionModalOpen = useGameUiStore(state => state.setIsProductionModalOpen);
  const setIsCountrySidebarOpen = useGameUiStore(state => state.setIsCountrySidebarOpen);
  const setMapMode = useGameUiStore(state => state.setMapMode);
  const setSwitchModeActive = useGameUiStore(state => state.setSwitchModeActive);
  
  // Calculate derived values
  const commandPowerInfo = useMemo(() => 
    country ? getCommandPowerInfo(
      country.id,
      divisions,
      regions,
      movingUnits,
      productionQueue,
      countryBonuses[country.id],
      country.coreRegions,
      modifiers[country.id]
    ) : { cap: 0, current: 0, inProduction: 0, total: 0, available: 0, controlledStates: 0 },
    [country, regions, divisions, movingUnits, productionQueue, countryBonuses, modifiers]
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
              <span className="text-lg font-bold text-blue-400">{commandPowerInfo.current} / {divisionCap}</span>
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

        {/* Switch Country Button */}
        <button
          onClick={() => setSwitchModeActive(!isSwitchModeActive)}
          className={`rounded px-3 py-1 transition-colors ${
            isSwitchModeActive
              ? 'bg-blue-600 text-white font-semibold hover:bg-blue-500'
              : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
          }`}
          title={isSwitchModeActive ? 'Switch Mode: ON — click a region to take control of its country' : 'Switch Mode: OFF — click to enable country switching'}
        >
          Switch
        </button>

        {/* Player AI Toggle */}
        <label
          className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1 text-xs transition-colors ${
            isPlayerAIEnabled
              ? 'border-blue-500 bg-blue-600 text-white'
              : 'border-stone-600 bg-stone-800/80 text-stone-300 hover:bg-stone-700'
          }`}
          title="Enable AI automation for the player country"
        >
          <input
            type="checkbox"
            checked={isPlayerAIEnabled}
            onChange={(event) => setPlayerAIEnabled(event.target.checked)}
            className="h-4 w-4 accent-blue-600"
          />
          <span className="font-semibold">AI</span>
        </label>

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

/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Country, GameSpeed, Mission, RegionState, Adjacency, Movement, GameEvent, NotificationItem, ActiveCombat, ArmyGroup, Theater } from '../types/game';
import SpeedControl from '../components/SpeedControl';
import CombatPopup from '../components/CombatPopup';
import EventsModal from '../components/EventsModal';
import TheaterPanel from '../components/TheaterPanel';
import NotificationToast from '../components/NotificationToast';
import { countFactionUnits } from '../utils/mapUtils';

// Dynamic import for GameMap to avoid SSR issues with MapLibre
const GameMap = dynamic(() => import('../components/GameMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-stone-900">
      <div className="text-stone-400">Loading map...</div>
    </div>
  ),
});

interface MainScreenProps {
  country: Country;
  dateTime: Date;
  isPlaying: boolean;
  gameSpeed: GameSpeed;
  money: number;
  income: number;
  missions: Mission[];
  movingUnits: Movement[];
  activeCombats: ActiveCombat[];
  regions: RegionState;
  adjacency: Adjacency;
  selectedRegion: string | null;
  selectedUnitRegion: string | null;
  mapDataLoaded: boolean;
  gameEvents: GameEvent[];
  notifications: NotificationItem[];
  // Theater and Army Groups props
  theaters: Theater[];
  armyGroups: ArmyGroup[];
  selectedGroupId: string | null;
  selectedTheaterId: string | null;
  onTogglePlay: () => void;
  onChangeSpeed: (speed: GameSpeed) => void;
  onOpenMissions: () => void;
  onOpenEvents: () => void;
  onClaimMission: (missionId: string) => void;
  onRegionSelect: (regionId: string | null) => void;
  onUnitSelect: (regionId: string | null) => void;
  onDeployUnit: () => void;
  onMoveUnits: (fromRegion: string, toRegion: string, count: number) => void;
  onSelectCombat: (combatId: string | null) => void;
  onSaveGame: () => void;
  lastSaveTime?: Date | null;
  selectedCombatId: string | null;
  isEventsModalOpen: boolean;
  onCloseEvents: () => void;
  onDismissNotification: (notificationId: string) => void;
  // Theater and Army Groups action props
  onSelectTheater: (theaterId: string | null) => void;
  onCreateArmyGroup: (name: string, regionIds: string[], theaterId?: string | null) => void;
  onDeleteArmyGroup: (groupId: string) => void;
  onRenameArmyGroup: (groupId: string, name: string) => void;
  onSelectArmyGroup: (groupId: string | null) => void;
  onAdvanceArmyGroup: (groupId: string) => void;
  onDeployToArmyGroup: (groupId: string) => void;
}

export default function MainScreen({
  country,
  dateTime,
  isPlaying,
  gameSpeed,
  money,
  income,
  missions,
  movingUnits,
  activeCombats,
  regions,
  adjacency,
  selectedRegion,
  selectedUnitRegion,
  mapDataLoaded,
  gameEvents,
  notifications,
  theaters,
  armyGroups,
  selectedGroupId,
  selectedTheaterId,
  onTogglePlay,
  onChangeSpeed,
  onOpenMissions,
  onOpenEvents,
  onClaimMission,
  onRegionSelect,
  onUnitSelect,
  onDeployUnit,
  onMoveUnits,
  onSelectCombat,
  onSaveGame,
  lastSaveTime,
  selectedCombatId,
  isEventsModalOpen,
  onCloseEvents,
  onDismissNotification,
  onSelectTheater,
  onCreateArmyGroup,
  onDeleteArmyGroup,
  onRenameArmyGroup,
  onSelectArmyGroup,
  onAdvanceArmyGroup,
  onDeployToArmyGroup,
}: MainScreenProps) {
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [isArmyGroupsPanelExpanded, setIsArmyGroupsPanelExpanded] = useState(true);
  const [showTreasuryDetails, setShowTreasuryDetails] = useState(false);
  const treasuryRef = useRef<HTMLDivElement>(null);
  
  // Store lastSaveTime in a ref to compare and trigger indicator
  const prevSaveTimeRef = useRef<Date | null>(null);

  // Show "Saved!" indicator when lastSaveTime changes
  // This setState is intentional - we need to show a UI indicator in response to prop change
  useEffect(() => {
    if (lastSaveTime && lastSaveTime !== prevSaveTimeRef.current) {
      prevSaveTimeRef.current = lastSaveTime;
      // Using requestAnimationFrame to schedule the state update outside the effect body
      requestAnimationFrame(() => {
        setShowSavedIndicator(true);
      });
      const timer = setTimeout(() => setShowSavedIndicator(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastSaveTime]);

  // Close treasury details when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (treasuryRef.current && !treasuryRef.current.contains(event.target as Node)) {
        setShowTreasuryDetails(false);
      }
    };

    if (showTreasuryDetails) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTreasuryDetails]);

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

  // Calculate unit count and maintenance costs
  const unitCount = countFactionUnits(regions, country.id, movingUnits);
  const maintenanceCost = unitCount; // $1 per unit per hour
  const grossIncome = income + maintenanceCost; // Calculate gross income before maintenance

  const completedMissions = missions.filter(m => m.completed && !m.claimed);

  const selectedCombat = selectedCombatId 
    ? activeCombats.find(c => c.id === selectedCombatId) 
    : null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0">
        {mapDataLoaded ? (
          <GameMap
            regions={regions}
            adjacency={adjacency}
            selectedRegion={selectedRegion}
            selectedUnitRegion={selectedUnitRegion}
            movingUnits={movingUnits}
            activeCombats={activeCombats}
            currentDateTime={dateTime}
            playerFaction={country.id}
            unitsInReserve={0}
            theaters={theaters}
            selectedTheaterId={selectedTheaterId}
            onRegionSelect={onRegionSelect}
            onUnitSelect={onUnitSelect}
            onDeployUnit={onDeployUnit}
            onMoveUnits={onMoveUnits}
            onSelectCombat={onSelectCombat}
          />
        ) : (
          <div 
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundColor: '#2d3a2d',
              backgroundImage: `
                radial-gradient(circle at 30% 40%, rgba(60,80,60,0.8) 0%, transparent 50%),
                radial-gradient(circle at 70% 60%, rgba(80,100,80,0.6) 0%, transparent 40%),
                radial-gradient(circle at 50% 30%, rgba(40,60,40,0.7) 0%, transparent 60%),
                linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5))
              `,
            }}
          >
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-stone-400">Loading map data...</div>
            </div>
          </div>
        )}
      </div>

      {/* Top Bar */}
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
          <div className="relative" ref={treasuryRef}>
            <button
              onClick={() => setShowTreasuryDetails(!showTreasuryDetails)}
              className="rounded-lg border border-amber-600/50 bg-stone-800/80 px-4 py-2 transition-colors hover:bg-stone-800"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-amber-400">${money}</span>
                <span className={`text-xs ${income >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {income >= 0 ? '+' : ''}${income}/h
                </span>
              </div>
            </button>

            {/* Treasury Details Tooltip */}
            {showTreasuryDetails && (
              <div className="absolute left-0 top-full mt-2 z-20 w-64 rounded-lg border border-amber-600/50 bg-stone-900/95 p-3 shadow-xl">
                <div className="text-xs text-stone-400 mb-2">Treasury Details</div>
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-300">Current Balance:</span>
                    <span className="font-bold text-amber-400">${money}</span>
                  </div>
                  <div className="border-t border-stone-700 my-1"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-green-400">Gross Income:</span>
                    <span className="text-green-400">+${grossIncome}/h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-400">Maintenance:</span>
                    <span className="text-red-400">-${maintenanceCost}/h ({unitCount} units)</span>
                  </div>
                  <div className="border-t border-stone-700 my-1"></div>
                  <div className="flex items-center justify-between">
                    <span className={income >= 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                      Net Income:
                    </span>
                    <span className={income >= 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                      {income >= 0 ? '+' : ''}${income}/h
                    </span>
                  </div>
                </div>
              </div>
            )}
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

          {/* Saved Indicator */}
          {showSavedIndicator && (
            <span className="flex items-center animate-pulse text-green-400 text-sm">Game Saved!</span>
          )}
        </div>
      </div>

      {/* Mission Window */}
      <div className="absolute right-4 top-24 z-10 w-72 rounded-lg border border-stone-600 bg-stone-900/90 p-4">
        <div className="mb-4 flex items-center justify-between border-b border-stone-700 pb-2">
          <h2 className="text-sm font-bold tracking-wider text-stone-300">MISSIONS</h2>
          <button
            onClick={onOpenMissions}
            className="rounded bg-stone-700 px-3 py-1 text-xs text-stone-300 transition-colors hover:bg-stone-600"
          >
            View All
          </button>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {missions.slice(0, 4).map((mission) => (
            <div
              key={mission.id}
              className={`rounded border p-3 transition-colors ${
                mission.claimed
                  ? 'border-stone-700 bg-stone-800/50 opacity-50'
                  : mission.completed
                  ? 'border-green-600 bg-green-900/30 cursor-pointer hover:bg-green-900/50'
                  : 'border-stone-600 bg-stone-800'
              }`}
              onClick={() => mission.completed && !mission.claimed && onClaimMission(mission.id)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{mission.name}</span>
                {mission.claimed && <span className="text-green-400">✓</span>}
                {mission.completed && !mission.claimed && (
                  <span className="rounded bg-green-600 px-2 py-0.5 text-xs text-white">Claim</span>
                )}
              </div>
              <p className="mt-1 text-xs text-stone-400">{mission.description}</p>
              <div className="mt-2 text-xs text-amber-400">Reward: ${mission.rewards.money}</div>
            </div>
          ))}
        </div>

        {completedMissions.length > 0 && (
          <div className="mt-3 rounded bg-green-900/30 p-2 text-center text-sm text-green-400">
            {completedMissions.length} mission(s) ready to claim!
          </div>
        )}
      </div>

      {/* Theater Panel - now at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <TheaterPanel
          theaters={theaters}
          armyGroups={armyGroups}
          regions={regions}
          playerFaction={country.id}
          selectedTheaterId={selectedTheaterId}
          selectedGroupId={selectedGroupId}
          isExpanded={isArmyGroupsPanelExpanded}
          movingUnits={movingUnits}
          onToggleExpanded={() => setIsArmyGroupsPanelExpanded(!isArmyGroupsPanelExpanded)}
          onSelectTheater={onSelectTheater}
          onCreateGroup={onCreateArmyGroup}
          onDeleteGroup={onDeleteArmyGroup}
          onRenameGroup={onRenameArmyGroup}
          onSelectGroup={onSelectArmyGroup}
          onAdvanceGroup={onAdvanceArmyGroup}
          onDeployToGroup={onDeployToArmyGroup}
        />
      </div>

      {/* Combat Popup */}
      {selectedCombat && (
        <CombatPopup
          combat={selectedCombat}
          onClose={() => onSelectCombat(null)}
        />
      )}

      {/* Events Modal */}
      <EventsModal
        isOpen={isEventsModalOpen}
        onClose={onCloseEvents}
        events={gameEvents}
      />

      {/* Notification Toasts */}
      <NotificationToast
        notifications={notifications}
        currentGameTime={dateTime}
        onDismiss={onDismissNotification}
      />
    </div>
  );
}

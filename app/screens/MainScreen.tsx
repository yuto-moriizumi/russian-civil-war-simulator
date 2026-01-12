'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Country, GameSpeed, Mission, RegionState, Adjacency, Movement, GameEvent, NotificationItem, ActiveCombat, ArmyGroup, Theater } from '../types/game';
import CombatPopup from '../components/CombatPopup';
import EventsModal from '../components/EventsModal';
import TheaterPanel from '../components/TheaterPanel';
import NotificationToast from '../components/NotificationToast';
import TopBar from '../components/TopBar';
import MissionPanel from '../components/MissionPanel';
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

  // Calculate unit count and maintenance costs
  const unitCount = countFactionUnits(regions, country.id, movingUnits);
  const maintenanceCost = unitCount; // $1 per unit per hour
  const grossIncome = income + maintenanceCost; // Calculate gross income before maintenance

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
      <TopBar
        country={country}
        dateTime={dateTime}
        isPlaying={isPlaying}
        gameSpeed={gameSpeed}
        money={money}
        income={income}
        grossIncome={grossIncome}
        maintenanceCost={maintenanceCost}
        unitCount={unitCount}
        gameEvents={gameEvents}
        showSavedIndicator={showSavedIndicator}
        onTogglePlay={onTogglePlay}
        onChangeSpeed={onChangeSpeed}
        onSaveGame={onSaveGame}
        onOpenEvents={onOpenEvents}
      />

      {/* Mission Panel */}
      <MissionPanel
        missions={missions}
        onOpenMissions={onOpenMissions}
        onClaimMission={onClaimMission}
      />

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

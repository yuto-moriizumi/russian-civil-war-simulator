'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Country, GameSpeed, Mission, RegionState, Adjacency, Movement, GameEvent, NotificationItem, ActiveCombat, ArmyGroup, Theater, ProductionQueueItem, Relationship, RelationshipType, FactionId, MapMode, FactionBonuses } from '../types/game';
import CombatPopup from '../components/CombatPopup';
import EventsModal from '../components/EventsModal';
import TheaterPanel from '../components/TheaterPanel';
import NotificationToast from '../components/NotificationToast';
import TopBar from '../components/TopBar';
import MissionPanel from '../components/MissionPanel';
import ProductionQueuePanel from '../components/ProductionQueuePanel';
import CountrySidebar from '../components/CountrySidebar';
import { countFactionUnits } from '../utils/mapUtils';
import { getDivisionCapInfo } from '../utils/divisionCap';

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
  productionQueue: Record<FactionId, ProductionQueueItem[]>;
  factionBonuses: Record<FactionId, FactionBonuses>;
  // Theater and Army Groups props
  theaters: Theater[];
  armyGroups: ArmyGroup[];
  selectedGroupId: string | null;
  selectedTheaterId: string | null;
  relationships: Relationship[];
  selectedCountryId: FactionId | null;
  isCountrySidebarOpen: boolean;
  mapMode: MapMode;
  regionCentroids: Record<string, [number, number]>;
  getRelationship: (fromFaction: FactionId, toFaction: FactionId) => RelationshipType;
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
  isProductionModalOpen: boolean;
  onCloseEvents: () => void;
  onOpenProductionQueue: () => void;
  onCloseProductionQueue: () => void;
  onCancelProduction: (productionId: string) => void;
  onDismissNotification: (notificationId: string) => void;
  onSetRelationship: (fromFaction: FactionId, toFaction: FactionId, type: RelationshipType) => void;
  // Theater and Army Groups action props
  onSelectTheater: (theaterId: string | null) => void;
  onCreateArmyGroup: (name: string, regionIds: string[], theaterId?: string | null) => void;
  onDeleteArmyGroup: (groupId: string) => void;
  onRenameArmyGroup: (groupId: string, name: string) => void;
  onSelectArmyGroup: (groupId: string | null) => void;
  onSetArmyGroupMode: (groupId: string, mode: 'none' | 'advance' | 'defend') => void;
  onDeployToArmyGroup: (groupId: string, count?: number) => void;
  onAssignTheater: (groupId: string, theaterId: string | null) => void;
  onCountrySelect: (factionId: FactionId | null) => void;
  onSidebarOpen: (isOpen: boolean) => void;
  onSetMapMode: (mode: MapMode) => void;
}

export default function MainScreen({
  country,
  dateTime,
  isPlaying,
  gameSpeed,
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
  productionQueue,
  factionBonuses,
  theaters,
  armyGroups,
  selectedGroupId,
  selectedTheaterId,
  relationships,
  selectedCountryId,
  isCountrySidebarOpen,
  mapMode,
  regionCentroids,
  getRelationship,
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
  isProductionModalOpen,
  onCloseEvents,
  onOpenProductionQueue,
  onCloseProductionQueue,
  onCancelProduction,
  onDismissNotification,
  onSetRelationship,
  onSelectTheater,
  onCreateArmyGroup,
  onDeleteArmyGroup,
  onRenameArmyGroup,
  onSelectArmyGroup,
  onSetArmyGroupMode,
  onDeployToArmyGroup,
  onAssignTheater,
  onCountrySelect,
  onSidebarOpen,
  onSetMapMode,
}: MainScreenProps) {
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  
  // Store lastSaveTime timestamp in a ref to compare and trigger indicator
  // Initialize with current lastSaveTime to avoid showing indicator on mount
  const prevSaveTimeRef = useRef<number | null>(lastSaveTime?.getTime() || null);

  // Show "Saved!" indicator when lastSaveTime changes
  // This setState is intentional - we need to show a UI indicator in response to prop change
  useEffect(() => {
    const currentSaveTime = lastSaveTime?.getTime() || null;
    
    // Only trigger if save time actually changed (compare timestamps, not object references)
    if (currentSaveTime && currentSaveTime !== prevSaveTimeRef.current) {
      prevSaveTimeRef.current = currentSaveTime;
      
      // Only show the indicator if the save happened in the last 5 seconds
      // to avoid showing it on mount for old rehydrated saves
      const isRecent = (Date.now() - currentSaveTime) < 5000;
      
      if (isRecent) {
        // Schedule state update to avoid synchronous setState in effect
        const showTimer = setTimeout(() => {
          setShowSavedIndicator(true);
        }, 0);
        const hideTimer = setTimeout(() => setShowSavedIndicator(false), 2000);
        return () => {
          clearTimeout(showTimer);
          clearTimeout(hideTimer);
        };
      }
    }
  }, [lastSaveTime]);

  // Calculate unit count and maintenance costs
  const unitCount = countFactionUnits(regions, country.id, movingUnits);
  const maintenanceCost = unitCount; // $1 per unit per hour
  const grossIncome = 0; // No longer used

  // Calculate division cap info
  const divisionCapInfo = getDivisionCapInfo(
    country.id,
    regions,
    movingUnits,
    productionQueue,
    factionBonuses[country.id]
  );

  const selectedCombat = selectedCombatId 
    ? activeCombats.find(c => c.id === selectedCombatId) 
    : null;

  const handleOpenProductionQueue = () => {
    onSidebarOpen(false);
    onOpenProductionQueue();
  };

  const handleCountrySelect = (factionId: FactionId | null) => {
    if (factionId) {
      onCloseProductionQueue();
    }
    onCountrySelect(factionId);
  };

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
            selectedGroupId={selectedGroupId}
            armyGroups={armyGroups}
            mapMode={mapMode}
            regionCentroids={regionCentroids}
            getRelationship={getRelationship}
            onRegionSelect={onRegionSelect}
            onUnitSelect={onUnitSelect}
            onDeployUnit={onDeployUnit}
            onMoveUnits={onMoveUnits}
            onSelectCombat={onSelectCombat}
            onCountrySelect={handleCountrySelect}
            onSidebarOpen={onSidebarOpen}
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
        grossIncome={grossIncome}
        maintenanceCost={maintenanceCost}
        unitCount={unitCount}
        gameEvents={gameEvents}
        showSavedIndicator={showSavedIndicator}
        productionQueue={productionQueue}
        mapMode={mapMode}
        divisionCap={divisionCapInfo.cap}
        controlledStates={divisionCapInfo.controlledStates}
        inProduction={divisionCapInfo.inProduction}
        onTogglePlay={onTogglePlay}
        onChangeSpeed={onChangeSpeed}
        onSaveGame={onSaveGame}
        onOpenEvents={onOpenEvents}
        onOpenProductionQueue={handleOpenProductionQueue}
        onSetMapMode={onSetMapMode}
      />

      {/* Country Sidebar */}
      {selectedCountryId && (
        <CountrySidebar
          isOpen={isCountrySidebarOpen}
          onClose={() => onSidebarOpen(false)}
          countryId={selectedCountryId}
          playerFaction={country.id}
          relationships={relationships}
          onSetRelationship={onSetRelationship}
        />
      )}

      {/* Production Queue Panel */}
      <ProductionQueuePanel
        isOpen={isProductionModalOpen}
        onClose={onCloseProductionQueue}
        productionQueue={productionQueue}
        regions={regions}
        armyGroups={armyGroups}
        playerFaction={country.id}
        currentDateTime={dateTime}
        onAddProduction={() => {}} // Disabled - use Deploy button instead
        onCancelProduction={onCancelProduction}
        viewOnly={true}
      />

      {/* Mission Panel */}
      <MissionPanel
        missions={missions}
        onOpenMissions={onOpenMissions}
        onClaimMission={onClaimMission}
      />

      {/* Theater Panel - now at bottom center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-fit max-w-[95vw]">
        <TheaterPanel
          theaters={theaters}
          armyGroups={armyGroups}
          regions={regions}
          playerFaction={country.id}
          selectedGroupId={selectedGroupId}
          movingUnits={movingUnits}
          productionQueue={productionQueue}
          factionBonuses={factionBonuses[country.id]}
          onCreateGroup={onCreateArmyGroup}
          onDeleteGroup={onDeleteArmyGroup}
          onRenameGroup={onRenameArmyGroup}
          onSelectGroup={onSelectArmyGroup}
          onSetGroupMode={onSetArmyGroupMode}
          onDeployToGroup={onDeployToArmyGroup}
          onAssignTheater={onAssignTheater}
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

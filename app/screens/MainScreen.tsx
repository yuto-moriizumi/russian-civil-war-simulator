'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Country, GameSpeed, Mission, RegionState, Adjacency, Movement, GameEvent, NotificationItem, ActiveCombat, ArmyGroup, Theater, ProductionQueueItem, Relationship, RelationshipType, FactionId } from '../types/game';
import CombatPopup from '../components/CombatPopup';
import EventsModal from '../components/EventsModal';
import TheaterPanel from '../components/TheaterPanel';
import NotificationToast from '../components/NotificationToast';
import TopBar from '../components/TopBar';
import MissionPanel from '../components/MissionPanel';
import ProductionQueueModal from '../components/ProductionQueueModal';
import RelationshipsPanel from '../components/RelationshipsPanel';
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
  productionQueue: ProductionQueueItem[];
  // Theater and Army Groups props
  theaters: Theater[];
  armyGroups: ArmyGroup[];
  selectedGroupId: string | null;
  selectedTheaterId: string | null;
  relationships: Relationship[];
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
  productionQueue,
  theaters,
  armyGroups,
  selectedGroupId,
  selectedTheaterId,
  relationships,
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
  onSelectTheater,
  onCreateArmyGroup,
  onDeleteArmyGroup,
  onRenameArmyGroup,
  onSelectArmyGroup,
  onSetArmyGroupMode,
  onDeployToArmyGroup,
  onSetRelationship,
}: MainScreenProps) {
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [isArmyGroupsPanelExpanded, setIsArmyGroupsPanelExpanded] = useState(true);
  const [showRelationshipsPanel, setShowRelationshipsPanel] = useState(false);
  
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
        productionQueue={productionQueue}
        onTogglePlay={onTogglePlay}
        onChangeSpeed={onChangeSpeed}
        onSaveGame={onSaveGame}
        onOpenEvents={onOpenEvents}
        onOpenProductionQueue={onOpenProductionQueue}
        onToggleRelationships={() => setShowRelationshipsPanel(!showRelationshipsPanel)}
      />

      {/* Relationships Panel */}
      {showRelationshipsPanel && (
        <RelationshipsPanel
          playerFaction={country.id}
          relationships={relationships}
          onSetRelationship={onSetRelationship}
        />
      )}

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
          onSetGroupMode={onSetArmyGroupMode}
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

      {/* Production Queue Modal - View Only (no manual adding) */}
      <ProductionQueueModal
        isOpen={isProductionModalOpen}
        onClose={onCloseProductionQueue}
        productionQueue={productionQueue}
        regions={regions}
        armyGroups={armyGroups}
        playerFaction={country.id}
        currentDateTime={dateTime}
        money={money}
        onAddProduction={() => {}} // Disabled - use Deploy button instead
        onCancelProduction={onCancelProduction}
        viewOnly={true}
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

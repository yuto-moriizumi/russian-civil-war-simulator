'use client';

import { useGameStore } from './store/useGameStore';
import { useGameLoop } from './hooks/useGameLoop';
import { useMapData } from './hooks/useMapData';
import { useGameAPI } from './hooks/useGameAPI';
import TitleScreen from './screens/TitleScreen';
import CountrySelectScreen from './screens/CountrySelectScreen';
import MainScreen from './screens/MainScreen';
import MissionScreen from './screens/MissionScreen';
import EventsModal from './components/EventsModal';
import CombatPopup from './components/CombatPopup';

export default function Home() {
  const currentScreen = useGameStore(state => state.currentScreen);
  const selectedCountry = useGameStore(state => state.selectedCountry);
  const isEventsModalOpen = useGameStore(state => state.isEventsModalOpen);
  const setIsEventsModalOpen = useGameStore(state => state.setIsEventsModalOpen);
  const selectedCombatId = useGameStore(state => state.selectedCombatId);
  const setSelectedCombatId = useGameStore(state => state.setSelectedCombatId);
  const activeCombats = useGameStore(state => state.activeCombats);
  const gameEvents = useGameStore(state => state.gameEvents);
  
  // Initialize Hooks
  useGameLoop();
  useMapData();
  useGameAPI();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'title':
        return <TitleScreenView />;
      case 'countrySelect':
        return <CountrySelectScreenView />;
      case 'main':
        if (!selectedCountry) return <CountrySelectScreenView />;
        return <MainScreenView />;
      case 'mission':
        return <MissionScreenView />;
      default:
        return null;
    }
  };

  const selectedCombat = selectedCombatId 
    ? activeCombats.find(c => c.id === selectedCombatId) 
    : null;

  return (
    <div className="min-h-screen w-full">
      {renderScreen()}
      <EventsModal
        isOpen={isEventsModalOpen}
        onClose={() => setIsEventsModalOpen(false)}
        events={gameEvents}
      />
      {selectedCombat && (
        <CombatPopup
          combat={selectedCombat}
          onClose={() => setSelectedCombatId(null)}
        />
      )}
    </div>
  );
}

// Sub-components to keep the main file clean and use specific store slices
function TitleScreenView() {
  const navigateToScreen = useGameStore(state => state.navigateToScreen);
  // Note: Persist handles loading automatically, but we can still expose a "Continue" button
  return (
    <TitleScreen 
      onStartGame={() => navigateToScreen('countrySelect')}
      onContinue={() => navigateToScreen('main')} // Simplification for now
      hasSave={true} // Hardcoded for now as Persist is active
      saveInfo={null}
    />
  );
}

function CountrySelectScreenView() {
  const selectCountry = useGameStore(state => state.selectCountry);
  const navigateToScreen = useGameStore(state => state.navigateToScreen);
  return (
    <CountrySelectScreen
      onSelectCountry={selectCountry}
      onBack={() => navigateToScreen('title')}
    />
  );
}

function MainScreenView() {
  const state = useGameStore();
  
  return (
    <MainScreen
      country={state.selectedCountry!}
      dateTime={state.dateTime}
      isPlaying={state.isPlaying}
      gameSpeed={state.gameSpeed}
      money={state.money}
      income={state.income}
      reserveDivisions={state.reserveDivisions}
      missions={state.missions}
      movingUnits={state.movingUnits}
      activeCombats={state.activeCombats}
      regions={state.regions}
      adjacency={state.adjacency}
      selectedRegion={state.selectedRegion}
      selectedUnitRegion={state.selectedUnitRegion}
      mapDataLoaded={state.mapDataLoaded}
      gameEvents={state.gameEvents}
      onTogglePlay={state.togglePlay}
      onChangeSpeed={state.setGameSpeed}
      onCreateInfantry={state.createInfantry}
      onOpenMissions={state.openMissions}
      onOpenEvents={() => state.setIsEventsModalOpen(true)}
      onClaimMission={state.claimMission}
      onRegionSelect={state.setSelectedRegion}
      onUnitSelect={state.setSelectedUnitRegion}
      onDeployUnit={state.deployUnit}
      onMoveUnits={state.moveUnits}
      onSelectCombat={state.setSelectedCombatId}
      onSaveGame={state.saveGame}
      lastSaveTime={state.lastSaveTime}
    />
  );
}

function MissionScreenView() {
  const missions = useGameStore(state => state.missions);
  const navigateToScreen = useGameStore(state => state.navigateToScreen);
  const claimMission = useGameStore(state => state.claimMission);
  
  return (
    <MissionScreen
      missions={missions}
      onBack={() => navigateToScreen('main')}
      onClaimMission={claimMission}
    />
  );
}

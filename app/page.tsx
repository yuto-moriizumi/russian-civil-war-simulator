'use client';

import { useGameStore } from './store/useGameStore';
import { useGameLoop } from './hooks/useGameLoop';
import { useMapData } from './hooks/useMapData';
import { useGameAPI } from './hooks/useGameAPI';
import TitleScreen from './screens/TitleScreen';
import CountrySelectScreen from './screens/CountrySelectScreen';
import MainScreen from './screens/MainScreen';
import MissionScreen from './screens/MissionScreen';

export default function Home() {
  const currentScreen = useGameStore(state => state.currentScreen);
  const selectedCountry = useGameStore(state => state.selectedCountry);
  
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

  return (
    <div className="min-h-screen w-full">
      {renderScreen()}
    </div>
  );
}

// Sub-components to keep the main file clean and use specific store slices
function TitleScreenView() {
  const navigateToScreen = useGameStore(state => state.navigateToScreen);
  const selectedCountry = useGameStore(state => state.selectedCountry);
  const dateTime = useGameStore(state => state.dateTime);
  
  // Check if there's a valid saved game (has a selected country and non-default date)
  const hasSave = selectedCountry !== null;
  const saveInfo = hasSave ? {
    savedAt: new Date(), // We don't track this separately, so use current time
    gameDate: dateTime
  } : null;
  
  return (
    <TitleScreen 
      onStartGame={() => navigateToScreen('countrySelect')}
      onContinue={() => {
        // Continue goes directly to the main screen since state is already loaded
        if (hasSave) {
          navigateToScreen('main');
        }
      }}
      hasSave={hasSave}
      saveInfo={saveInfo}
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
      theaters={state.theaters}
      armyGroups={state.armyGroups}
      selectedGroupId={state.selectedGroupId}
      selectedTheaterId={state.selectedTheaterId}
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
      selectedCombatId={state.selectedCombatId}
      isEventsModalOpen={state.isEventsModalOpen}
      onCloseEvents={() => state.setIsEventsModalOpen(false)}
      onSelectTheater={state.selectTheater}
      onCreateArmyGroup={state.createArmyGroup}
      onDeleteArmyGroup={state.deleteArmyGroup}
      onRenameArmyGroup={state.renameArmyGroup}
      onSelectArmyGroup={state.selectArmyGroup}
      onAdvanceArmyGroup={state.advanceArmyGroup}
      onDeployToArmyGroup={state.deployToArmyGroup}
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

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
      missions={state.missions}
      movingUnits={state.movingUnits}
      activeCombats={state.activeCombats}
      regions={state.regions}
      adjacency={state.adjacency}
      selectedRegion={state.selectedRegion}
      selectedUnitRegion={state.selectedUnitRegion}
      mapDataLoaded={state.mapDataLoaded}
      gameEvents={state.gameEvents}
      notifications={state.notifications}
      productionQueue={state.productionQueues}
      factionBonuses={state.factionBonuses}
      theaters={state.theaters}
      armyGroups={state.armyGroups}
      selectedGroupId={state.selectedGroupId}
      selectedTheaterId={state.selectedTheaterId}
      relationships={state.relationships}
      selectedCountryId={state.selectedCountryId}
      isCountrySidebarOpen={state.isCountrySidebarOpen}
      mapMode={state.mapMode}
      regionCentroids={state.regionCentroids}
      getRelationship={state.getRelationship}
      onTogglePlay={state.togglePlay}
      onChangeSpeed={state.setGameSpeed}
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
      isProductionModalOpen={state.isProductionModalOpen}
      onCloseEvents={() => state.setIsEventsModalOpen(false)}
      onOpenProductionQueue={() => state.setIsProductionModalOpen(true)}
      onCloseProductionQueue={() => state.setIsProductionModalOpen(false)}
      onCancelProduction={state.cancelProduction}
      onDismissNotification={state.dismissNotification}
      onSelectTheater={state.selectTheater}
      onCreateArmyGroup={state.createArmyGroup}
      onDeleteArmyGroup={state.deleteArmyGroup}
      onRenameArmyGroup={state.renameArmyGroup}
      onSelectArmyGroup={state.selectArmyGroup}
      onSetArmyGroupMode={state.setArmyGroupMode}
      onDeployToArmyGroup={state.deployToArmyGroup}
      onAssignTheater={state.assignTheaterToGroup}
      onSetRelationship={state.setRelationship}
      onCountrySelect={state.setSelectedCountryId}
      onSidebarOpen={state.setIsCountrySidebarOpen}
      onSetMapMode={state.setMapMode}
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

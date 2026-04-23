'use client';

import { useSimulationStore } from './store/useSimulationStore';
import { useGameUiStore } from './store/useGameUiStore';
import { useGameLoop } from './hooks/useGameLoop';
import { useMapData } from './hooks/useMapData';
import { useGameAPI } from './hooks/useGameAPI';
import TitleScreen from './screens/TitleScreen';
import CountrySelectScreen from './screens/CountrySelectScreen';
import MainScreen from './screens/MainScreen';
import MissionScreen from './screens/MissionScreen';

export default function Home() {
  const currentScreen = useGameUiStore(state => state.currentScreen);
  const selectedCountry = useSimulationStore(state => state.selectedCountry);
  
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
  const navigateToScreen = useGameUiStore(state => state.navigateToScreen);
  const startNewGame = useSimulationStore(state => state.startNewGame);
  const selectedCountry = useSimulationStore(state => state.selectedCountry);
  const dateTime = useSimulationStore(state => state.dateTime);
  
  // Check if there's a valid saved game (has a selected country and non-default date)
  const hasSave = selectedCountry !== null;
  const saveInfo = hasSave ? {
    savedAt: new Date(), // We don't track this separately, so use current time
    gameDate: dateTime
  } : null;
  
  return (
    <TitleScreen 
      onStartGame={startNewGame}
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
  const selectCountry = useSimulationStore(state => state.selectCountry);
  const navigateToScreen = useGameUiStore(state => state.navigateToScreen);
  return (
    <CountrySelectScreen
      onSelectCountry={(country) => selectCountry(country, true)}
      onBack={() => navigateToScreen('title')}
    />
  );
}

function MainScreenView() {
  const selectedCountry = useSimulationStore(state => state.selectedCountry);
  
  if (!selectedCountry) {
    return <CountrySelectScreenView />;
  }
  
  return <MainScreen />;
}

function MissionScreenView() {
  return <MissionScreen />;
}

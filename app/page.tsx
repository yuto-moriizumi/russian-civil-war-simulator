'use client';

import { useState, useCallback, useEffect } from 'react';
import { Screen, Country, GameSpeed, GameState, RegionState, Adjacency } from './types/game';
import { initialMissions } from './data/gameData';
import { createInitialOwnership } from './utils/mapUtils';
import TitleScreen from './screens/TitleScreen';
import CountrySelectScreen from './screens/CountrySelectScreen';
import MainScreen from './screens/MainScreen';
import MissionScreen from './screens/MissionScreen';

const initialGameState: GameState = {
  currentScreen: 'title',
  selectedCountry: null,
  dateTime: new Date(1917, 10, 7), // November 7, 1917 - October Revolution
  isPlaying: false,
  gameSpeed: 1,
  money: 100,
  income: 5,
  infantryUnits: 0,
  missions: initialMissions,
};

export default function Home() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [regions, setRegions] = useState<RegionState>({});
  const [adjacency, setAdjacency] = useState<Adjacency>({});
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [mapDataLoaded, setMapDataLoaded] = useState(false);

  // Load map data on mount
  useEffect(() => {
    const loadMapData = async () => {
      try {
        // Load GeoJSON and adjacency data
        const [geoResponse, adjResponse] = await Promise.all([
          fetch('/map/regions.geojson'),
          fetch('/map/adjacency.json'),
        ]);

        const geoData = await geoResponse.json();
        const adjData = await adjResponse.json();

        // Initialize regions with ownership
        const initialRegions = createInitialOwnership(geoData.features, 'soviet');
        
        setRegions(initialRegions);
        setAdjacency(adjData);
        setMapDataLoaded(true);
      } catch (error) {
        console.error('Failed to load map data:', error);
      }
    };

    loadMapData();
  }, []);

  // Screen navigation
  const navigateToScreen = useCallback((screen: Screen) => {
    setGameState(prev => ({ ...prev, currentScreen: screen }));
  }, []);

  // Country selection
  const handleSelectCountry = useCallback((country: Country) => {
    setGameState(prev => ({
      ...prev,
      selectedCountry: country,
      currentScreen: 'main',
    }));
  }, []);

  // Game controls
  const handleTogglePlay = useCallback(() => {
    setGameState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const handleChangeSpeed = useCallback((speed: GameSpeed) => {
    setGameState(prev => ({ ...prev, gameSpeed: speed }));
  }, []);

  // Actions
  const handleCreateInfantry = useCallback(() => {
    const cost = 10;
    setGameState(prev => {
      if (prev.money >= cost) {
        return {
          ...prev,
          money: prev.money - cost,
          infantryUnits: prev.infantryUnits + 1,
        };
      }
      return prev;
    });
  }, []);

  const handleClaimMission = useCallback((missionId: string) => {
    setGameState(prev => {
      const mission = prev.missions.find(m => m.id === missionId);
      if (mission && mission.completed && !mission.claimed) {
        return {
          ...prev,
          money: prev.money + mission.rewards.money,
          missions: prev.missions.map(m =>
            m.id === missionId ? { ...m, claimed: true } : m
          ),
        };
      }
      return prev;
    });
  }, []);

  // For demo purposes, mark first mission as completed
  const handleOpenMissions = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      currentScreen: 'mission',
      // Mark first mission as completed for demo
      missions: prev.missions.map((m, index) => 
        index === 0 ? { ...m, completed: true } : m
      ),
    }));
  }, []);

  // Render current screen
  const renderScreen = () => {
    switch (gameState.currentScreen) {
      case 'title':
        return (
          <TitleScreen 
            onStartGame={() => navigateToScreen('countrySelect')} 
          />
        );
      
      case 'countrySelect':
        return (
          <CountrySelectScreen
            onSelectCountry={handleSelectCountry}
            onBack={() => navigateToScreen('title')}
          />
        );
      
      case 'main':
        if (!gameState.selectedCountry) {
          navigateToScreen('countrySelect');
          return null;
        }
        return (
          <MainScreen
            country={gameState.selectedCountry}
            dateTime={gameState.dateTime}
            isPlaying={gameState.isPlaying}
            gameSpeed={gameState.gameSpeed}
            money={gameState.money}
            income={gameState.income}
            infantryUnits={gameState.infantryUnits}
            missions={gameState.missions}
            regions={regions}
            adjacency={adjacency}
            selectedRegion={selectedRegion}
            mapDataLoaded={mapDataLoaded}
            onTogglePlay={handleTogglePlay}
            onChangeSpeed={handleChangeSpeed}
            onCreateInfantry={handleCreateInfantry}
            onOpenMissions={handleOpenMissions}
            onClaimMission={handleClaimMission}
            onRegionSelect={setSelectedRegion}
          />
        );
      
      case 'mission':
        return (
          <MissionScreen
            missions={gameState.missions}
            onBack={() => navigateToScreen('main')}
            onClaimMission={handleClaimMission}
          />
        );
      
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

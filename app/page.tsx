'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Screen, Country, GameSpeed, GameState, RegionState, Adjacency, Movement, AIState, FactionId, GameEvent, GameEventType } from './types/game';
import { initialMissions } from './data/gameData';
import { createInitialOwnership, calculateFactionIncome } from './utils/mapUtils';
import { createInitialAIState, runAITick } from './ai/cpuPlayer';
import { saveGame, loadGame, hasSaveGame, getSaveInfo } from './utils/saveLoad';
import { useAutosave } from './hooks/useAutosave';
import TitleScreen from './screens/TitleScreen';
import CountrySelectScreen from './screens/CountrySelectScreen';
import MainScreen from './screens/MainScreen';
import MissionScreen from './screens/MissionScreen';
import EventsModal from './components/EventsModal';

// Declare global window.gameAPI for programmatic control (useful for AI agents and testing)
declare global {
  interface Window {
    gameAPI?: {
      selectRegion: (regionId: string | null) => void;
      getSelectedRegion: () => string | null;
      getRegions: () => RegionState;
    };
  }
}

// Helper function to create game events
function createGameEvent(
  type: GameEventType,
  title: string,
  description: string,
  timestamp: Date,
  faction?: FactionId,
  regionId?: string
): GameEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    description,
    timestamp: new Date(timestamp),
    faction,
    regionId,
  };
}

const initialGameState: GameState = {
  currentScreen: 'title',
  selectedCountry: null,
  dateTime: new Date(1917, 10, 7), // November 7, 1917 - October Revolution
  isPlaying: false,
  gameSpeed: 1,
  money: 100,
  income: 0, // Income is now calculated dynamically based on controlled states
  infantryUnits: 0,
  missions: initialMissions,
  movingUnits: [],
  gameEvents: [],
};

export default function Home() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [regions, setRegions] = useState<RegionState>({});
  const [adjacency, setAdjacency] = useState<Adjacency>({});
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedUnitRegion, setSelectedUnitRegion] = useState<string | null>(null);
  const [mapDataLoaded, setMapDataLoaded] = useState(false);
  const [aiState, setAIState] = useState<AIState | null>(null);
  const [isEventsModalOpen, setIsEventsModalOpen] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [saveInfo, setSaveInfo] = useState<{ savedAt: Date; gameDate: Date } | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  
  // Ref to store pending region updates from completed movements
  const pendingRegionUpdatesRef = useRef<Movement[]>([]);
  // Track which movement IDs have been queued for processing to prevent double-processing
  const processedMovementIdsRef = useRef<Set<string>>(new Set());
  // Ref to store pending game events from combat
  const pendingEventsRef = useRef<GameEvent[]>([]);

  // Check for existing save on mount
  useEffect(() => {
    setHasSave(hasSaveGame());
    setSaveInfo(getSaveInfo());
  }, []);

  // Expose game API on window for programmatic control (AI agents, testing, automation)
  useEffect(() => {
    window.gameAPI = {
      selectRegion: (regionId: string | null) => {
        if (regionId === null) {
          setSelectedRegion(null);
          setSelectedUnitRegion(null);
          return;
        }
        // Validate region exists
        if (regions[regionId]) {
          setSelectedRegion(regionId);
          // If this region has units owned by player, also select as unit
          const region = regions[regionId];
          if (region && region.owner === gameState.selectedCountry?.id && region.units > 0) {
            setSelectedUnitRegion(regionId);
          } else {
            setSelectedUnitRegion(null);
          }
        } else {
          console.warn(`[gameAPI] Region "${regionId}" not found`);
        }
      },
      getSelectedRegion: () => selectedRegion,
      getRegions: () => regions,
    };

    return () => {
      delete window.gameAPI;
    };
  }, [regions, selectedRegion, gameState.selectedCountry?.id]);

  // Autosave callback
  const handleAutosave = useCallback(() => {
    setLastSaveTime(new Date());
    setSaveInfo(getSaveInfo());
    setHasSave(true);
  }, []);

  // Autosave hook - saves every game day
  useAutosave(gameState, regions, aiState, handleAutosave);

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
        const initialRegions = createInitialOwnership(geoData.features);
        
        setRegions(initialRegions);
        setAdjacency(adjData);
        setMapDataLoaded(true);
      } catch (error) {
        console.error('Failed to load map data:', error);
      }
    };

    loadMapData();
  }, []);

  // Process pending region updates from completed movements
  const processPendingMovements = useCallback(() => {
    if (pendingRegionUpdatesRef.current.length === 0) return;
    
    const movements = [...pendingRegionUpdatesRef.current];
    pendingRegionUpdatesRef.current = [];
    
    // Clean up processed IDs for these movements
    movements.forEach(m => processedMovementIdsRef.current.delete(m.id));
    
    setRegions(prev => {
      const newRegions = { ...prev };
      
      movements.forEach(movement => {
        const { toRegion, count, owner, fromRegion, arrivalTime } = movement;
        const to = newRegions[toRegion];
        
        if (!to) return;

        if (to.owner === owner) {
          // Friendly move
          newRegions[toRegion] = {
            ...to,
            units: to.units + count,
          };
        } else {
          // Combat
          const attackerUnits = count;
          const defenderUnits = to.units;
          const defendingFaction = to.owner;
          const regionName = to.name;
          
          if (attackerUnits > defenderUnits) {
            // Attacker wins - region captured
            newRegions[toRegion] = {
              ...to,
              owner: owner,
              units: attackerUnits - defenderUnits,
            };
            
            // Create events for the battle
            pendingEventsRef.current.push(
              createGameEvent(
                'region_captured',
                `${regionName} Captured!`,
                `${owner === 'soviet' ? 'Soviet' : 'White'} forces captured ${regionName} from ${defendingFaction === 'soviet' ? 'Soviet' : defendingFaction === 'white' ? 'White' : 'neutral'} forces. ${attackerUnits} attackers defeated ${defenderUnits} defenders.`,
                arrivalTime,
                owner,
                toRegion
              )
            );
          } else if (attackerUnits < defenderUnits) {
            // Defender wins
            newRegions[toRegion] = {
              ...to,
              units: defenderUnits - attackerUnits,
            };
            
            // Create defeat event
            pendingEventsRef.current.push(
              createGameEvent(
                'combat_defeat',
                `Attack on ${regionName} Failed`,
                `${owner === 'soviet' ? 'Soviet' : 'White'} attack on ${regionName} was repelled. ${attackerUnits} attackers lost against ${defenderUnits} defenders.`,
                arrivalTime,
                owner,
                toRegion
              )
            );
          } else {
            // Tie - mutually assured destruction
            newRegions[toRegion] = {
              ...to,
              units: 0,
            };
            
            pendingEventsRef.current.push(
              createGameEvent(
                'combat_defeat',
                `Pyrrhic Battle at ${regionName}`,
                `Both attacking and defending forces were destroyed in the battle for ${regionName}. Neither side emerged victorious.`,
                arrivalTime,
                owner,
                toRegion
              )
            );
          }
        }
      });
      
      return newRegions;
    });
    
    // Process pending events
    if (pendingEventsRef.current.length > 0) {
      const newEvents = [...pendingEventsRef.current];
      pendingEventsRef.current = [];
      
      setGameState(prev => ({
        ...prev,
        gameEvents: [...prev.gameEvents, ...newEvents],
      }));
    }
  }, []);

  // Game time progression
  useEffect(() => {
    if (!gameState.isPlaying) return;

    // Time advances based on game speed
    // Speed 1 = 1 hour per second, Speed 5 = 5 hours per second
    const msPerHour = 1000 / gameState.gameSpeed;
    
    const interval = setInterval(() => {
      // Calculate player income based on controlled states (1 money per state per hour)
      const playerFaction = gameState.selectedCountry?.id;
      const playerIncome = playerFaction ? calculateFactionIncome(regions, playerFaction) : 0;
      
      setGameState(prev => {
        const newDate = new Date(prev.dateTime);
        newDate.setHours(newDate.getHours() + 1);
        
        // Add income every hour (based on controlled states)
        const newMoney = prev.money + playerIncome;
        
        // Process unit movements
        const remainingMovements: Movement[] = [];

        prev.movingUnits.forEach(movement => {
          if (newDate >= movement.arrivalTime) {
            // Only queue if not already processed (prevents double-processing)
            if (!processedMovementIdsRef.current.has(movement.id)) {
              processedMovementIdsRef.current.add(movement.id);
              pendingRegionUpdatesRef.current.push(movement);
            }
          } else {
            remainingMovements.push(movement);
          }
        });
        
        return {
          ...prev,
          dateTime: newDate,
          money: newMoney,
          income: playerIncome, // Update displayed income
          movingUnits: remainingMovements,
        };
      });
      
      // Process any completed movements after state update
      processPendingMovements();
      
      // Run AI logic
      if (aiState) {
        setRegions(currentRegions => {
          const aiActions = runAITick(aiState, currentRegions);
          
          // Update AI state
          setAIState(aiActions.updatedAIState);
          
          // Apply deployments to regions
          if (aiActions.deployments.length > 0) {
            const newRegions = { ...currentRegions };
            aiActions.deployments.forEach(deployment => {
              if (newRegions[deployment.regionId]) {
                newRegions[deployment.regionId] = {
                  ...newRegions[deployment.regionId],
                  units: newRegions[deployment.regionId].units + deployment.count,
                };
              }
            });
            return newRegions;
          }
          
          return currentRegions;
        });
      }
    }, msPerHour);

    return () => clearInterval(interval);
  }, [gameState.isPlaying, gameState.gameSpeed, gameState.selectedCountry, regions, processPendingMovements, aiState]);

  // Update income when regions or selected country changes
  useEffect(() => {
    if (!gameState.selectedCountry || Object.keys(regions).length === 0) return;
    
    const newIncome = calculateFactionIncome(regions, gameState.selectedCountry.id);
    setGameState(prev => ({
      ...prev,
      income: newIncome,
    }));
  }, [regions, gameState.selectedCountry]);

  // Screen navigation
  const navigateToScreen = useCallback((screen: Screen) => {
    setGameState(prev => ({ ...prev, currentScreen: screen }));
  }, []);

  // Country selection
  const handleSelectCountry = useCallback((country: Country) => {
    // Determine the AI faction (opposite of player's choice)
    const aiFaction: FactionId = country.id === 'soviet' ? 'white' : 'soviet';
    setAIState(createInitialAIState(aiFaction));
    
    // Filter missions by selected faction
    const factionMissions = initialMissions.filter(m => m.faction === country.id);
    
    setGameState(prev => ({
      ...prev,
      selectedCountry: country,
      currentScreen: 'main',
      missions: factionMissions,
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
        const newEvent = createGameEvent(
          'unit_created',
          'Infantry Unit Trained',
          `A new infantry unit has been trained for $${cost}. Ready for deployment.`,
          prev.dateTime,
          prev.selectedCountry?.id
        );
        return {
          ...prev,
          money: prev.money - cost,
          infantryUnits: prev.infantryUnits + 1,
          gameEvents: [...prev.gameEvents, newEvent],
        };
      }
      return prev;
    });
  }, []);

  // Deploy unit to selected region
  const handleDeployUnit = useCallback(() => {
    if (!selectedRegion || gameState.infantryUnits <= 0) return;
    
    const region = regions[selectedRegion];
    if (!region) return;
    
    // Can only deploy to regions you control
    if (region.owner !== gameState.selectedCountry?.id) return;
    
    const regionName = region.name;
    
    setGameState(prev => {
      const newEvent = createGameEvent(
        'unit_deployed',
        `Unit Deployed to ${regionName}`,
        `An infantry unit has been deployed to ${regionName}.`,
        prev.dateTime,
        prev.selectedCountry?.id,
        selectedRegion
      );
      return {
        ...prev,
        infantryUnits: prev.infantryUnits - 1,
        gameEvents: [...prev.gameEvents, newEvent],
      };
    });
    
    setRegions(prev => ({
      ...prev,
      [selectedRegion]: {
        ...prev[selectedRegion],
        units: prev[selectedRegion].units + 1,
      },
    }));
  }, [selectedRegion, gameState.infantryUnits, gameState.selectedCountry?.id, regions]);

  // Move units between regions - now creates a movement order with travel time
  const handleMoveUnits = useCallback((fromRegion: string, toRegion: string, count: number) => {
    if (!adjacency[fromRegion]?.includes(toRegion)) return;
    
    const from = regions[fromRegion];
    const to = regions[toRegion];
    if (!from || !to) return;
    if (from.units < count) return;
    
    const selectedCountry = gameState.selectedCountry;
    if (!selectedCountry) return;
    
    // Can only move from your own regions
    if (from.owner !== selectedCountry.id) return;
    
    // Remove units from source region immediately
    setRegions(prev => ({
      ...prev,
      [fromRegion]: {
        ...prev[fromRegion],
        units: prev[fromRegion].units - count,
      },
    }));
    
    // Create a movement order - units arrive after travel time (6 hours for now)
    const travelTimeHours = 6;
    const departureTime = new Date(gameState.dateTime);
    const arrivalTime = new Date(gameState.dateTime);
    arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);
    
    const newMovement: Movement = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromRegion,
      toRegion,
      count,
      departureTime,
      arrivalTime,
      owner: selectedCountry.id,
    };
    
    setGameState(prev => ({
      ...prev,
      movingUnits: [...prev.movingUnits, newMovement],
    }));
  }, [adjacency, regions, gameState.selectedCountry, gameState.dateTime]);

  const handleClaimMission = useCallback((missionId: string) => {
    setGameState(prev => {
      const mission = prev.missions.find(m => m.id === missionId);
      if (mission && mission.completed && !mission.claimed) {
        const events: GameEvent[] = [];
        
        // Create mission claimed event
        events.push(createGameEvent(
          'mission_claimed',
          `Mission Completed: ${mission.name}`,
          `Reward of $${mission.rewards.money} claimed for completing "${mission.name}".`,
          prev.dateTime,
          prev.selectedCountry?.id
        ));
        
        // Check for game victory
        if (mission.rewards.gameVictory) {
          events.push(createGameEvent(
            'game_victory',
            'Victory!',
            `${prev.selectedCountry?.name} has achieved total victory in the Russian Civil War!`,
            prev.dateTime,
            prev.selectedCountry?.id
          ));
        }
        
        return {
          ...prev,
          money: prev.money + mission.rewards.money,
          missions: prev.missions.map(m =>
            m.id === missionId ? { ...m, claimed: true } : m
          ),
          gameEvents: [...prev.gameEvents, ...events],
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

  // Events modal handlers
  const handleOpenEventsModal = useCallback(() => {
    setIsEventsModalOpen(true);
  }, []);

  const handleCloseEventsModal = useCallback(() => {
    setIsEventsModalOpen(false);
  }, []);

  // Save game handler
  const handleSaveGame = useCallback(() => {
    const success = saveGame(gameState, regions, aiState);
    if (success) {
      setLastSaveTime(new Date());
      setSaveInfo(getSaveInfo());
      setHasSave(true);
    }
  }, [gameState, regions, aiState]);

  // Continue game handler (load from title screen)
  const handleContinueGame = useCallback(async () => {
    const saved = loadGame();
    if (!saved) return;

    // Load map data first if not already loaded
    if (!mapDataLoaded) {
      try {
        const [geoResponse, adjResponse] = await Promise.all([
          fetch('/map/regions.geojson'),
          fetch('/map/adjacency.json'),
        ]);
        const geoData = await geoResponse.json();
        const adjData = await adjResponse.json();
        setAdjacency(adjData);
        setMapDataLoaded(true);
      } catch (error) {
        console.error('Failed to load map data:', error);
        return;
      }
    }

    // Restore saved state (always start paused)
    setGameState({
      ...saved.gameState,
      isPlaying: false,
      currentScreen: 'main',
    });
    setRegions(saved.regions);
    setAIState(saved.aiState);
  }, [mapDataLoaded]);

  // Render current screen
  const renderScreen = () => {
    switch (gameState.currentScreen) {
      case 'title':
        return (
          <TitleScreen 
            onStartGame={() => navigateToScreen('countrySelect')}
            onContinue={handleContinueGame}
            hasSave={hasSave}
            saveInfo={saveInfo}
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
            movingUnits={gameState.movingUnits}
            regions={regions}
            adjacency={adjacency}
            selectedRegion={selectedRegion}
            selectedUnitRegion={selectedUnitRegion}
            mapDataLoaded={mapDataLoaded}
            gameEvents={gameState.gameEvents}
            onTogglePlay={handleTogglePlay}
            onChangeSpeed={handleChangeSpeed}
            onCreateInfantry={handleCreateInfantry}
            onOpenMissions={handleOpenMissions}
            onOpenEvents={handleOpenEventsModal}
            onClaimMission={handleClaimMission}
            onRegionSelect={setSelectedRegion}
            onUnitSelect={setSelectedUnitRegion}
            onDeployUnit={handleDeployUnit}
            onMoveUnits={handleMoveUnits}
            onSaveGame={handleSaveGame}
            lastSaveTime={lastSaveTime}
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
      <EventsModal
        isOpen={isEventsModalOpen}
        onClose={handleCloseEventsModal}
        events={gameState.gameEvents}
      />
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Screen, Country, GameSpeed, GameState, RegionState, Adjacency, Movement, AIState, FactionId, GameEvent, GameEventType, Division } from './types/game';
import { initialMissions } from './data/gameData';
import { createInitialOwnership } from './utils/mapUtils';
import { createInitialAIState, runAITick } from './ai/cpuPlayer';
import { createDivision, resolveCombat, getDivisionCount } from './utils/combat';
import TitleScreen from './screens/TitleScreen';
import CountrySelectScreen from './screens/CountrySelectScreen';
import MainScreen from './screens/MainScreen';
import MissionScreen from './screens/MissionScreen';
import EventsModal from './components/EventsModal';

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
  income: 5,
  reserveDivisions: [],
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
  
  // Ref to store pending region updates from completed movements
  const pendingRegionUpdatesRef = useRef<Movement[]>([]);
  // Track which movement IDs have been queued for processing to prevent double-processing
  const processedMovementIdsRef = useRef<Set<string>>(new Set());
  // Ref to store pending game events from combat
  const pendingEventsRef = useRef<GameEvent[]>([]);

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
        const { toRegion, divisions, owner, arrivalTime } = movement;
        const to = newRegions[toRegion];
        
        if (!to) return;

        if (to.owner === owner) {
          // Friendly move - add divisions to region
          newRegions[toRegion] = {
            ...to,
            divisions: [...to.divisions, ...divisions],
          };
        } else {
          // Combat!
          const attackerDivisions = divisions;
          const defenderDivisions = to.divisions;
          const defendingFaction = to.owner;
          const regionName = to.name;
          
          // Resolve combat using the combat system
          const result = resolveCombat(attackerDivisions, defenderDivisions);
          
          if (result.regionCaptured) {
            // Attacker wins - region captured
            newRegions[toRegion] = {
              ...to,
              owner: owner,
              divisions: result.attackerDivisions,
            };
            
            // Create events for the battle
            pendingEventsRef.current.push(
              createGameEvent(
                'region_captured',
                `${regionName} Captured!`,
                `${owner === 'soviet' ? 'Soviet' : 'White'} forces captured ${regionName} from ${defendingFaction === 'soviet' ? 'Soviet' : defendingFaction === 'white' ? 'White' : 'neutral'} forces. ${attackerDivisions.length} divisions attacked, ${result.attackerCasualties} lost. Defenders lost ${result.defenderCasualties} divisions.`,
                arrivalTime,
                owner,
                toRegion
              )
            );
          } else if (result.defenderDivisions.length > 0) {
            // Defender wins - attacker repelled
            newRegions[toRegion] = {
              ...to,
              divisions: result.defenderDivisions,
            };
            
            // Create defeat event
            pendingEventsRef.current.push(
              createGameEvent(
                'combat_defeat',
                `Attack on ${regionName} Failed`,
                `${owner === 'soviet' ? 'Soviet' : 'White'} attack on ${regionName} was repelled. ${attackerDivisions.length} attacking divisions lost ${result.attackerCasualties}. Defenders lost ${result.defenderCasualties} divisions.`,
                arrivalTime,
                owner,
                toRegion
              )
            );
          } else {
            // Both sides destroyed
            newRegions[toRegion] = {
              ...to,
              divisions: [],
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
      setGameState(prev => {
        const newDate = new Date(prev.dateTime);
        newDate.setHours(newDate.getHours() + 1);
        
        // Add income every hour
        const newMoney = prev.money + prev.income;
        
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
                  divisions: [...newRegions[deployment.regionId].divisions, ...deployment.divisions],
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
  }, [gameState.isPlaying, gameState.gameSpeed, processPendingMovements, aiState]);

  // Screen navigation
  const navigateToScreen = useCallback((screen: Screen) => {
    setGameState(prev => ({ ...prev, currentScreen: screen }));
  }, []);

  // Country selection
  const handleSelectCountry = useCallback((country: Country) => {
    // Determine the AI faction (opposite of player's choice)
    const aiFaction: FactionId = country.id === 'soviet' ? 'white' : 'soviet';
    setAIState(createInitialAIState(aiFaction));
    
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

  // Actions - create a new division
  const handleCreateInfantry = useCallback(() => {
    const cost = 10;
    setGameState(prev => {
      if (prev.money >= cost && prev.selectedCountry) {
        const divisionNumber = prev.reserveDivisions.length + 1;
        const divisionName = `${prev.selectedCountry.id === 'soviet' ? 'Red' : 'White'} Guard ${divisionNumber}${getOrdinalSuffix(divisionNumber)} Division`;
        const newDivision = createDivision(prev.selectedCountry.id, divisionName);
        
        const newEvent = createGameEvent(
          'unit_created',
          'Division Trained',
          `${divisionName} has been trained for $${cost}. HP: ${newDivision.hp}, Attack: ${newDivision.attack}, Defence: ${newDivision.defence}. Ready for deployment.`,
          prev.dateTime,
          prev.selectedCountry.id
        );
        return {
          ...prev,
          money: prev.money - cost,
          reserveDivisions: [...prev.reserveDivisions, newDivision],
          gameEvents: [...prev.gameEvents, newEvent],
        };
      }
      return prev;
    });
  }, []);

  // Deploy division to selected region
  const handleDeployUnit = useCallback(() => {
    if (!selectedRegion || gameState.reserveDivisions.length <= 0) return;
    
    const region = regions[selectedRegion];
    if (!region) return;
    
    // Can only deploy to regions you control
    if (region.owner !== gameState.selectedCountry?.id) return;
    
    const regionName = region.name;
    
    // Get the first division from reserve
    const divisionToDeploy = gameState.reserveDivisions[0];
    
    setGameState(prev => {
      const newEvent = createGameEvent(
        'unit_deployed',
        `Division Deployed to ${regionName}`,
        `${divisionToDeploy.name} has been deployed to ${regionName}.`,
        prev.dateTime,
        prev.selectedCountry?.id,
        selectedRegion
      );
      return {
        ...prev,
        reserveDivisions: prev.reserveDivisions.slice(1),
        gameEvents: [...prev.gameEvents, newEvent],
      };
    });
    
    setRegions(prev => ({
      ...prev,
      [selectedRegion]: {
        ...prev[selectedRegion],
        divisions: [...prev[selectedRegion].divisions, divisionToDeploy],
      },
    }));
  }, [selectedRegion, gameState.reserveDivisions, gameState.selectedCountry?.id, regions]);

  // Move divisions between regions - now creates a movement order with travel time
  const handleMoveUnits = useCallback((fromRegion: string, toRegion: string, count: number) => {
    if (!adjacency[fromRegion]?.includes(toRegion)) return;
    
    const from = regions[fromRegion];
    const to = regions[toRegion];
    if (!from || !to) return;
    if (from.divisions.length < count) return;
    
    const selectedCountry = gameState.selectedCountry;
    if (!selectedCountry) return;
    
    // Can only move from your own regions
    if (from.owner !== selectedCountry.id) return;
    
    // Get divisions to move (take first 'count' divisions)
    const divisionsToMove = from.divisions.slice(0, count);
    
    // Remove divisions from source region immediately
    setRegions(prev => ({
      ...prev,
      [fromRegion]: {
        ...prev[fromRegion],
        divisions: prev[fromRegion].divisions.slice(count),
      },
    }));
    
    // Create a movement order - divisions arrive after travel time (6 hours for now)
    const travelTimeHours = 6;
    const departureTime = new Date(gameState.dateTime);
    const arrivalTime = new Date(gameState.dateTime);
    arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);
    
    const newMovement: Movement = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromRegion,
      toRegion,
      divisions: divisionsToMove,
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
        const newEvent = createGameEvent(
          'mission_claimed',
          `Mission Completed: ${mission.name}`,
          `Reward of $${mission.rewards.money} claimed for completing "${mission.name}".`,
          prev.dateTime,
          prev.selectedCountry?.id
        );
        return {
          ...prev,
          money: prev.money + mission.rewards.money,
          missions: prev.missions.map(m =>
            m.id === missionId ? { ...m, claimed: true } : m
          ),
          gameEvents: [...prev.gameEvents, newEvent],
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
            reserveDivisions={gameState.reserveDivisions}
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

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

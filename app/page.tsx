'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Screen, Country, GameSpeed, GameState, RegionState, Adjacency, Movement, AIState, FactionId, GameEvent, GameEventType, Division } from './types/game';
import { initialMissions } from './data/gameData';
import { createInitialOwnership } from './utils/mapUtils';
import { createInitialAIState, runAITick } from './ai/cpuPlayer';
import { createDivision, resolveCombat, getDivisionCount, createActiveCombat, processCombatRound, shouldProcessCombatRound } from './utils/combat';
import TitleScreen from './screens/TitleScreen';
import CountrySelectScreen from './screens/CountrySelectScreen';
import MainScreen from './screens/MainScreen';
import MissionScreen from './screens/MissionScreen';
import EventsModal from './components/EventsModal';
import CombatPopup from './components/CombatPopup';

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
  activeCombats: [],
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
  const [selectedCombatId, setSelectedCombatId] = useState<string | null>(null);
  
  // Ref to store pending region updates from completed movements
  const pendingRegionUpdatesRef = useRef<Movement[]>([]);
  // Track which movement IDs have been queued for processing to prevent double-processing
  const processedMovementIdsRef = useRef<Set<string>>(new Set());
  // Ref to store pending game events from combat
  const pendingEventsRef = useRef<GameEvent[]>([]);
  // Ref to store new active combats to be added
  const pendingCombatsRef = useRef<import('./types/game').ActiveCombat[]>([]);

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
          // Combat! Create an active combat instead of instant resolution
          const attackerDivisions = divisions;
          const defenderDivisions = to.divisions;
          
          if (defenderDivisions.length === 0) {
            // Undefended region - capture immediately
            newRegions[toRegion] = {
              ...to,
              owner: owner,
              divisions: attackerDivisions,
            };
            
            pendingEventsRef.current.push(
              createGameEvent(
                'region_captured',
                `${to.name} Captured!`,
                `${owner === 'soviet' ? 'Soviet' : 'White'} forces captured the undefended region of ${to.name}.`,
                arrivalTime,
                owner,
                toRegion
              )
            );
          } else {
            // Create active combat - divisions will fight over time
            const newCombat = createActiveCombat(
              toRegion,
              to.name,
              owner,
              to.owner,
              attackerDivisions,
              defenderDivisions,
              arrivalTime
            );
            pendingCombatsRef.current.push(newCombat);
            
            // Remove defenders from region temporarily (they're now in combat)
            newRegions[toRegion] = {
              ...to,
              divisions: [],
            };
            
            pendingEventsRef.current.push(
              createGameEvent(
                'combat_victory', // Using this as 'combat_started' would need a new event type
                `Battle for ${to.name} Begins!`,
                `${owner === 'soviet' ? 'Soviet' : 'White'} forces (${attackerDivisions.length} divisions) are attacking ${to.owner === 'soviet' ? 'Soviet' : 'White'} defenders (${defenderDivisions.length} divisions) at ${to.name}.`,
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
    
    // Process pending events and combats
    setGameState(prev => {
      const newEvents = [...pendingEventsRef.current];
      pendingEventsRef.current = [];
      
      const newCombats = [...pendingCombatsRef.current];
      pendingCombatsRef.current = [];
      
      return {
        ...prev,
        gameEvents: [...prev.gameEvents, ...newEvents],
        activeCombats: [...prev.activeCombats, ...newCombats],
      };
    });
  }, []);

  // Process active combats - resolve rounds and handle completed battles
  const processActiveCombats = useCallback((currentTime: Date) => {
    setGameState(prev => {
      let hasChanges = false;
      const updatedCombats: import('./types/game').ActiveCombat[] = [];
      const completedCombats: import('./types/game').ActiveCombat[] = [];
      const newEvents: GameEvent[] = [];
      
      for (const combat of prev.activeCombats) {
        if (combat.isComplete) {
          completedCombats.push(combat);
          continue;
        }
        
        if (shouldProcessCombatRound(combat, currentTime)) {
          hasChanges = true;
          const updatedCombat = processCombatRound({
            ...combat,
            lastRoundTime: new Date(currentTime),
          });
          
          if (updatedCombat.isComplete) {
            completedCombats.push(updatedCombat);
            
            // Create event for combat completion
            const attackerWon = updatedCombat.victor === updatedCombat.attackerFaction;
            const attackerLosses = updatedCombat.initialAttackerCount - updatedCombat.attackerDivisions.length;
            const defenderLosses = updatedCombat.initialDefenderCount - updatedCombat.defenderDivisions.length;
            
            newEvents.push(
              createGameEvent(
                attackerWon ? 'region_captured' : 'combat_defeat',
                attackerWon ? `${updatedCombat.regionName} Captured!` : `Battle for ${updatedCombat.regionName} Lost`,
                `${updatedCombat.attackerFaction === 'soviet' ? 'Soviet' : 'White'} forces ${attackerWon ? 'captured' : 'failed to capture'} ${updatedCombat.regionName}. Attackers lost ${attackerLosses} divisions. Defenders lost ${defenderLosses} divisions.`,
                currentTime,
                updatedCombat.attackerFaction,
                updatedCombat.regionId
              )
            );
          } else {
            updatedCombats.push(updatedCombat);
          }
        } else {
          updatedCombats.push(combat);
        }
      }
      
      if (!hasChanges && completedCombats.length === 0) {
        return prev;
      }
      
      // Update regions based on completed combats
      if (completedCombats.length > 0) {
        setRegions(currentRegions => {
          const newRegions = { ...currentRegions };
          
          for (const combat of completedCombats) {
            const region = newRegions[combat.regionId];
            if (!region) continue;
            
            if (combat.victor === combat.attackerFaction) {
              // Attacker won - transfer ownership and surviving attackers
              newRegions[combat.regionId] = {
                ...region,
                owner: combat.attackerFaction,
                divisions: combat.attackerDivisions,
              };
            } else if (combat.victor === combat.defenderFaction) {
              // Defender won - restore surviving defenders
              newRegions[combat.regionId] = {
                ...region,
                divisions: combat.defenderDivisions,
              };
            } else {
              // Stalemate - surviving defenders stay, attackers retreat (lost)
              newRegions[combat.regionId] = {
                ...region,
                divisions: combat.defenderDivisions,
              };
            }
          }
          
          return newRegions;
        });
      }
      
      return {
        ...prev,
        activeCombats: updatedCombats,
        gameEvents: [...prev.gameEvents, ...newEvents],
      };
    });
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
      
      // Process active combats (need to get current time from state)
      setGameState(currentState => {
        processActiveCombats(currentState.dateTime);
        return currentState;
      });
      
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
  }, [gameState.isPlaying, gameState.gameSpeed, processPendingMovements, processActiveCombats, aiState]);

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
            activeCombats={gameState.activeCombats}
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
            onSelectCombat={setSelectedCombatId}
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

  // Get the selected combat for the popup
  const selectedCombat = selectedCombatId 
    ? gameState.activeCombats.find(c => c.id === selectedCombatId) 
    : null;

  return (
    <div className="min-h-screen w-full">
      {renderScreen()}
      <EventsModal
        isOpen={isEventsModalOpen}
        onClose={handleCloseEventsModal}
        events={gameState.gameEvents}
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

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  GameState, 
  RegionState, 
  Adjacency, 
  AIState, 
  Screen, 
  Country, 
  GameSpeed, 
  FactionId, 
  Movement,
  ActiveCombat,
  GameEvent
} from '../types/game';
import { initialMissions, GAME_START_DATE } from '../data/gameData';
import { calculateFactionIncome } from '../utils/mapUtils';
import { createInitialAIState, runAITick } from '../ai/cpuPlayer';
import { createDivision, createActiveCombat, processCombatRound, shouldProcessCombatRound } from '../utils/combat';
import { createGameEvent, getOrdinalSuffix } from '../utils/eventUtils';

interface GameStore extends GameState {
  // Additional UI State
  regions: RegionState;
  adjacency: Adjacency;
  selectedRegion: string | null;
  selectedUnitRegion: string | null;
  mapDataLoaded: boolean;
  aiState: AIState | null;
  isEventsModalOpen: boolean;
  selectedCombatId: string | null;
  lastSaveTime: Date | null;

  // Actions
  setRegions: (regions: RegionState) => void;
  setAdjacency: (adjacency: Adjacency) => void;
  setMapDataLoaded: (loaded: boolean) => void;
  setSelectedRegion: (regionId: string | null) => void;
  setSelectedUnitRegion: (regionId: string | null) => void;
  setIsEventsModalOpen: (isOpen: boolean) => void;
  setSelectedCombatId: (combatId: string | null) => void;
  
  // Game Control Actions
  navigateToScreen: (screen: Screen) => void;
  selectCountry: (country: Country) => void;
  togglePlay: () => void;
  setGameSpeed: (speed: GameSpeed) => void;
  
  // Game Logic Actions
  tick: () => void;
  createInfantry: () => void;
  deployUnit: () => void;
  moveUnits: (fromRegion: string, toRegion: string, count: number) => void;
  claimMission: (missionId: string) => void;
  openMissions: () => void;
  
  // Persistence Actions
  saveGame: () => void;
  loadGame: (savedData: { gameState: GameState; regions: RegionState; aiState: AIState | null }) => void;
}

const initialGameState: GameState = {
  currentScreen: 'title',
  selectedCountry: null,
  dateTime: new Date(GAME_START_DATE),
  isPlaying: false,
  gameSpeed: 1,
  money: 100,
  income: 0,
  reserveDivisions: [],
  missions: initialMissions,
  movingUnits: [],
  gameEvents: [],
  activeCombats: [],
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialGameState,
      regions: {},
      adjacency: {},
      selectedRegion: null,
      selectedUnitRegion: null,
      mapDataLoaded: false,
      aiState: null,
      isEventsModalOpen: false,
      selectedCombatId: null,
      lastSaveTime: null,

      setRegions: (regions) => set({ regions }),
      setAdjacency: (adjacency) => set({ adjacency }),
      setMapDataLoaded: (loaded) => set({ mapDataLoaded: loaded }),
      setSelectedRegion: (regionId) => {
        const { regions, selectedCountry } = get();
        set({ selectedRegion: regionId });
        
        if (regionId && regions[regionId]) {
          const region = regions[regionId];
          if (region.owner === selectedCountry?.id && region.divisions.length > 0) {
            set({ selectedUnitRegion: regionId });
          } else {
            set({ selectedUnitRegion: null });
          }
        } else {
          set({ selectedUnitRegion: null });
        }
      },
      setSelectedUnitRegion: (regionId) => set({ selectedUnitRegion: regionId }),
      setIsEventsModalOpen: (isOpen) => set({ isEventsModalOpen: isOpen }),
      setSelectedCombatId: (combatId) => set({ selectedCombatId: combatId }),

      navigateToScreen: (screen) => set({ currentScreen: screen }),
      
      selectCountry: (country) => {
        const aiFaction: FactionId = country.id === 'soviet' ? 'white' : 'soviet';
        const factionMissions = initialMissions.filter(m => m.faction === country.id);
        
        set({
          selectedCountry: country,
          currentScreen: 'main',
          missions: factionMissions,
          aiState: createInitialAIState(aiFaction),
        });
      },

      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      
      setGameSpeed: (speed) => set({ gameSpeed: speed }),

      tick: () => {
        const state = get();
        if (!state.isPlaying) return;

        const { dateTime, selectedCountry, regions, movingUnits, activeCombats, money, aiState, gameEvents } = state;
        
        const playerFaction = selectedCountry?.id;
        const playerIncome = playerFaction ? calculateFactionIncome(regions, playerFaction) : 0;
        
        const newDate = new Date(dateTime);
        newDate.setHours(newDate.getHours() + 1);
        
        const newMoney = money + playerIncome;
        
        // Process unit movements
        const remainingMovements: Movement[] = [];
        const completedMovements: Movement[] = [];

        movingUnits.forEach(movement => {
          if (newDate >= movement.arrivalTime) {
            completedMovements.push(movement);
          } else {
            remainingMovements.push(movement);
          }
        });

        // Process active combats
        const updatedCombats: ActiveCombat[] = [];
        const finishedCombats: ActiveCombat[] = [];
        const newCombatEvents: GameEvent[] = [];

        activeCombats.forEach(combat => {
          if (combat.isComplete) {
            finishedCombats.push(combat);
            return;
          }

          if (shouldProcessCombatRound(combat, newDate)) {
            const updatedCombat = processCombatRound({
              ...combat,
              lastRoundTime: new Date(newDate),
            });

            if (updatedCombat.isComplete) {
              finishedCombats.push(updatedCombat);
              
              const attackerWon = updatedCombat.victor === updatedCombat.attackerFaction;
              const attackerLosses = updatedCombat.initialAttackerCount - updatedCombat.attackerDivisions.length;
              const defenderLosses = updatedCombat.initialDefenderCount - updatedCombat.defenderDivisions.length;
              
              newCombatEvents.push(createGameEvent(
                attackerWon ? 'region_captured' : 'combat_defeat',
                attackerWon ? `${updatedCombat.regionName} Captured!` : `Battle for ${updatedCombat.regionName} Lost`,
                `${updatedCombat.attackerFaction === 'soviet' ? 'Soviet' : 'White'} forces ${attackerWon ? 'captured' : 'failed to capture'} ${updatedCombat.regionName}. Attackers lost ${attackerLosses} divisions. Defenders lost ${defenderLosses} divisions.`,
                newDate,
                updatedCombat.attackerFaction,
                updatedCombat.regionId
              ));
            } else {
              updatedCombats.push(updatedCombat);
            }
          } else {
            updatedCombats.push(combat);
          }
        });

        // Apply completed movements and combats to regions
        const nextRegions = { ...regions };
        const nextCombats = [...updatedCombats];
        const nextEvents = [...gameEvents, ...newCombatEvents];

        // Apply Movements
        completedMovements.forEach(movement => {
          const { toRegion, divisions, owner } = movement;
          const to = nextRegions[toRegion];
          if (!to) return;

          if (to.owner === owner) {
            nextRegions[toRegion] = {
              ...to,
              divisions: [...to.divisions, ...divisions],
            };
          } else {
            const defenderDivisions = to.divisions;
            if (defenderDivisions.length === 0) {
              nextRegions[toRegion] = {
                ...to,
                owner: owner,
                divisions: divisions,
              };
              nextEvents.push(createGameEvent(
                'region_captured',
                `${to.name} Captured!`,
                `${owner === 'soviet' ? 'Soviet' : 'White'} forces captured the undefended region of ${to.name}.`,
                newDate,
                owner,
                toRegion
              ));
            } else {
              const newCombat = createActiveCombat(
                toRegion,
                to.name,
                owner,
                to.owner,
                divisions,
                defenderDivisions,
                newDate
              );
              nextCombats.push(newCombat);
              nextRegions[toRegion] = { ...to, divisions: [] };
              nextEvents.push(createGameEvent(
                'combat_victory',
                `Battle for ${to.name} Begins!`,
                `${owner === 'soviet' ? 'Soviet' : 'White'} forces (${divisions.length} divisions) are attacking ${to.owner === 'soviet' ? 'Soviet' : 'White'} defenders (${defenderDivisions.length} divisions) at ${to.name}.`,
                newDate,
                owner,
                toRegion
              ));
            }
          }
        });

        // Apply Finished Combats
        finishedCombats.forEach(combat => {
          const region = nextRegions[combat.regionId];
          if (!region) return;

          if (combat.victor === combat.attackerFaction) {
            nextRegions[combat.regionId] = {
              ...region,
              owner: combat.attackerFaction,
              divisions: combat.attackerDivisions,
            };
          } else {
            nextRegions[combat.regionId] = {
              ...region,
              divisions: combat.defenderDivisions,
            };
          }
        });

        // AI Tick
        let nextAIState = aiState;
        if (aiState) {
          const aiActions = runAITick(aiState, nextRegions);
          nextAIState = aiActions.updatedAIState;
          
          if (aiActions.deployments.length > 0) {
            aiActions.deployments.forEach(deployment => {
              if (nextRegions[deployment.regionId]) {
                nextRegions[deployment.regionId] = {
                  ...nextRegions[deployment.regionId],
                  divisions: [...nextRegions[deployment.regionId].divisions, ...deployment.divisions],
                };
              }
            });
          }
        }

        set({
          dateTime: newDate,
          money: newMoney,
          income: playerIncome,
          movingUnits: remainingMovements,
          activeCombats: nextCombats,
          regions: nextRegions,
          gameEvents: nextEvents,
          aiState: nextAIState,
        });
      },

      createInfantry: () => {
        const { money, selectedCountry, reserveDivisions, dateTime, gameEvents } = get();
        const cost = 10;
        
        if (money >= cost && selectedCountry) {
          const divisionNumber = reserveDivisions.length + 1;
          const divisionName = `${selectedCountry.id === 'soviet' ? 'Red' : 'White'} Guard ${divisionNumber}${getOrdinalSuffix(divisionNumber)} Division`;
          const newDivision = createDivision(selectedCountry.id, divisionName);
          
          const newEvent = createGameEvent(
            'unit_created',
            'Division Trained',
            `${divisionName} has been trained for $${cost}. HP: ${newDivision.hp}, Attack: ${newDivision.attack}, Defence: ${newDivision.defence}. Ready for deployment.`,
            dateTime,
            selectedCountry.id
          );

          set({
            money: money - cost,
            reserveDivisions: [...reserveDivisions, newDivision],
            gameEvents: [...gameEvents, newEvent],
          });
        }
      },

      deployUnit: () => {
        const { selectedRegion, reserveDivisions, regions, selectedCountry, dateTime, gameEvents } = get();
        if (!selectedRegion || reserveDivisions.length <= 0) return;
        
        const region = regions[selectedRegion];
        if (!region || region.owner !== selectedCountry?.id) return;
        
        const divisionToDeploy = reserveDivisions[0];
        
        const newEvent = createGameEvent(
          'unit_deployed',
          `Division Deployed to ${region.name}`,
          `${divisionToDeploy.name} has been deployed to ${region.name}.`,
          dateTime,
          selectedCountry?.id,
          selectedRegion
        );

        const newRegions = {
          ...regions,
          [selectedRegion]: {
            ...region,
            divisions: [...region.divisions, divisionToDeploy],
          },
        };

        set({
          reserveDivisions: reserveDivisions.slice(1),
          gameEvents: [...gameEvents, newEvent],
          regions: newRegions,
        });
      },

      moveUnits: (fromRegion, toRegion, count) => {
        const { adjacency, regions, selectedCountry, dateTime, movingUnits } = get();
        if (!adjacency[fromRegion]?.includes(toRegion)) return;
        
        const from = regions[fromRegion];
        if (!from || from.divisions.length < count || !selectedCountry || from.owner !== selectedCountry.id) return;
        
        const divisionsToMove = from.divisions.slice(0, count);
        const travelTimeHours = 6;
        const arrivalTime = new Date(dateTime);
        arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);
        
        const newMovement: Movement = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fromRegion,
          toRegion,
          divisions: divisionsToMove,
          departureTime: new Date(dateTime),
          arrivalTime,
          owner: selectedCountry.id,
        };
        
        const newRegions = {
          ...regions,
          [fromRegion]: {
            ...from,
            divisions: from.divisions.slice(count),
          },
        };

        set({
          regions: newRegions,
          movingUnits: [...movingUnits, newMovement],
        });
      },

      claimMission: (missionId) => {
        set((state) => {
          const mission = state.missions.find(m => m.id === missionId);
          if (mission && mission.completed && !mission.claimed) {
            const events = [...state.gameEvents];
            
            events.push(createGameEvent(
              'mission_claimed',
              `Mission Completed: ${mission.name}`,
              `Reward of $${mission.rewards.money} claimed for completing "${mission.name}".`,
              state.dateTime,
              state.selectedCountry?.id
            ));
            
            if (mission.rewards.gameVictory) {
              events.push(createGameEvent(
                'game_victory',
                'Victory!',
                `${state.selectedCountry?.name} has achieved total victory in the Russian Civil War!`,
                state.dateTime,
                state.selectedCountry?.id
              ));
            }
            
            return {
              money: state.money + mission.rewards.money,
              missions: state.missions.map(m =>
                m.id === missionId ? { ...m, claimed: true } : m
              ),
              gameEvents: events,
            };
          }
          return state;
        });
      },

      openMissions: () => {
        set((state) => ({
          currentScreen: 'mission',
          missions: state.missions.map((m, index) => 
            index === 0 ? { ...m, completed: true } : m
          ),
        }));
      },

      saveGame: () => {
        set({ lastSaveTime: new Date() });
      },

      loadGame: (savedData) => {
        set({
          ...savedData.gameState,
          regions: savedData.regions,
          aiState: savedData.aiState,
          isPlaying: false,
          currentScreen: 'main',
        });
      }
    }),
    {
      name: 'russian-civil-war-save',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // We only persist the necessary game data
        currentScreen: state.currentScreen,
        selectedCountry: state.selectedCountry,
        dateTime: state.dateTime,
        money: state.money,
        reserveDivisions: state.reserveDivisions,
        missions: state.missions,
        movingUnits: state.movingUnits,
        gameEvents: state.gameEvents,
        activeCombats: state.activeCombats,
        regions: state.regions,
        aiState: state.aiState,
        lastSaveTime: state.lastSaveTime,
      }),
      onRehydrateStorage: () => (state) => {
        // Convert date strings back to Date objects after rehydration
        if (state) {
          if (state.dateTime && typeof state.dateTime === 'string') {
            state.dateTime = new Date(state.dateTime);
          }
          if (state.lastSaveTime && typeof state.lastSaveTime === 'string') {
            state.lastSaveTime = new Date(state.lastSaveTime);
          }
          // Convert dates in movingUnits
          if (state.movingUnits) {
            state.movingUnits = state.movingUnits.map((m: Movement) => ({
              ...m,
              departureTime: new Date(m.departureTime),
              arrivalTime: new Date(m.arrivalTime),
            }));
          }
          // Convert dates in activeCombats
          if (state.activeCombats) {
            state.activeCombats = state.activeCombats.map((c: ActiveCombat) => ({
              ...c,
              startTime: new Date(c.startTime),
              lastRoundTime: new Date(c.lastRoundTime),
            }));
          }
          // Convert dates in gameEvents
          if (state.gameEvents) {
            state.gameEvents = state.gameEvents.map((e: GameEvent) => ({
              ...e,
              timestamp: new Date(e.timestamp),
            }));
          }
        }
      },
    }
  )
);

import { 
  Movement,
  ActiveCombat,
  GameEvent,
  NotificationItem,
  Division,
} from '../../types/game';
import { calculateFactionIncome } from '../../utils/mapUtils';
import { runAITick } from '../../ai/cpuPlayer';
import { createActiveCombat, processCombatRound, shouldProcessCombatRound, validateDivisionArmyGroup } from '../../utils/combat';
import { createGameEvent, createNotification } from '../../utils/eventUtils';
import { areMissionConditionsMet } from './missionHelpers';
import { GameStore } from './types';
import { StoreApi } from 'zustand';

/**
 * Defines the game tick action which runs every game hour
 * This is the main game loop that processes:
 * - Unit movements
 * - Combat resolution
 * - HP regeneration
 * - AI actions
 * - Mission completion
 * - Theater updates
 */
export const createTickActions = (
  set: StoreApi<GameStore>['setState'],
  get: StoreApi<GameStore>['getState']
) => ({
  tick: () => {
    const state = get();
    if (!state.isPlaying) return;

    const { dateTime, selectedCountry, regions, movingUnits, activeCombats, money, aiState, gameEvents, notifications, armyGroups } = state;
    
    // Validate and auto-repair divisions with invalid army groups (development mode)
    let updatedRegions = regions;
    let updatedMovingUnits = movingUnits;
    let needsUpdate = false;
    
    if (process.env.NODE_ENV === 'development') {
      // First pass: validate and collect fixes
      const regionFixes: { regionId: string; divisionIndex: number; newDivision: Division }[] = [];
      const movementFixes: { movementIndex: number; divisionIndex: number; newDivision: Division }[] = [];
      
      Object.entries(regions).forEach(([regionId, region]) => {
        region.divisions.forEach((division, divIndex) => {
          const result = validateDivisionArmyGroup(division, armyGroups);
          if (result.wasFixed) {
            regionFixes.push({ regionId, divisionIndex: divIndex, newDivision: result.division });
            needsUpdate = true;
          }
        });
      });
      
      movingUnits.forEach((movement, movIndex) => {
        movement.divisions.forEach((division, divIndex) => {
          const result = validateDivisionArmyGroup(division, armyGroups);
          if (result.wasFixed) {
            movementFixes.push({ movementIndex: movIndex, divisionIndex: divIndex, newDivision: result.division });
            needsUpdate = true;
          }
        });
      });
      
      // Apply fixes if needed
      if (needsUpdate) {
        updatedRegions = { ...regions };
        regionFixes.forEach(fix => {
          const newDivisions = [...updatedRegions[fix.regionId].divisions];
          newDivisions[fix.divisionIndex] = fix.newDivision;
          updatedRegions[fix.regionId] = {
            ...updatedRegions[fix.regionId],
            divisions: newDivisions
          };
        });
        
        updatedMovingUnits = [...movingUnits];
        movementFixes.forEach(fix => {
          const newDivisions = [...updatedMovingUnits[fix.movementIndex].divisions];
          newDivisions[fix.divisionIndex] = fix.newDivision;
          updatedMovingUnits[fix.movementIndex] = {
            ...updatedMovingUnits[fix.movementIndex],
            divisions: newDivisions
          };
        });
      }
    }
    
    const playerFaction = selectedCountry?.id;
    const playerIncome = playerFaction ? calculateFactionIncome(updatedRegions, playerFaction, updatedMovingUnits) : 0;
    
    const newDate = new Date(dateTime);
    newDate.setHours(newDate.getHours() + 1);
    
    const newMoney = money + playerIncome;
    
    // Process unit movements
    const remainingMovements: Movement[] = [];
    const completedMovements: Movement[] = [];

    updatedMovingUnits.forEach(movement => {
      // Regenerate HP for units in transit
      const regeneratedDivisions = movement.divisions.map(division => {
        const newHp = Math.min(division.hp + 10, division.maxHp);
        return {
          ...division,
          hp: newHp,
        };
      });

      const regeneratedMovement = {
        ...movement,
        divisions: regeneratedDivisions,
      };

      if (newDate >= movement.arrivalTime) {
        completedMovements.push(regeneratedMovement);
      } else {
        remainingMovements.push(regeneratedMovement);
      }
    });

    // Process active combats
    const updatedCombats: ActiveCombat[] = [];
    const finishedCombats: ActiveCombat[] = [];
    const newCombatEvents: GameEvent[] = [];
    const newCombatNotifications: NotificationItem[] = [];

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
          
          const combatEvent = createGameEvent(
            attackerWon ? 'region_captured' : 'combat_defeat',
            attackerWon ? `${updatedCombat.regionName} Captured!` : `Battle for ${updatedCombat.regionName} Lost`,
            `${updatedCombat.attackerFaction === 'soviet' ? 'Soviet' : 'White'} forces ${attackerWon ? 'captured' : 'failed to capture'} ${updatedCombat.regionName}. Attackers lost ${attackerLosses} divisions. Defenders lost ${defenderLosses} divisions.`,
            newDate,
            updatedCombat.attackerFaction,
            updatedCombat.regionId
          );
          
          newCombatEvents.push(combatEvent);
          newCombatNotifications.push(createNotification(combatEvent, newDate));
        } else {
          updatedCombats.push(updatedCombat);
        }
      } else {
        updatedCombats.push(combat);
      }
    });

    // Apply completed movements and combats to regions
    const nextRegions = { ...updatedRegions };
    const nextCombats = [...updatedCombats];
    const nextEvents = [...gameEvents, ...newCombatEvents];
    const nextNotifications = [...notifications, ...newCombatNotifications];

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
        // Check if there's an ongoing combat at this region
        const ongoingCombat = nextCombats.find(c => c.regionId === toRegion && !c.isComplete);
        
        if (ongoingCombat) {
          // There's an ongoing combat - add reinforcements to the appropriate side
          const combatIndex = nextCombats.findIndex(c => c.id === ongoingCombat.id);
          
          // Determine which side the arriving units should join
          if (owner === ongoingCombat.attackerFaction) {
            // Join the attackers
            const updatedCombat = {
              ...ongoingCombat,
              attackerDivisions: [...ongoingCombat.attackerDivisions, ...divisions],
              initialAttackerHp: ongoingCombat.initialAttackerHp + divisions.reduce((sum, d) => sum + d.hp, 0),
              initialAttackerCount: ongoingCombat.initialAttackerCount + divisions.length,
            };
            nextCombats[combatIndex] = updatedCombat;
            
            console.log(`[REINFORCEMENTS] ${divisions.length} ${owner} divisions joined the attackers in combat at ${to.name}`);
            
            const reinforcementEvent = createGameEvent(
              'combat_victory',
              `Reinforcements Arrive!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} reinforcements (${divisions.length} divisions) have joined the attack on ${to.name}.`,
              newDate,
              owner,
              toRegion
            );
            nextEvents.push(reinforcementEvent);
            nextNotifications.push(createNotification(reinforcementEvent, newDate));
          } else if (owner === ongoingCombat.defenderFaction) {
            // Join the defenders
            const updatedCombat = {
              ...ongoingCombat,
              defenderDivisions: [...ongoingCombat.defenderDivisions, ...divisions],
              initialDefenderHp: ongoingCombat.initialDefenderHp + divisions.reduce((sum, d) => sum + d.hp, 0),
              initialDefenderCount: ongoingCombat.initialDefenderCount + divisions.length,
            };
            nextCombats[combatIndex] = updatedCombat;
            
            console.log(`[REINFORCEMENTS] ${divisions.length} ${owner} divisions joined the defenders in combat at ${to.name}`);
            
            const reinforcementEvent = createGameEvent(
              'combat_victory',
              `Reinforcements Arrive!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} reinforcements (${divisions.length} divisions) have arrived to defend ${to.name}.`,
              newDate,
              owner,
              toRegion
            );
            nextEvents.push(reinforcementEvent);
            nextNotifications.push(createNotification(reinforcementEvent, newDate));
          }
        } else {
          // No ongoing combat - follow the standard logic
          const defenderDivisions = to.divisions;
          if (defenderDivisions.length === 0) {
            nextRegions[toRegion] = {
              ...to,
              owner: owner,
              divisions: divisions,
            };
            const captureEvent = createGameEvent(
              'region_captured',
              `${to.name} Captured!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} forces captured the undefended region of ${to.name}.`,
              newDate,
              owner,
              toRegion
            );
            nextEvents.push(captureEvent);
            nextNotifications.push(createNotification(captureEvent, newDate));
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
            const battleEvent = createGameEvent(
              'combat_victory',
              `Battle for ${to.name} Begins!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} forces (${divisions.length} divisions) are attacking ${to.owner === 'soviet' ? 'Soviet' : 'White'} defenders (${defenderDivisions.length} divisions) at ${to.name}.`,
              newDate,
              owner,
              toRegion
            );
            nextEvents.push(battleEvent);
            nextNotifications.push(createNotification(battleEvent, newDate));
          }
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

    // Regenerate HP for all divisions every hour
    Object.keys(nextRegions).forEach(regionId => {
      const region = nextRegions[regionId];
      if (region.divisions.length > 0) {
        const regeneratedDivisions = region.divisions.map(division => {
          // Regenerate 10 HP per hour, but don't exceed maxHp
          const newHp = Math.min(division.hp + 10, division.maxHp);
          if (division.hp < division.maxHp) {
            console.log(`[HP REGEN] ${division.name}: ${division.hp} -> ${newHp} in ${region.name}`);
          }
          return {
            ...division,
            hp: newHp,
          };
        });
        nextRegions[regionId] = {
          ...region,
          divisions: regeneratedDivisions,
        };
      }
    });

    // AI Tick
    let nextAIState = aiState;
    let nextArmyGroups = armyGroups;
    if (aiState) {
      const aiActions = runAITick(aiState, nextRegions, armyGroups, nextCombats, remainingMovements);
      nextAIState = aiActions.updatedAIState;
      
      // If AI created a new army group, add it
      if (aiActions.newArmyGroup) {
        nextArmyGroups = [...armyGroups, aiActions.newArmyGroup];
      }
      
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

    // Sync army group regionIds with actual division locations
    // This ensures army group territory updates as divisions move
    nextArmyGroups = nextArmyGroups.map(group => {
      const currentRegions = new Set<string>(group.regionIds);
      
      // Add regions where divisions are (expansion)
      Object.entries(nextRegions).forEach(([regionId, region]) => {
        if (region.divisions.some(d => d.armyGroupId === group.id)) {
          currentRegions.add(regionId);
        }
      });
      
      // Also include regions where units of this group are currently moving to
      remainingMovements.forEach(m => {
        if (m.divisions.some(d => d.armyGroupId === group.id)) {
          currentRegions.add(m.toRegion);
        }
      });
      
      // Filter out regions that are no longer owned by the player
      // This ensures that if we lose a region, it's removed from the army group
      // but "empty" regions stay in the army group as long as they are owned.
      const filteredRegions = Array.from(currentRegions).filter(id => {
        const region = nextRegions[id];
        return region && region.owner === group.owner;
      });
      
      return { ...group, regionIds: filteredRegions };
    });

    set({
      dateTime: newDate,
      money: newMoney,
      income: playerIncome,
      movingUnits: remainingMovements,
      activeCombats: nextCombats,
      regions: nextRegions,
      gameEvents: nextEvents,
      notifications: nextNotifications,
      aiState: nextAIState,
      armyGroups: nextArmyGroups,
    });
    
    // Check and auto-complete missions based on conditions
    if (selectedCountry) {
      const currentState = get();
      const updatedMissions = currentState.missions.map(mission => {
        // Skip if mission is already completed
        if (mission.completed) {
          return mission;
        }
        
        // Check if prerequisites are met (all must be claimed)
        const prerequisitesMet = mission.prerequisites.every(prereqId => {
          const prereqMission = currentState.missions.find(m => m.id === prereqId);
          return prereqMission?.claimed;
        });
        
        if (!prerequisitesMet) {
          return mission;
        }
        
        // Check if all availability conditions are met
        const conditionsMet = areMissionConditionsMet(mission, {
          regions: currentState.regions,
          money: currentState.money,
          dateTime: currentState.dateTime,
          gameEvents: currentState.gameEvents,
          selectedCountry: currentState.selectedCountry!,
          theaters: currentState.theaters,
          armyGroups: currentState.armyGroups,
        });
        
        if (conditionsMet) {
          // Auto-complete the mission
          const completionEvent = createGameEvent(
            'mission_completed',
            `Mission Complete: ${mission.name}`,
            mission.description,
            currentState.dateTime,
            selectedCountry.id
          );
          
          const completionNotification = createNotification(completionEvent, currentState.dateTime);
          
          // Add event and notification
          set({
            gameEvents: [...currentState.gameEvents, completionEvent],
            notifications: [...currentState.notifications, completionNotification],
          });
          
          return { ...mission, completed: true };
        }
        
        return mission;
      });
      
      // Update missions if any changed
      if (updatedMissions.some((m, i) => m.completed !== currentState.missions[i].completed)) {
        set({ missions: updatedMissions });
      }
    }
    
    // Update theaters after regions change
    get().detectAndUpdateTheaters();
  },
});

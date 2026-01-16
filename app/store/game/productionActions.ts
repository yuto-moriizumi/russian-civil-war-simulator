import { GameStore } from './types';
import { ProductionQueueItem } from '../../types/game';
import { getOrdinalSuffix } from '../../utils/eventUtils';
import { getCommandPowerInfo, COMMAND_POWER_PER_UNIT } from '../../utils/commandPower';
import { getBaseProductionTime } from '../../utils/bonusCalculator';

export const createProductionActions = (
  set: (fn: (state: GameStore) => Partial<GameStore>) => void,
  get: () => GameStore
) => ({
  setIsProductionModalOpen: (isOpen: boolean) => {
    set(() => ({ isProductionModalOpen: isOpen }));
  },

  addToProductionQueue: (armyGroupId: string, count: number = 1) => {
    const state = get();
    
    // Check if count is valid
    if (count < 1) {
      console.warn('Invalid count for production');
      return;
    }

    // Check if player has selected a country
    if (!state.selectedCountry) {
      console.warn('No country selected');
      return;
    }

    // Calculate how many divisions we can actually produce based on cap
    const capInfo = getCommandPowerInfo(
      state.selectedCountry.id,
      state.regions,
      state.movingUnits,
      state.productionQueues,
      state.factionBonuses[state.selectedCountry.id],
      state.selectedCountry.coreRegions
    );
    
    // Convert available slots to available divisions (each division costs COMMAND_POWER_PER_UNIT slots)
    const availableDivisions = Math.floor(capInfo.available / COMMAND_POWER_PER_UNIT);
    
    // Clamp count to available capacity
    const actualCount = Math.min(count, availableDivisions);
    
    if (actualCount === 0) {
      console.warn(
        `Command power reached! Current: ${capInfo.current}, In Production: ${capInfo.inProduction}, Cap: ${capInfo.cap} (${capInfo.controlledStates} states × 2)`
      );
      return false;
    }
    
    // Log if we had to reduce the count due to cap
    if (actualCount < count) {
      console.log(`Requested ${count} divisions, but only ${actualCount} can be produced due to command power (${availableDivisions} divisions available)`);
    }

    // Find the army group
    const armyGroup = state.armyGroups.find(g => g.id === armyGroupId);
    if (!armyGroup || armyGroup.owner !== state.selectedCountry.id) {
      console.warn('Invalid army group or not owned by player');
      return;
    }

    // Find a valid region in the army group to deploy to
    const validRegions = armyGroup.regionIds.filter(id => {
      const region = state.regions[id];
      return region && region.owner === state.selectedCountry!.id;
    });

    let targetRegionId: string | null = null;
    if (validRegions.length > 0) {
      // Pick random region in the group
      targetRegionId = validRegions[Math.floor(Math.random() * validRegions.length)];
    } else {
      // If no valid regions, deploy to any owned region
      const ownedRegions = Object.keys(state.regions).filter(id => state.regions[id].owner === state.selectedCountry!.id);
      if (ownedRegions.length > 0) {
        targetRegionId = ownedRegions[0];
      }
    }

    if (!targetRegionId) {
      console.warn('No valid deployment target found');
      return;
    }

    // Count existing divisions to generate unique names
    const existingDivisions = Object.values(state.regions).reduce((acc, region) => 
      acc + region.divisions.filter(d => d.owner === state.selectedCountry!.id).length, 0
    );
    const playerQueue = state.productionQueues[state.selectedCountry.id] || [];
    const existingQueueCount = playerQueue.length;

    // Create multiple production items
    const newProductions: ProductionQueueItem[] = [];
    const now = state.dateTime;
    const productionTimeHours = getBaseProductionTime(state.factionBonuses[state.selectedCountry.id]);

    // Calculate the start time for the first new production
    // If queue is empty, start immediately. Otherwise, start after the last item completes.
    let queueStartTime = now;
    if (playerQueue.length > 0) {
      // Find the completion time of the last item in the existing queue
      const lastItem = playerQueue[playerQueue.length - 1];
      queueStartTime = lastItem.completionTime;
    }

    for (let i = 0; i < actualCount; i++) {
      const divisionNumber = existingDivisions + existingQueueCount + newProductions.length + 1;
      const divisionName = `${divisionNumber}${getOrdinalSuffix(divisionNumber)} Infantry Division`;
      
      // Each item starts when the previous item completes
      const itemStartTime = new Date(queueStartTime.getTime() + (i * productionTimeHours * 60 * 60 * 1000));
      const completionTime = new Date(itemStartTime.getTime() + productionTimeHours * 60 * 60 * 1000);

      newProductions.push({
        id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        divisionName,
        owner: state.selectedCountry.id,
        startTime: itemStartTime,
        completionTime,
        targetRegionId,
        armyGroupId,
      });
    }

    set((state) => ({
      productionQueues: {
        ...state.productionQueues,
        [state.selectedCountry!.id]: [...(state.productionQueues[state.selectedCountry!.id] || []), ...newProductions],
      },
      gameEvents: [
        ...state.gameEvents,
        {
          id: `event-${Date.now()}`,
          type: 'production_started',
          timestamp: now,
          title: 'Production Started',
          description: actualCount === 1 
            ? `Started production of ${newProductions[0].divisionName}. Will complete in ${productionTimeHours} hours.`
            : `Started production of ${actualCount} divisions. First will complete in ${productionTimeHours} hours.`,
          faction: state.selectedCountry?.id,
        },
      ],
    }));
  },

  cancelProduction: (productionId: string) => {
    const state = get();
    
    // Get player's faction queue
    if (!state.selectedCountry) {
      console.warn('No country selected');
      return;
    }
    
    const playerQueue = state.productionQueues[state.selectedCountry.id] || [];
    const production = playerQueue.find(p => p.id === productionId);
    
    if (!production) {
      console.warn('Production item not found');
      return;
    }

    // Only allow canceling own productions
    if (production.owner !== state.selectedCountry.id) {
      console.warn('Cannot cancel production of another faction');
      return;
    }

    // Check if we're canceling the first (active) item
    const isFirstItem = playerQueue[0]?.id === productionId;

    // Filter out the cancelled production
    const filteredQueue = playerQueue.filter(p => p.id !== productionId);

    // If we cancelled the first item, adjust the new first item's timing to start now
    const finalQueue = isFirstItem && filteredQueue.length > 0
      ? (() => {
          const nextItem = filteredQueue[0];
          const productionDuration = nextItem.completionTime.getTime() - nextItem.startTime.getTime();
          
          return [
            {
              ...nextItem,
              startTime: state.dateTime,
              completionTime: new Date(state.dateTime.getTime() + productionDuration),
            },
            ...filteredQueue.slice(1)
          ];
        })()
      : filteredQueue;
    
    set((state) => ({
      productionQueues: {
        ...state.productionQueues,
        [state.selectedCountry!.id]: finalQueue,
      },
      gameEvents: [
        ...state.gameEvents,
        {
          id: `event-${Date.now()}`,
          type: 'production_started', // Reusing event type
          timestamp: state.dateTime,
          title: 'Production Canceled',
          description: `Canceled production of ${production.divisionName}.`,
          faction: state.selectedCountry?.id,
        },
      ],
    }));
  },
});

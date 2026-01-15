import { GameStore } from './types';
import { ProductionQueueItem } from '../../types/game';
import { getOrdinalSuffix } from '../../utils/eventUtils';

const DIVISION_COST = 10; // Cost to produce a division
const PRODUCTION_TIME_HOURS = 24; // 24 game hours to produce a division

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

    // Check if player has enough money for all units
    const totalCost = DIVISION_COST * count;
    if (state.money < totalCost) {
      console.warn(`Not enough money to start production. Need $${totalCost}, have $${state.money}`);
      return;
    }

    // Check if player has selected a country
    if (!state.selectedCountry) {
      console.warn('No country selected');
      return;
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
    const existingQueueCount = state.productionQueue.filter(p => p.owner === state.selectedCountry!.id).length;

    // Create multiple production items
    const newProductions: ProductionQueueItem[] = [];
    const now = state.dateTime;

    for (let i = 0; i < count; i++) {
      const divisionNumber = existingDivisions + existingQueueCount + newProductions.length + 1;
      const divisionName = `${divisionNumber}${getOrdinalSuffix(divisionNumber)} Infantry Division`;
      const completionTime = new Date(now.getTime() + PRODUCTION_TIME_HOURS * 60 * 60 * 1000);

      newProductions.push({
        id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        divisionName,
        owner: state.selectedCountry.id,
        startTime: now,
        completionTime,
        targetRegionId,
        armyGroupId,
      });
    }

    set((state) => ({
      productionQueue: [...state.productionQueue, ...newProductions],
      money: state.money - totalCost,
      gameEvents: [
        ...state.gameEvents,
        {
          id: `event-${Date.now()}`,
          type: 'production_started',
          timestamp: now,
          title: 'Production Started',
          description: count === 1 
            ? `Started production of ${newProductions[0].divisionName}. Will complete in 24 hours.`
            : `Started production of ${count} divisions. First will complete in 24 hours.`,
          faction: state.selectedCountry?.id,
        },
      ],
    }));
  },

  cancelProduction: (productionId: string) => {
    const state = get();
    const production = state.productionQueue.find(p => p.id === productionId);
    
    if (!production) {
      console.warn('Production item not found');
      return;
    }

    // Only allow canceling own productions
    if (production.owner !== state.selectedCountry?.id) {
      console.warn('Cannot cancel production of another faction');
      return;
    }

    // Check if we're canceling the first (active) item
    const isFirstItem = state.productionQueue[0]?.id === productionId;

    // Refund 50% of the cost
    const refund = Math.floor(DIVISION_COST / 2);

    // Filter out the cancelled production
    const filteredQueue = state.productionQueue.filter(p => p.id !== productionId);

    // If we cancelled the first item and there are more items, reset the timing of the new first item
    let updatedQueue = filteredQueue;
    if (isFirstItem && filteredQueue.length > 0) {
      const now = state.dateTime;
      const newCompletionTime = new Date(now.getTime() + PRODUCTION_TIME_HOURS * 60 * 60 * 1000);
      
      updatedQueue = filteredQueue.map((item, index) => {
        if (index === 0) {
          // Reset timing for the new first item
          return {
            ...item,
            startTime: now,
            completionTime: newCompletionTime,
          };
        }
        return item;
      });
    }

    set((state) => ({
      productionQueue: updatedQueue,
      money: state.money + refund,
      gameEvents: [
        ...state.gameEvents,
        {
          id: `event-${Date.now()}`,
          type: 'production_started', // Reusing event type
          timestamp: state.dateTime,
          title: 'Production Canceled',
          description: `Canceled production of ${production.divisionName}. Refunded $${refund}.`,
          faction: state.selectedCountry?.id,
        },
      ],
    }));
  },
});

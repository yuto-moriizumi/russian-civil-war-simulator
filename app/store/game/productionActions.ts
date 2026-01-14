import { GameStore } from './types';
import { ProductionQueueItem, ArmyGroup } from '../../types/game';
import { generateArmyGroupName } from '../../utils/armyGroupNaming';
import { ARMY_GROUP_COLORS } from './initialState';
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

  addToProductionQueue: (armyGroupId: string) => {
    const state = get();
    
    // Check if player has enough money
    if (state.money < DIVISION_COST) {
      console.warn('Not enough money to start production');
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

    // Count existing divisions to generate unique name
    const existingDivisions = Object.values(state.regions).reduce((acc, region) => 
      acc + region.divisions.filter(d => d.owner === state.selectedCountry!.id).length, 0
    );
    const divisionNumber = existingDivisions + state.productionQueue.filter(p => p.owner === state.selectedCountry!.id).length + 1;
    const divisionName = `${divisionNumber}${getOrdinalSuffix(divisionNumber)} Infantry Division`;

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

    const now = state.dateTime;
    const completionTime = new Date(now.getTime() + PRODUCTION_TIME_HOURS * 60 * 60 * 1000);

    const newProduction: ProductionQueueItem = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      divisionName,
      owner: state.selectedCountry.id,
      startTime: now,
      completionTime,
      targetRegionId,
    };

    set((state) => ({
      productionQueue: [...state.productionQueue, newProduction],
      money: state.money - DIVISION_COST,
      gameEvents: [
        ...state.gameEvents,
        {
          id: `event-${Date.now()}`,
          type: 'production_started',
          timestamp: now,
          title: 'Production Started',
          description: `Started production of ${divisionName}. Will complete in 24 hours.`,
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

    // Refund 50% of the cost
    const refund = Math.floor(DIVISION_COST / 2);

    set((state) => ({
      productionQueue: state.productionQueue.filter(p => p.id !== productionId),
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

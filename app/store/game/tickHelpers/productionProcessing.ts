import { ProductionQueueItem, RegionState, Division, CountryId, CountryBonuses } from '../../../types/game';
import { getDivisionStats } from '../../../utils/bonusCalculator';

/**
 * Process per-country production queues and complete the FIRST production from each country's queue.
 * This allows all countries to produce divisions in parallel.
 * @param productionQueues - Per-country production queues
 * @param currentTime - Current game time
 * @param regions - Current region state
 * @param countryBonuses - Per-country bonuses from missions
 * @returns Updated per-country queues, regions, and completed production events
 */
export function processProductionQueue(
  productionQueues: Record<CountryId, ProductionQueueItem[]>,
  currentTime: Date,
  regions: RegionState,
  countryBonuses: Record<CountryId, CountryBonuses>
): {
  remainingProductions: Record<CountryId, ProductionQueueItem[]>;
  updatedRegions: RegionState;
  completedProductions: ProductionQueueItem[];
} {
  const completedProductions: ProductionQueueItem[] = [];
  let updatedRegions = { ...regions };
  const remainingQueues: Record<CountryId, ProductionQueueItem[]> = {} as Record<CountryId, ProductionQueueItem[]>;

  // Process each country's queue independently
  const countryIds = Object.keys(productionQueues) as CountryId[];
  
  for (const countryId of countryIds) {
    const countryQueue = productionQueues[countryId] || [];
    
    // Only process the FIRST item in this country's queue if it's complete
    if (countryQueue.length > 0 && currentTime >= countryQueue[0].completionTime) {
      const production = countryQueue[0];
      completedProductions.push(production);

      // Get division stats with country bonuses applied
      const bonuses = countryBonuses[production.owner];
      const divisionStats = getDivisionStats(production.owner, bonuses);

      // Create the division with bonuses
      const newDivision: Division = {
        id: `div-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: production.divisionName,
        owner: production.owner,
        armyGroupId: production.armyGroupId,
        hp: divisionStats.hp,
        maxHp: divisionStats.maxHp,
        attack: divisionStats.attack,
        defence: divisionStats.defence,
      };

      // Deploy to target region if specified and valid
      if (production.targetRegionId) {
        const targetRegion = updatedRegions[production.targetRegionId];
        if (targetRegion && targetRegion.owner === production.owner) {
          updatedRegions = {
            ...updatedRegions,
            [production.targetRegionId]: {
              ...targetRegion,
              divisions: [...targetRegion.divisions, newDivision],
            },
          };
        } else {
          // Target region invalid, find a valid region to deploy to
          const ownedRegions = Object.values(updatedRegions).filter(
            r => r.owner === production.owner
          );
          if (ownedRegions.length > 0) {
            const deployRegion = ownedRegions[0];
            updatedRegions = {
              ...updatedRegions,
              [deployRegion.id]: {
                ...deployRegion,
                divisions: [...deployRegion.divisions, newDivision],
              },
            };
          }
          // If no owned regions, division is lost (country was defeated)
        }
      } else {
        // No target specified, deploy to first owned region
        const ownedRegions = Object.values(updatedRegions).filter(
          r => r.owner === production.owner
        );
        if (ownedRegions.length > 0) {
          const deployRegion = ownedRegions[0];
          updatedRegions = {
            ...updatedRegions,
            [deployRegion.id]: {
              ...deployRegion,
              divisions: [...deployRegion.divisions, newDivision],
            },
          };
        }
      }

      // Store remaining queue for this country (without the first completed item)
      const remainingItems = countryQueue.slice(1);
      
      // Adjust the start time and completion time of the new first item
      // so it starts from the current time (when the previous item completed)
      if (remainingItems.length > 0) {
        const nextItem = remainingItems[0];
        const productionDuration = nextItem.completionTime.getTime() - nextItem.startTime.getTime();
        
        // Update the first item in the remaining queue to start now
        remainingItems[0] = {
          ...nextItem,
          startTime: currentTime,
          completionTime: new Date(currentTime.getTime() + productionDuration),
        };
      }
      
      remainingQueues[countryId] = remainingItems;
    } else {
      // No production completed for this country, keep queue unchanged
      remainingQueues[countryId] = countryQueue;
    }
  }

  return {
    remainingProductions: remainingQueues,
    updatedRegions,
    completedProductions,
  };
}

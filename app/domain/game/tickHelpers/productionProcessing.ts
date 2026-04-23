import { ProductionQueueItem, RegionState, Division, CountryId, CountryBonuses, ArmyGroup, DivisionState } from '../../../types/game';
import { getDivisionStats } from '../bonusCalculator';
import { addDivisionsToState } from '../divisionState';

/**
 * Process per-country production queues and complete the FIRST production from each country's queue.
 * This allows all countries to produce divisions in parallel.
 */
export function processProductionQueue(
  productionQueues: Record<CountryId, ProductionQueueItem[]>,
  currentTime: Date,
  regions: RegionState,
  countryBonuses: Record<CountryId, CountryBonuses>,
  armyGroups: ArmyGroup[] = [],
  divisions: DivisionState = {}
): {
  remainingProductions: Record<CountryId, ProductionQueueItem[]>;
  updatedDivisions: DivisionState;
  completedProductions: ProductionQueueItem[];
} {
  const completedProductions: ProductionQueueItem[] = [];
  const updatedRegions = { ...regions };
  let updatedDivisions = { ...divisions };
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

      // Validate the armyGroupId still refers to an existing group owned by
      // this country.  It can become stale when the player switches countries
      // (selectCountry regenerates all army group IDs but preserves production
      // queues) or if an army group is deleted while units are in production.
      // Fall back to the first available group for this country so the division
      // is always associated with a valid army group.
      const referencedGroup = armyGroups.find(g => g.id === production.armyGroupId);
      let resolvedArmyGroupId = production.armyGroupId;
      if (!referencedGroup || referencedGroup.owner !== production.owner) {
        const fallbackGroup = armyGroups.find(g => g.owner === production.owner);
        if (fallbackGroup) {
          resolvedArmyGroupId = fallbackGroup.id;
        }
        // If no army group exists at all for this country, keep the original ID
        // as a best-effort (divisionValidation will repair it in dev mode).
      }

      // Determine deploy region
      let deployRegionId: string | null = null;
      if (production.targetRegionId) {
        const targetRegion = updatedRegions[production.targetRegionId];
        if (targetRegion && targetRegion.owner === production.owner) {
          deployRegionId = production.targetRegionId;
        } else {
          const fallback = Object.values(updatedRegions).find(r => r.owner === production.owner);
          if (fallback) deployRegionId = fallback.id;
        }
      } else {
        const fallback = Object.values(updatedRegions).find(r => r.owner === production.owner);
        if (fallback) deployRegionId = fallback.id;
      }

      if (deployRegionId) {
        const newDivision: Division = {
          id: `div-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: production.divisionName,
          owner: production.owner,
          armyGroupId: resolvedArmyGroupId,
          hp: divisionStats.hp,
          maxHp: divisionStats.maxHp,
          attack: divisionStats.attack,
          defence: divisionStats.defence,
          regionId: deployRegionId,
        };
        updatedDivisions = addDivisionsToState(updatedDivisions, [newDivision]);
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
    updatedDivisions,
    completedProductions,
  };
}

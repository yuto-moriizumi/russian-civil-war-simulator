import { ProductionQueueItem, RegionState, Division } from '../../../types/game';

/**
 * Process production queue and complete only the FIRST production that has finished.
 * This ensures sequential production - only one division completes at a time.
 * @param productionQueue - Current production queue
 * @param currentTime - Current game time
 * @param regions - Current region state
 * @returns Updated production queue, regions, and completed production events
 */
export function processProductionQueue(
  productionQueue: ProductionQueueItem[],
  currentTime: Date,
  regions: RegionState
): {
  remainingProductions: ProductionQueueItem[];
  updatedRegions: RegionState;
  completedProductions: ProductionQueueItem[];
} {
  const completedProductions: ProductionQueueItem[] = [];
  let updatedRegions = { ...regions };

  // Only process the FIRST item in the queue if it's complete
  if (productionQueue.length > 0 && currentTime >= productionQueue[0].completionTime) {
    const production = productionQueue[0];
    completedProductions.push(production);

    // Create the division
    const newDivision: Division = {
      id: `div-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: production.divisionName,
      owner: production.owner,
      armyGroupId: production.armyGroupId, // Assign to the army group that ordered it
      hp: 100,
      maxHp: 100,
      attack: 10,
      defence: 10,
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
        // If no owned regions, division is lost (faction was defeated)
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

    // Return remaining queue (without the first item)
    return {
      remainingProductions: productionQueue.slice(1),
      updatedRegions,
      completedProductions,
    };
  }

  // No productions completed, return queue unchanged
  return {
    remainingProductions: productionQueue,
    updatedRegions,
    completedProductions,
  };
}

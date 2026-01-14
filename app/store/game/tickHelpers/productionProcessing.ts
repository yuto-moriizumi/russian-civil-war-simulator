import { ProductionQueueItem, RegionState, Division } from '../../../types/game';

/**
 * Process production queue and complete any productions that have finished
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
  const remainingProductions: ProductionQueueItem[] = [];
  const completedProductions: ProductionQueueItem[] = [];
  let updatedRegions = { ...regions };

  for (const production of productionQueue) {
    if (currentTime >= production.completionTime) {
      // Production is complete
      completedProductions.push(production);

      // Create the division
      const newDivision: Division = {
        id: `div-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: production.divisionName,
        owner: production.owner,
        armyGroupId: '', // Not assigned to any group initially
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
    } else {
      // Production still in progress
      remainingProductions.push(production);
    }
  }

  return {
    remainingProductions,
    updatedRegions,
    completedProductions,
  };
}

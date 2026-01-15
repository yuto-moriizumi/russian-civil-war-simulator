import { ProductionQueueItem, RegionState, Division, FactionId } from '../../../types/game';

/**
 * Process per-faction production queues and complete the FIRST production from each faction's queue.
 * This allows all factions to produce divisions in parallel.
 * @param productionQueues - Per-faction production queues
 * @param currentTime - Current game time
 * @param regions - Current region state
 * @returns Updated per-faction queues, regions, and completed production events
 */
export function processProductionQueue(
  productionQueues: Record<FactionId, ProductionQueueItem[]>,
  currentTime: Date,
  regions: RegionState
): {
  remainingProductions: Record<FactionId, ProductionQueueItem[]>;
  updatedRegions: RegionState;
  completedProductions: ProductionQueueItem[];
} {
  const completedProductions: ProductionQueueItem[] = [];
  let updatedRegions = { ...regions };
  const remainingQueues: Record<FactionId, ProductionQueueItem[]> = {} as Record<FactionId, ProductionQueueItem[]>;

  // Process each faction's queue independently
  const factionIds = Object.keys(productionQueues) as FactionId[];
  
  for (const factionId of factionIds) {
    const factionQueue = productionQueues[factionId] || [];
    
    // Only process the FIRST item in this faction's queue if it's complete
    if (factionQueue.length > 0 && currentTime >= factionQueue[0].completionTime) {
      const production = factionQueue[0];
      completedProductions.push(production);

      // Create the division
      const newDivision: Division = {
        id: `div-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: production.divisionName,
        owner: production.owner,
        armyGroupId: production.armyGroupId,
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

      // Store remaining queue for this faction (without the first completed item)
      remainingQueues[factionId] = factionQueue.slice(1);
    } else {
      // No production completed for this faction, keep queue unchanged
      remainingQueues[factionId] = factionQueue;
    }
  }

  return {
    remainingProductions: remainingQueues,
    updatedRegions,
    completedProductions,
  };
}

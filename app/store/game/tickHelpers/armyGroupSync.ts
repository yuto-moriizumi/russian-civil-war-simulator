import { ArmyGroup, Region, Movement } from '../../../types/game';

/**
 * Synchronizes army group regionIds with actual division locations
 * This ensures army group territory updates as divisions move
 */
export function syncArmyGroupTerritories(
  armyGroups: ArmyGroup[],
  regions: Record<string, Region>,
  movingUnits: Movement[]
): ArmyGroup[] {
  return armyGroups.map(group => {
    const currentRegions = new Set<string>(group.regionIds);
    
    // Add regions where divisions are (expansion)
    Object.entries(regions).forEach(([regionId, region]) => {
      if (region.divisions.some(d => d.armyGroupId === group.id)) {
        currentRegions.add(regionId);
      }
    });
    
    // Also include regions where units of this group are currently moving to
    movingUnits.forEach(m => {
      if (m.divisions.some(d => d.armyGroupId === group.id)) {
        currentRegions.add(m.toRegion);
      }
    });
    
    // Filter out regions that are no longer owned by the player
    // This ensures that if we lose a region, it's removed from the army group
    // but "empty" regions stay in the army group as long as they are owned.
    const filteredRegions = Array.from(currentRegions).filter(id => {
      const region = regions[id];
      return region && region.owner === group.owner;
    });
    
    return { ...group, regionIds: filteredRegions };
  });
}

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
    
    // Filter out regions that are no longer owned by the player AND have no
    // divisions belonging to this group. This ensures:
    // - Losing an empty region removes it from the army group.
    // - Divisions that moved into an ally's territory (via military access /
    //   autonomy) remain tracked so the army group can still maneuver them.
    const filteredRegions = Array.from(currentRegions).filter(id => {
      const region = regions[id];
      if (!region) return false;
      // Always keep regions owned by this group's country
      if (region.owner === group.owner) return true;
      // Also keep ally-owned regions where this group has divisions present
      return region.divisions.some(d => d.owner === group.owner);
    });
    
    return { ...group, regionIds: filteredRegions };
  });
}

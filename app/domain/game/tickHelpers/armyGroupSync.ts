import { ArmyGroup, Region, Movement, DivisionState } from '../../../types/game';
import { getDivisionsInRegion } from '../divisionState';

/**
 * Synchronizes army group regionIds with actual division locations
 * This ensures army group territory updates as divisions move
 */
export function syncArmyGroupTerritories(
  armyGroups: ArmyGroup[],
  regions: Record<string, Region>,
  movingUnits: Movement[],
  divisions: DivisionState = {}
): ArmyGroup[] {
  return armyGroups.map(group => {
    const currentRegions = new Set<string>(group.regionIds);

    // Add regions where divisions of this group are located
    Object.keys(regions).forEach(regionId => {
      if (getDivisionsInRegion(divisions, regionId).some(d => d.armyGroupId === group.id)) {
        currentRegions.add(regionId);
      }
    });

    // Include regions where units of this group are currently moving to
    movingUnits.forEach(m => {
      const divIds = (m as { divisionIds?: string[] }).divisionIds ?? [];
      if (divIds.some(id => divisions[id]?.armyGroupId === group.id)) {
        currentRegions.add(m.toRegion);
      }
    });

    const filteredRegions = Array.from(currentRegions).filter(id => {
      const region = regions[id];
      if (!region) return false;
      if (region.owner === group.owner) return true;
      return getDivisionsInRegion(divisions, id).some(d => d.owner === group.owner);
    });

    return { ...group, regionIds: filteredRegions };
  });
}

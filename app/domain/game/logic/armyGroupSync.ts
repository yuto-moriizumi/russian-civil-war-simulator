import { ArmyGroup, Region, Movement, DivisionState, Division } from '../../../types/game';

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
  // Build reverse index: regionId -> divisions[] in a single pass O(D)
  const divisionsByRegion = new Map<string, Division[]>();
  for (const div of Object.values(divisions)) {
    if (div.regionId) {
      const list = divisionsByRegion.get(div.regionId);
      if (list) {
        list.push(div);
      } else {
        divisionsByRegion.set(div.regionId, [div]);
      }
    }
  }

  return armyGroups.map(group => {
    const currentRegions = new Set<string>(group.regionIds);

    // Add regions where divisions of this group are located — O(1) per region
    for (const regionId of Object.keys(regions)) {
      const regionDivs = divisionsByRegion.get(regionId);
      if (regionDivs?.some(d => d.armyGroupId === group.id)) {
        currentRegions.add(regionId);
      }
    }

    // Include regions where units of this group are currently moving to
    for (const m of movingUnits) {
      const divIds = (m as { divisionIds?: string[] }).divisionIds ?? [];
      if (divIds.some(id => divisions[id]?.armyGroupId === group.id)) {
        currentRegions.add(m.toRegion);
      }
    }

    // Filter: keep regions owned by the group's owner
    const filteredRegions: string[] = [];
    for (const id of currentRegions) {
      const region = regions[id];
      if (!region) continue;
      if (region.owner === group.owner) {
        filteredRegions.push(id);
        continue;
      }
      const regionDivs = divisionsByRegion.get(id);
      if (regionDivs?.some(d => d.owner === group.owner)) {
        filteredRegions.push(id);
      }
    }

    return { ...group, regionIds: filteredRegions };
  });
}

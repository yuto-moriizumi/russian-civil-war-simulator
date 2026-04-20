import { Region } from '../../../types/game';

/**
 * Regenerates HP for all divisions in regions
 * Divisions regenerate 10 HP per hour, up to their maximum HP
 */
export function regenerateDivisionHP(
  regions: Record<string, Region>
): Record<string, Region> {
  const nextRegions = { ...regions };

  Object.keys(nextRegions).forEach(regionId => {
    const region = nextRegions[regionId];
    if (region.divisions.length > 0) {
      const regeneratedDivisions = region.divisions.map(division => {
        // Regenerate 10 HP per hour, but don't exceed maxHp
        const newHp = Math.min(division.hp + 10, division.maxHp);

        return {
          ...division,
          hp: newHp,
        };
      });
      nextRegions[regionId] = {
        ...region,
        divisions: regeneratedDivisions,
      };
    }
  });

  return nextRegions;
}

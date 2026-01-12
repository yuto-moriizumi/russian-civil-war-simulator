import { Division, Movement, Region, ArmyGroup } from '../../../types/game';
import { validateDivisionArmyGroup } from '../../../utils/combat';

interface ValidationResult {
  updatedRegions: Record<string, Region>;
  updatedMovingUnits: Movement[];
  needsUpdate: boolean;
}

/**
 * Validates and auto-repairs divisions with invalid army groups in development mode
 */
export function validateDivisions(
  regions: Record<string, Region>,
  movingUnits: Movement[],
  armyGroups: ArmyGroup[]
): ValidationResult {
  let updatedRegions = regions;
  let updatedMovingUnits = movingUnits;
  let needsUpdate = false;
  
  if (process.env.NODE_ENV === 'development') {
    // First pass: validate and collect fixes
    const regionFixes: { regionId: string; divisionIndex: number; newDivision: Division }[] = [];
    const movementFixes: { movementIndex: number; divisionIndex: number; newDivision: Division }[] = [];
    
    Object.entries(regions).forEach(([regionId, region]) => {
      region.divisions.forEach((division, divIndex) => {
        const result = validateDivisionArmyGroup(division, armyGroups);
        if (result.wasFixed) {
          regionFixes.push({ regionId, divisionIndex: divIndex, newDivision: result.division });
          needsUpdate = true;
        }
      });
    });
    
    movingUnits.forEach((movement, movIndex) => {
      movement.divisions.forEach((division, divIndex) => {
        const result = validateDivisionArmyGroup(division, armyGroups);
        if (result.wasFixed) {
          movementFixes.push({ movementIndex: movIndex, divisionIndex: divIndex, newDivision: result.division });
          needsUpdate = true;
        }
      });
    });
    
    // Apply fixes if needed
    if (needsUpdate) {
      updatedRegions = { ...regions };
      regionFixes.forEach(fix => {
        const newDivisions = [...updatedRegions[fix.regionId].divisions];
        newDivisions[fix.divisionIndex] = fix.newDivision;
        updatedRegions[fix.regionId] = {
          ...updatedRegions[fix.regionId],
          divisions: newDivisions
        };
      });
      
      updatedMovingUnits = [...movingUnits];
      movementFixes.forEach(fix => {
        const newDivisions = [...updatedMovingUnits[fix.movementIndex].divisions];
        newDivisions[fix.divisionIndex] = fix.newDivision;
        updatedMovingUnits[fix.movementIndex] = {
          ...updatedMovingUnits[fix.movementIndex],
          divisions: newDivisions
        };
      });
    }
  }
  
  return { updatedRegions, updatedMovingUnits, needsUpdate };
}

import { Division, Movement, Region, ArmyGroup, DivisionState } from '../../../types/game';
import { validateDivisionArmyGroup } from '../../../utils/combat';

interface ValidationResult {
  updatedRegions: Record<string, Region>;
  updatedMovingUnits: Movement[];
  updatedDivisions: DivisionState;
  needsUpdate: boolean;
}

/**
 * Validates and auto-repairs divisions with invalid army groups in development mode
 */
export function validateDivisions(
  regions: Record<string, Region>,
  movingUnits: Movement[],
  armyGroups: ArmyGroup[],
  divisions: DivisionState = {}
): ValidationResult {
  const updatedRegions = regions;
  const updatedMovingUnits = movingUnits;
  let updatedDivisions = divisions;
  let needsUpdate = false;

  if (process.env.NODE_ENV === 'development') {
    const movementFixes: { movementIndex: number; divisionId: string; newDivision: Division }[] = [];
    const divisionFixes: { id: string; newDivision: Division }[] = [];

    // Validate divisions in the canonical DivisionState
    for (const division of Object.values(divisions)) {
      const result = validateDivisionArmyGroup(division, armyGroups);
      if (result.wasFixed) {
        divisionFixes.push({ id: division.id, newDivision: result.division });
        needsUpdate = true;
      }
    }

    // Validate divisions that are in transit
    movingUnits.forEach((movement, movIndex) => {
      const divIds = movement.divisionIds ?? [];
      divIds.forEach(divId => {
        const division = updatedDivisions[divId];
        if (division) {
          const result = validateDivisionArmyGroup(division, armyGroups);
          if (result.wasFixed) {
            movementFixes.push({ movementIndex: movIndex, divisionId: divId, newDivision: result.division });
            needsUpdate = true;
          }
        }
      });
    });

    if (needsUpdate) {
      if (divisionFixes.length > 0) {
        updatedDivisions = { ...divisions };
        divisionFixes.forEach(fix => {
          updatedDivisions[fix.id] = fix.newDivision;
        });
      }

      if (movementFixes.length > 0) {
        // Apply fixes to DivisionState (movement just holds IDs)
        movementFixes.forEach(fix => {
          updatedDivisions = { ...updatedDivisions, [fix.divisionId]: fix.newDivision };
        });
      }
    }
  }

  return { updatedRegions, updatedMovingUnits, updatedDivisions, needsUpdate };
}

import { Movement } from '../../../types/game';

interface MovementProcessingResult {
  remainingMovements: Movement[];
  completedMovements: Movement[];
}

/**
 * Processes unit movements, regenerating HP for units in transit
 * and separating completed movements from ongoing ones
 */
export function processMovements(
  movingUnits: Movement[],
  currentDate: Date
): MovementProcessingResult {
  const remainingMovements: Movement[] = [];
  const completedMovements: Movement[] = [];

  movingUnits.forEach(movement => {
    // Regenerate HP for units in transit
    const regeneratedDivisions = movement.divisions.map(division => {
      const newHp = Math.min(division.hp + 10, division.maxHp);
      return {
        ...division,
        hp: newHp,
      };
    });

    const regeneratedMovement = {
      ...movement,
      divisions: regeneratedDivisions,
    };

    if (currentDate >= movement.arrivalTime) {
      completedMovements.push(regeneratedMovement);
    } else {
      remainingMovements.push(regeneratedMovement);
    }
  });

  return { remainingMovements, completedMovements };
}

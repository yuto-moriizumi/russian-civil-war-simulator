import { Movement, ActiveCombat } from '../../../types/game';

interface MovementProcessingResult {
  remainingMovements: Movement[];
  completedMovements: Movement[];
}

/**
 * Processes unit movements, regenerating HP for units in transit
 * and separating completed movements from ongoing ones.
 *
 * Movements that initiated a combat at their destination (pendingCombatId) are
 * paused while that combat is still active — their arrivalTime is extended by
 * 1 hour each tick so they never arrive prematurely.
 */
export function processMovements(
  movingUnits: Movement[],
  currentDate: Date,
  activeCombats: ActiveCombat[] = []
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

    let regeneratedMovement: Movement = {
      ...movement,
      divisions: regeneratedDivisions,
    };

    // If this movement is linked to a combat, check whether to pause it
    if (movement.pendingCombatId) {
      const linkedCombat = activeCombats.find(c => c.id === movement.pendingCombatId);

      if (linkedCombat && !linkedCombat.isComplete) {
        // Combat is still ongoing — pause the movement by extending its arrival time
        const extendedArrival = new Date(regeneratedMovement.arrivalTime);
        extendedArrival.setHours(extendedArrival.getHours() + 1);
        regeneratedMovement = { ...regeneratedMovement, arrivalTime: extendedArrival };
        remainingMovements.push(regeneratedMovement);
        return;
      }

      // Combat is complete (or no longer found) — movement may now arrive
    }

    if (currentDate >= regeneratedMovement.arrivalTime) {
      completedMovements.push(regeneratedMovement);
    } else {
      remainingMovements.push(regeneratedMovement);
    }
  });

  return { remainingMovements, completedMovements };
}

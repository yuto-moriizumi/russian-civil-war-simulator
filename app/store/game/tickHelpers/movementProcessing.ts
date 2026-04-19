import { Movement, ActiveCombat, Region, Relationship } from '../../../types/game';
import { createActiveCombat } from '../../../utils/combat';

interface MovementProcessingResult {
  remainingMovements: Movement[];
  completedMovements: Movement[];
  /** New combats started because enemy divisions appeared at a movement's destination mid-transit */
  newMidTransitCombats: ActiveCombat[];
}

/**
 * Processes unit movements, regenerating HP for units in transit
 * and separating completed movements from ongoing ones.
 *
 * Movements that initiated a combat at their destination (pendingCombatId) are
 * paused while that combat is still active — their arrivalTime is extended by
 * 1 hour each tick so they never arrive prematurely.
 *
 * Also detects when enemy divisions have appeared at a movement's destination
 * mid-transit (after the movement was dispatched without defenders). In that
 * case a new combat is started immediately and the movement is linked to it via
 * pendingCombatId so it waits for the result.
 */
export function processMovements(
  movingUnits: Movement[],
  currentDate: Date,
  activeCombats: ActiveCombat[] = [],
  regions: Record<string, Region> = {},
  relationships: Relationship[] = []
): MovementProcessingResult {
  const remainingMovements: Movement[] = [];
  const completedMovements: Movement[] = [];
  const newMidTransitCombats: ActiveCombat[] = [];

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
    if (regeneratedMovement.pendingCombatId) {
      const allCombats = [...activeCombats, ...newMidTransitCombats];
      const linkedCombat = allCombats.find(c => c.id === regeneratedMovement.pendingCombatId);

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

    // Mid-transit enemy check: if no combat is linked yet and the movement
    // is still en-route, check whether enemies have appeared at the destination.
    if (!regeneratedMovement.pendingCombatId && currentDate < regeneratedMovement.arrivalTime) {
      const destRegion = regions[regeneratedMovement.toRegion];
      if (destRegion && destRegion.owner !== regeneratedMovement.owner) {
        // Determine whether the relationship is hostile
        const theyGrantUs = relationships.find(
          r => r.fromCountry === destRegion.owner && r.toCountry === regeneratedMovement.owner
        )?.type ?? 'neutral';
        const weDeclared = relationships.find(
          r => r.fromCountry === regeneratedMovement.owner && r.toCountry === destRegion.owner
        )?.type ?? 'neutral';
        const hasAutonomy = theyGrantUs === 'autonomy' || weDeclared === 'autonomy';
        const isHostile = !hasAutonomy && theyGrantUs !== 'military_access';

        if (isHostile) {
          // Check if there is already an active combat at the destination (border-specific)
          const existingCombat = [...activeCombats, ...newMidTransitCombats].find(
            c => c.attackerRegionId === regeneratedMovement.fromRegion &&
                 c.defenderRegionId === regeneratedMovement.toRegion &&
                 !c.isComplete
          );

          if (existingCombat) {
            // Link this movement to the existing combat so it waits
            regeneratedMovement = { ...regeneratedMovement, pendingCombatId: existingCombat.id };
            console.log(`[MID-TRANSIT] ${regeneratedMovement.owner} movement linked to existing combat at ${destRegion.name}`);
          } else {
            // Check for newly appeared defenders
            const defenders = destRegion.divisions.filter(d => d.owner === destRegion.owner);
            // Check for other combats on the same defender region (multi-front).
            // If defender divisions are absent from the region (already in another combat),
            // use those combat divisions as the effective defenders.
            const otherCombatsOnRegion = [...activeCombats, ...newMidTransitCombats].filter(
              c => c.defenderRegionId === regeneratedMovement.toRegion && !c.isComplete
            );
            const combatDefenders = defenders.length > 0
              ? defenders
              : otherCombatsOnRegion.length > 0
                ? otherCombatsOnRegion[0].defenderDivisions.map(d => ({ ...d }))
                : [];
            if (combatDefenders.length > 0) {
              const fromRegion = regions[regeneratedMovement.fromRegion];
              const newCombat = createActiveCombat(
                regeneratedMovement.fromRegion,
                fromRegion?.name ?? regeneratedMovement.fromRegion,
                regeneratedMovement.toRegion,
                destRegion.name,
                regeneratedMovement.owner,
                destRegion.owner,
                regeneratedMovement.divisions,
                combatDefenders,
                currentDate
              );
              newMidTransitCombats.push(newCombat);
              regeneratedMovement = { ...regeneratedMovement, pendingCombatId: newCombat.id };
              console.log(`[MID-TRANSIT] Combat started at ${destRegion.name}: ${regeneratedMovement.owner} vs ${destRegion.owner} (enemy appeared mid-transit)`);
            }
          }
        }
      }
    }

    if (currentDate >= regeneratedMovement.arrivalTime) {
      completedMovements.push(regeneratedMovement);
    } else {
      remainingMovements.push(regeneratedMovement);
    }
  });

  return { remainingMovements, completedMovements, newMidTransitCombats };
}

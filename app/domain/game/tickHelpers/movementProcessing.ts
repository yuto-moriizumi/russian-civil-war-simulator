import { Movement, ActiveCombat, Region, Relationship, DivisionState } from '../../../types/game';
import { getDivisionsInRegion } from '../../../utils/divisionState';
import { createActiveCombat } from '../../../utils/combat';
import { GAME_CONFIG } from '../../../constants/gameConfig';
import { SimulationLogger, noOpLogger } from '../engine/types';

interface MovementProcessingResult {
  remainingMovements: Movement[];
  completedMovements: Movement[];
  /** New combats started because enemy divisions appeared at a movement's destination mid-transit */
  newMidTransitCombats: ActiveCombat[];
  updatedDivisions: DivisionState;
}

/**
 * Processes unit movements, regenerating HP for units in transit (directly in
 * DivisionState) and separating completed movements from ongoing ones.
 */
export function processMovements(
  movingUnits: Movement[],
  currentDate: Date,
  activeCombats: ActiveCombat[] = [],
  regions: Record<string, Region> = {},
  relationships: Relationship[] = [],
  divisions: DivisionState = {},
  logger: SimulationLogger = noOpLogger(),
): MovementProcessingResult {
  const remainingMovements: Movement[] = [];
  const completedMovements: Movement[] = [];
  const newMidTransitCombats: ActiveCombat[] = [];
  let runningDivisions = divisions;

  movingUnits.forEach(movement => {
    // Regenerate HP for units in transit directly in DivisionState
    for (const divId of movement.divisionIds) {
      const div = runningDivisions[divId];
      if (div) {
        const newHp = Math.min(div.hp + GAME_CONFIG.HP.REGEN_PER_TICK, div.maxHp);
        if (newHp !== div.hp) {
          runningDivisions = { ...runningDivisions, [divId]: { ...div, hp: newHp } };
        }
      }
    }

    let currentMovement = movement;

    // If this movement is linked to a combat, check whether to pause it
    if (currentMovement.pendingCombatId) {
      const allCombats = [...activeCombats, ...newMidTransitCombats];
      const linkedCombat = allCombats.find(c => c.id === currentMovement.pendingCombatId);

      if (linkedCombat && !linkedCombat.isComplete) {
        const extendedArrival = new Date(currentMovement.arrivalTime);
        extendedArrival.setHours(extendedArrival.getHours() + 1);
        currentMovement = { ...currentMovement, arrivalTime: extendedArrival };
        remainingMovements.push(currentMovement);
        return;
      }
    }

    // Mid-transit enemy check
    if (!currentMovement.pendingCombatId && currentDate < currentMovement.arrivalTime) {
      const destRegion = regions[currentMovement.toRegion];
      if (destRegion && destRegion.owner !== currentMovement.owner) {
        const theyGrantUs = relationships.find(
          r => r.fromCountry === destRegion.owner && r.toCountry === currentMovement.owner
        )?.type ?? 'neutral';
        const weDeclared = relationships.find(
          r => r.fromCountry === currentMovement.owner && r.toCountry === destRegion.owner
        )?.type ?? 'neutral';
        const hasAutonomy = theyGrantUs === 'autonomy' || weDeclared === 'autonomy';
        const isHostile = !hasAutonomy && theyGrantUs !== 'military_access';

        if (isHostile) {
          const existingCombat = [...activeCombats, ...newMidTransitCombats].find(
            c => c.attackerRegionId === currentMovement.fromRegion &&
                 c.defenderRegionId === currentMovement.toRegion &&
                 !c.isComplete
          );

          if (existingCombat) {
            currentMovement = { ...currentMovement, pendingCombatId: existingCombat.id };
            logger.debug(`[MID-TRANSIT] ${currentMovement.owner} movement linked to existing combat at ${destRegion.name}`);
          } else {
            const inTransitFromDest = new Set(
              movingUnits.filter(m => m.fromRegion === currentMovement.toRegion).flatMap(m => m.divisionIds)
            );
            const defenders = getDivisionsInRegion(runningDivisions, currentMovement.toRegion).filter(
              d => d.owner === destRegion.owner && !inTransitFromDest.has(d.id)
            );
            const otherCombatsOnRegion = [...activeCombats, ...newMidTransitCombats].filter(
              c => c.defenderRegionId === currentMovement.toRegion && !c.isComplete
            );
            const combatDefenders = defenders.length > 0
              ? defenders
              : otherCombatsOnRegion.length > 0
                ? otherCombatsOnRegion[0].defenderDivisionIds.map(id => runningDivisions[id]).filter(Boolean)
                : [];
            if (combatDefenders.length > 0) {
              const attackerDivisions = currentMovement.divisionIds.map(id => runningDivisions[id]).filter(Boolean);
              const fromRegion = regions[currentMovement.fromRegion];
              const newCombat = createActiveCombat(
                currentMovement.fromRegion,
                fromRegion?.name ?? currentMovement.fromRegion,
                currentMovement.toRegion,
                destRegion.name,
                currentMovement.owner,
                destRegion.owner,
                attackerDivisions,
                combatDefenders,
                currentDate
              );
              // Clear defenders from DivisionState (regionId = null)
              if (otherCombatsOnRegion.length === 0) {
                for (const d of combatDefenders) {
                  runningDivisions = { ...runningDivisions, [d.id]: { ...d, regionId: null } };
                }
              }
              newMidTransitCombats.push(newCombat);
              currentMovement = { ...currentMovement, pendingCombatId: newCombat.id };
              logger.debug(`[MID-TRANSIT] Combat started at ${destRegion.name}: ${currentMovement.owner} vs ${destRegion.owner} (enemy appeared mid-transit)`);
            }
          }
        }
      }
    }

    if (currentDate >= currentMovement.arrivalTime) {
      completedMovements.push(currentMovement);
    } else {
      remainingMovements.push(currentMovement);
    }
  });

  return { remainingMovements, completedMovements, newMidTransitCombats, updatedDivisions: runningDivisions };
}

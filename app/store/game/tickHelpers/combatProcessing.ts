import { ActiveCombat, Division, GameEvent, NotificationItem, RegionState, Adjacency, Movement } from '../../../types/game';
import { processCombatRounds, shouldProcessCombatRound } from '../../../utils/combat';
import { createGameEvent, createNotification } from '../../../utils/eventUtils';
import { calculateDistance, calculateTravelTime } from '../../../utils/distance';

interface CombatProcessingResult {
  updatedCombats: ActiveCombat[];
  finishedCombats: ActiveCombat[];
  newCombatEvents: GameEvent[];
  newCombatNotifications: NotificationItem[];
  retreatMovements: Movement[];
  /** Divisions that have retreated with their post-combat HP, keyed by fromRegion.
   *  tickActions applies these to regions so retreat movements find correct HP. */
  retreatingDivisionUpdates: { regionId: string; division: import('../../../types/game').Division }[];
}

function getDivisionDestructionLocation(combat: ActiveCombat, fromRegionId: string): string {
  return fromRegionId === combat.attackerRegionId
    ? `the border of ${combat.defenderRegionName}`
    : combat.defenderRegionName;
}

function createDivisionDestroyedEvent(
  division: Division,
  combat: ActiveCombat,
  fromRegionId: string,
  currentDate: Date
): GameEvent {
  const location = getDivisionDestructionLocation(combat, fromRegionId);
  const reason = 'reduced to 0 HP in combat and no friendly retreat destination was available';

  console.log(
    `[DIVISION DESTROYED] ${division.name} (${division.owner}) disappeared at ${location}; reason: ${reason}`
  );

  return createGameEvent(
    'division_destroyed',
    `${division.name} Destroyed`,
    `${division.name} (${division.owner}) disappeared at ${location}. Reason: ${reason}.`,
    currentDate,
    division.owner,
    fromRegionId
  );
}

/**
 * Processes active combats, running combat rounds and generating events
 */
export function processCombats(
  activeCombats: ActiveCombat[],
  currentDate: Date,
  regions: RegionState,
  adjacency: Adjacency,
  regionCentroids: Record<string, [number, number]>
): CombatProcessingResult {
  const updatedCombats: ActiveCombat[] = [];
  const finishedCombats: ActiveCombat[] = [];
  const newCombatEvents: GameEvent[] = [];
  const newCombatNotifications: NotificationItem[] = [];
  const retreatMovements: Movement[] = [];
  const retreatingDivisionUpdates: CombatProcessingResult['retreatingDivisionUpdates'] = [];
  const eligibleCombats: ActiveCombat[] = [];

  activeCombats.forEach(combat => {
    if (combat.isComplete) {
      finishedCombats.push(combat);
      return;
    }

    if (shouldProcessCombatRound(combat, currentDate)) {
      eligibleCombats.push(combat);
    } else {
      updatedCombats.push(combat);
    }
  });

  // Process eligible combats together so multi-directional attacks on the same
  // defender region share aggregated damage
  if (eligibleCombats.length > 0) {
    const roundResults = processCombatRounds(eligibleCombats, regions, adjacency, currentDate);

    roundResults.forEach(result => {
      const updatedCombat = result.combat;
      
      // Convert retreating divisions to movements
      result.retreatingDivisions.forEach(({ division, toRegionId, fromRegionId }) => {
        // Record the post-combat division state so tickActions can update the region.
        // This ensures the region has the correct HP when the retreat movement resolves.
        retreatingDivisionUpdates.push({ regionId: fromRegionId, division });

        if (toRegionId && toRegionId !== fromRegionId) {
          const distanceKm = calculateDistance(fromRegionId, toRegionId, regionCentroids);
          const travelTimeHours = calculateTravelTime(distanceKm, true);

          const arrivalTime = new Date(currentDate);
          arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

          const retreatMovement: Movement = {
            id: `retreat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fromRegion: fromRegionId,
            toRegion: toRegionId,
            divisions: [division],
            departureTime: new Date(currentDate),
            arrivalTime,
            owner: division.owner,
          };

          retreatMovements.push(retreatMovement);
        }
        if (toRegionId === null) {
          newCombatEvents.push(createDivisionDestroyedEvent(division, updatedCombat, fromRegionId, currentDate));
        }
      });

      if (updatedCombat.isComplete) {
        finishedCombats.push(updatedCombat);
        
        const attackerWon = updatedCombat.victor === updatedCombat.attackerCountry;
        const attackerLosses = updatedCombat.initialAttackerCount - updatedCombat.attackerDivisions.length;
        const defenderLosses = updatedCombat.initialDefenderCount - updatedCombat.defenderDivisions.length;
        
        if (attackerWon) {
          const combatEvent = createGameEvent(
            'region_captured',
            `${updatedCombat.defenderRegionName} Captured!`,
            `${updatedCombat.attackerCountry === 'soviet' ? 'Soviet' : 'White'} forces captured ${updatedCombat.defenderRegionName} from ${updatedCombat.attackerRegionName}. Attackers lost ${attackerLosses} divisions. Defenders lost ${defenderLosses} divisions.`,
            currentDate,
            updatedCombat.attackerCountry,
            updatedCombat.defenderRegionId
          );

          newCombatEvents.push(combatEvent);
          newCombatNotifications.push(createNotification(combatEvent, currentDate));
        }

        if (attackerWon) {
          const defenderLostEvent = createGameEvent(
            'region_lost',
            `${updatedCombat.defenderRegionName} Lost!`,
            `${updatedCombat.attackerCountry === 'soviet' ? 'Soviet' : 'White'} forces captured ${updatedCombat.defenderRegionName}. Attackers lost ${attackerLosses} divisions. Defenders lost ${defenderLosses} divisions.`,
            currentDate,
            updatedCombat.defenderCountry,
            updatedCombat.defenderRegionId
          );
          newCombatEvents.push(defenderLostEvent);
          newCombatNotifications.push(createNotification(defenderLostEvent, currentDate));
        }
      } else {
        updatedCombats.push(updatedCombat);
      }
    });
  }

  return { updatedCombats, finishedCombats, newCombatEvents, newCombatNotifications, retreatMovements, retreatingDivisionUpdates };
}

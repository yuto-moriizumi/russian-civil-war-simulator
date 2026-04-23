import { ActiveCombat, GameEvent, NotificationItem, RegionState, Adjacency, Movement, DivisionState, Division } from '../../../types/game';
import { processCombatRounds } from '../sharedDefenseProcessing';
import { shouldProcessCombatRound } from '../combat';
import { createGameEvent, createNotification } from '../eventUtils';
import { calculateDistance, calculateTravelTime } from '../../../utils/distance';
import { SimulationLogger, noOpLogger } from '../engine/types';

interface CombatProcessingResult {
  updatedCombats: ActiveCombat[];
  finishedCombats: ActiveCombat[];
  newCombatEvents: GameEvent[];
  newCombatNotifications: NotificationItem[];
  retreatMovements: Movement[];
  updatedDivisions: DivisionState;
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
  currentDate: Date,
  logger: SimulationLogger
): GameEvent {
  const location = getDivisionDestructionLocation(combat, fromRegionId);
  const reason = 'reduced to 0 HP in combat and no friendly retreat destination was available';

  logger.debug(
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
 * Processes active combats, running combat rounds and generating events.
 * HP updates are applied directly to the returned DivisionState.
 */
export function processCombats(
  activeCombats: ActiveCombat[],
  currentDate: Date,
  regions: RegionState,
  adjacency: Adjacency,
  regionCentroids: Record<string, [number, number]>,
  divisions: DivisionState,
  logger: SimulationLogger = noOpLogger(),
): CombatProcessingResult {
  const updatedCombats: ActiveCombat[] = [];
  const finishedCombats: ActiveCombat[] = [];
  const newCombatEvents: GameEvent[] = [];
  const newCombatNotifications: NotificationItem[] = [];
  const retreatMovements: Movement[] = [];
  const eligibleCombats: ActiveCombat[] = [];

  let runningDivisions = divisions;

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

  if (eligibleCombats.length > 0) {
    const roundResults = processCombatRounds(eligibleCombats, regions, adjacency, currentDate, runningDivisions);

    roundResults.forEach(result => {
      const updatedCombat = result.combat;
      runningDivisions = result.updatedDivisions;

      result.retreatingDivisions.forEach(({ divisionId, toRegionId, fromRegionId }) => {
        const division = runningDivisions[divisionId];

        if (toRegionId && toRegionId !== fromRegionId) {
          const distanceKm = calculateDistance(fromRegionId, toRegionId, regionCentroids);
          const travelTimeHours = calculateTravelTime(distanceKm, true);

          const arrivalTime = new Date(currentDate);
          arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

          const retreatMovement: Movement = {
            id: `retreat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fromRegion: fromRegionId,
            toRegion: toRegionId,
            divisionIds: [divisionId],
            departureTime: new Date(currentDate),
            arrivalTime,
            owner: division?.owner ?? updatedCombat.attackerCountry,
          };

          retreatMovements.push(retreatMovement);
        }
        if (toRegionId === null && division) {
          newCombatEvents.push(createDivisionDestroyedEvent(division, updatedCombat, fromRegionId, currentDate, logger));
          const { [divisionId]: _removed, ...rest } = runningDivisions;
          runningDivisions = rest;
        }
      });

      if (updatedCombat.isComplete) {
        finishedCombats.push(updatedCombat);

        const attackerWon = updatedCombat.victor === updatedCombat.attackerCountry;
        const attackerLosses = updatedCombat.initialAttackerCount - updatedCombat.attackerDivisionIds.length;
        const defenderLosses = updatedCombat.initialDefenderCount - updatedCombat.defenderDivisionIds.length;

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

  return { updatedCombats, finishedCombats, newCombatEvents, newCombatNotifications, retreatMovements, updatedDivisions: runningDivisions };
}

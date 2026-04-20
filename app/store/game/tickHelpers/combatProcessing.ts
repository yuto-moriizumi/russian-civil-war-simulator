import { ActiveCombat, GameEvent, NotificationItem, RegionState, Adjacency, Movement } from '../../../types/game';
import { processCombatRound, shouldProcessCombatRound } from '../../../utils/combat';
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

  activeCombats.forEach(combat => {
    if (combat.isComplete) {
      finishedCombats.push(combat);
      return;
    }

    if (shouldProcessCombatRound(combat, currentDate)) {
      const result = processCombatRound(
        {
          ...combat,
          lastRoundTime: new Date(currentDate),
        },
        regions,
        adjacency
      );

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
        // If toRegionId is null, division is destroyed
      });

      if (updatedCombat.isComplete) {
        finishedCombats.push(updatedCombat);
        
        const attackerWon = updatedCombat.victor === updatedCombat.attackerCountry;
        const attackerLosses = updatedCombat.initialAttackerCount - updatedCombat.attackerDivisions.length;
        const defenderLosses = updatedCombat.initialDefenderCount - updatedCombat.defenderDivisions.length;
        
        const combatEvent = createGameEvent(
          attackerWon ? 'region_captured' : 'combat_defeat',
          attackerWon ? `${updatedCombat.defenderRegionName} Captured!` : `Battle for ${updatedCombat.defenderRegionName} Lost`,
          `${updatedCombat.attackerCountry === 'soviet' ? 'Soviet' : 'White'} forces ${attackerWon ? 'captured' : 'failed to capture'} ${updatedCombat.defenderRegionName} from ${updatedCombat.attackerRegionName}. Attackers lost ${attackerLosses} divisions. Defenders lost ${defenderLosses} divisions.`,
          currentDate,
          updatedCombat.attackerCountry,
          updatedCombat.defenderRegionId
        );

        newCombatEvents.push(combatEvent);
        newCombatNotifications.push(createNotification(combatEvent, currentDate));

        // Also notify the relevant opposing side
        if (attackerWon) {
          // Notify the defender that they lost the region
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
        } else {
          // Notify the defender (winner) that they repelled the attack
          const defenderWonEvent = createGameEvent(
            'combat_victory',
            `${updatedCombat.defenderRegionName} Defended!`,
            `${updatedCombat.defenderCountry === 'soviet' ? 'Soviet' : 'White'} forces repelled the attack on ${updatedCombat.defenderRegionName} from ${updatedCombat.attackerRegionName}. Attackers lost ${attackerLosses} divisions. Defenders lost ${defenderLosses} divisions.`,
            currentDate,
            updatedCombat.defenderCountry,
            updatedCombat.defenderRegionId
          );
          newCombatEvents.push(defenderWonEvent);
          newCombatNotifications.push(createNotification(defenderWonEvent, currentDate));
        }
      } else {
        updatedCombats.push(updatedCombat);
      }
    } else {
      updatedCombats.push(combat);
    }
  });

  return { updatedCombats, finishedCombats, newCombatEvents, newCombatNotifications, retreatMovements, retreatingDivisionUpdates };
}

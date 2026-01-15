import { ActiveCombat, GameEvent, NotificationItem, RegionState, Adjacency, Movement } from '../../../types/game';
import { processCombatRound, shouldProcessCombatRound } from '../../../utils/combat';
import { createGameEvent } from '../../../utils/eventUtils';
import { calculateDistance, calculateTravelTime } from '../../../utils/distance';

interface CombatProcessingResult {
  updatedCombats: ActiveCombat[];
  finishedCombats: ActiveCombat[];
  newCombatEvents: GameEvent[];
  newCombatNotifications: NotificationItem[];
  retreatMovements: Movement[];
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
        if (toRegionId) {
          // Create a retreat movement (faster than normal movement - 2x speed = 8 km/h)
          const distanceKm = calculateDistance(fromRegionId, toRegionId, regionCentroids);
          const travelTimeHours = calculateTravelTime(distanceKm, true); // true = retreat speed
          
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
        // If toRegionId is null, division is destroyed (handled by not creating movement)
      });

      if (updatedCombat.isComplete) {
        finishedCombats.push(updatedCombat);
        
        const attackerWon = updatedCombat.victor === updatedCombat.attackerFaction;
        const attackerLosses = updatedCombat.initialAttackerCount - updatedCombat.attackerDivisions.length;
        const defenderLosses = updatedCombat.initialDefenderCount - updatedCombat.defenderDivisions.length;
        
        const combatEvent = createGameEvent(
          attackerWon ? 'region_captured' : 'combat_defeat',
          attackerWon ? `${updatedCombat.regionName} Captured!` : `Battle for ${updatedCombat.regionName} Lost`,
          `${updatedCombat.attackerFaction === 'soviet' ? 'Soviet' : 'White'} forces ${attackerWon ? 'captured' : 'failed to capture'} ${updatedCombat.regionName}. Attackers lost ${attackerLosses} divisions. Defenders lost ${defenderLosses} divisions.`,
          currentDate,
          updatedCombat.attackerFaction,
          updatedCombat.regionId
        );
        
        newCombatEvents.push(combatEvent);
        // Notification removed - event still logged in EventsModal
      } else {
        updatedCombats.push(updatedCombat);
      }
    } else {
      updatedCombats.push(combat);
    }
  });

  return { updatedCombats, finishedCombats, newCombatEvents, newCombatNotifications, retreatMovements };
}

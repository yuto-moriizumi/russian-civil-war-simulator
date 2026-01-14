import { ActiveCombat, GameEvent, NotificationItem, RegionState, Adjacency, Division } from '../../../types/game';
import { processCombatRound, shouldProcessCombatRound } from '../../../utils/combat';
import { createGameEvent, createNotification } from '../../../utils/eventUtils';

interface CombatProcessingResult {
  updatedCombats: ActiveCombat[];
  finishedCombats: ActiveCombat[];
  newCombatEvents: GameEvent[];
  newCombatNotifications: NotificationItem[];
  retreatingDivisions: { division: Division; toRegionId: string | null }[];
}

/**
 * Processes active combats, running combat rounds and generating events
 */
export function processCombats(
  activeCombats: ActiveCombat[],
  currentDate: Date,
  regions: RegionState,
  adjacency: Adjacency
): CombatProcessingResult {
  const updatedCombats: ActiveCombat[] = [];
  const finishedCombats: ActiveCombat[] = [];
  const newCombatEvents: GameEvent[] = [];
  const newCombatNotifications: NotificationItem[] = [];
  const retreatingDivisions: { division: Division; toRegionId: string | null }[] = [];

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
      retreatingDivisions.push(...result.retreatingDivisions);

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
        newCombatNotifications.push(createNotification(combatEvent, currentDate));
      } else {
        updatedCombats.push(updatedCombat);
      }
    } else {
      updatedCombats.push(combat);
    }
  });

  return { updatedCombats, finishedCombats, newCombatEvents, newCombatNotifications, retreatingDivisions };
}

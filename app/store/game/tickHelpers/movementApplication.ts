import { Movement, ActiveCombat, Region, GameEvent, NotificationItem } from '../../../types/game';
import { createActiveCombat } from '../../../utils/combat';
import { createGameEvent, createNotification } from '../../../utils/eventUtils';

interface MovementApplicationContext {
  regions: Record<string, Region>;
  combats: ActiveCombat[];
  events: GameEvent[];
  notifications: NotificationItem[];
}

interface MovementApplicationResult {
  nextRegions: Record<string, Region>;
  nextCombats: ActiveCombat[];
  nextEvents: GameEvent[];
  nextNotifications: NotificationItem[];
}

/**
 * Applies completed movements to regions, handling friendly reinforcements,
 * combat reinforcements, undefended captures, and initiating new combats
 */
export function applyCompletedMovements(
  completedMovements: Movement[],
  context: MovementApplicationContext,
  currentDate: Date
): MovementApplicationResult {
  const nextRegions = { ...context.regions };
  const nextCombats = [...context.combats];
  const nextEvents = [...context.events];
  const nextNotifications = [...context.notifications];

  completedMovements.forEach(movement => {
    const { toRegion, divisions, owner } = movement;
    const to = nextRegions[toRegion];
    if (!to) return;

    if (to.owner === owner) {
      // Friendly region - just add divisions
      nextRegions[toRegion] = {
        ...to,
        divisions: [...to.divisions, ...divisions],
      };
    } else {
      // Enemy region - check for ongoing combat
      const ongoingCombat = nextCombats.find(c => c.regionId === toRegion && !c.isComplete);
      
      if (ongoingCombat) {
        // There's an ongoing combat - add reinforcements to the appropriate side
        const combatIndex = nextCombats.findIndex(c => c.id === ongoingCombat.id);
        
        if (owner === ongoingCombat.attackerFaction) {
          // Join the attackers
          const updatedCombat = {
            ...ongoingCombat,
            attackerDivisions: [...ongoingCombat.attackerDivisions, ...divisions],
            initialAttackerHp: ongoingCombat.initialAttackerHp + divisions.reduce((sum, d) => sum + d.hp, 0),
            initialAttackerCount: ongoingCombat.initialAttackerCount + divisions.length,
          };
          nextCombats[combatIndex] = updatedCombat;
          
          console.log(`[REINFORCEMENTS] ${divisions.length} ${owner} divisions joined the attackers in combat at ${to.name}`);
          
          const reinforcementEvent = createGameEvent(
            'combat_victory',
            `Reinforcements Arrive!`,
            `${owner === 'soviet' ? 'Soviet' : 'White'} reinforcements (${divisions.length} divisions) have joined the attack on ${to.name}.`,
            currentDate,
            owner,
            toRegion
          );
          nextEvents.push(reinforcementEvent);
          nextNotifications.push(createNotification(reinforcementEvent, currentDate));
        } else if (owner === ongoingCombat.defenderFaction) {
          // Join the defenders
          const updatedCombat = {
            ...ongoingCombat,
            defenderDivisions: [...ongoingCombat.defenderDivisions, ...divisions],
            initialDefenderHp: ongoingCombat.initialDefenderHp + divisions.reduce((sum, d) => sum + d.hp, 0),
            initialDefenderCount: ongoingCombat.initialDefenderCount + divisions.length,
          };
          nextCombats[combatIndex] = updatedCombat;
          
          console.log(`[REINFORCEMENTS] ${divisions.length} ${owner} divisions joined the defenders in combat at ${to.name}`);
          
          const reinforcementEvent = createGameEvent(
            'combat_victory',
            `Reinforcements Arrive!`,
            `${owner === 'soviet' ? 'Soviet' : 'White'} reinforcements (${divisions.length} divisions) have arrived to defend ${to.name}.`,
            currentDate,
            owner,
            toRegion
          );
          nextEvents.push(reinforcementEvent);
          nextNotifications.push(createNotification(reinforcementEvent, currentDate));
        }
      } else {
        // No ongoing combat - follow standard logic
        const defenderDivisions = to.divisions;
        if (defenderDivisions.length === 0) {
          // Undefended capture
          nextRegions[toRegion] = {
            ...to,
            owner: owner,
            divisions: divisions,
          };
          const captureEvent = createGameEvent(
            'region_captured',
            `${to.name} Captured!`,
            `${owner === 'soviet' ? 'Soviet' : 'White'} forces captured the undefended region of ${to.name}.`,
            currentDate,
            owner,
            toRegion
          );
          nextEvents.push(captureEvent);
          nextNotifications.push(createNotification(captureEvent, currentDate));
        } else {
          // Initiate new combat
          const newCombat = createActiveCombat(
            toRegion,
            to.name,
            owner,
            to.owner,
            divisions,
            defenderDivisions,
            currentDate
          );
          nextCombats.push(newCombat);
          nextRegions[toRegion] = { ...to, divisions: [] };
          const battleEvent = createGameEvent(
            'combat_victory',
            `Battle for ${to.name} Begins!`,
            `${owner === 'soviet' ? 'Soviet' : 'White'} forces (${divisions.length} divisions) are attacking ${to.owner === 'soviet' ? 'Soviet' : 'White'} defenders (${defenderDivisions.length} divisions) at ${to.name}.`,
            currentDate,
            owner,
            toRegion
          );
          nextEvents.push(battleEvent);
          nextNotifications.push(createNotification(battleEvent, currentDate));
        }
      }
    }
  });

  return { nextRegions, nextCombats, nextEvents, nextNotifications };
}

/**
 * Applies finished combat results to regions
 */
export function applyFinishedCombats(
  finishedCombats: ActiveCombat[],
  regions: Record<string, Region>
): Record<string, Region> {
  const nextRegions = { ...regions };

  finishedCombats.forEach(combat => {
    const region = nextRegions[combat.regionId];
    if (!region) return;

    if (combat.victor === combat.attackerFaction) {
      nextRegions[combat.regionId] = {
        ...region,
        owner: combat.attackerFaction,
        divisions: combat.attackerDivisions,
      };
    } else {
      nextRegions[combat.regionId] = {
        ...region,
        divisions: combat.defenderDivisions,
      };
    }
  });

  return nextRegions;
}

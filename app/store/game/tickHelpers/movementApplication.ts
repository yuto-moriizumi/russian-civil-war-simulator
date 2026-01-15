import { Movement, ActiveCombat, Region, GameEvent, NotificationItem, Relationship } from '../../../types/game';
import { createActiveCombat } from '../../../utils/combat';
import { createGameEvent, createNotification } from '../../../utils/eventUtils';

interface MovementApplicationContext {
  regions: Record<string, Region>;
  combats: ActiveCombat[];
  events: GameEvent[];
  notifications: NotificationItem[];
  relationships: Relationship[];
}

interface MovementApplicationResult {
  nextRegions: Record<string, Region>;
  nextCombats: ActiveCombat[];
  nextEvents: GameEvent[];
  nextNotifications: NotificationItem[];
  interceptedMovementIds: string[];
}

/**
 * Applies completed movements to regions, handling friendly reinforcements,
 * combat reinforcements, undefended captures, and initiating new combats.
 * Also detects meeting engagements where opposing forces are moving into each other's territory.
 */
export function applyCompletedMovements(
  completedMovements: Movement[],
  allMovements: Movement[],
  context: MovementApplicationContext,
  currentDate: Date
): MovementApplicationResult {
  const nextRegions = { ...context.regions };
  const nextCombats = [...context.combats];
  const nextEvents = [...context.events];
  const nextNotifications = [...context.notifications];
  const interceptedMovementIds: string[] = [];

  completedMovements.forEach(movement => {
    // Skip if this movement was already intercepted as a counter-movement
    if (interceptedMovementIds.includes(movement.id)) return;

    const { toRegion, fromRegion, divisions, owner } = movement;
    const to = nextRegions[toRegion];
    if (!to) return;

    if (to.owner === owner) {
      // Friendly region - just add divisions
      nextRegions[toRegion] = {
        ...to,
        divisions: [...to.divisions, ...divisions],
      };
    } else {
      // Enemy region - check relationship type
      // Check if they grant us access/war
      const theirRelationship = context.relationships.find(
        r => r.fromFaction === to.owner && r.toFaction === owner
      );
      const theyGrantUs = theirRelationship ? theirRelationship.type : 'neutral';
      
      // Check if we declared war on them
      const ourRelationship = context.relationships.find(
        r => r.fromFaction === owner && r.toFaction === to.owner
      );
      const weDeclared = ourRelationship ? ourRelationship.type : 'neutral';
      
      // Check for autonomy relationship (bidirectional)
      const hasAutonomy = theyGrantUs === 'autonomy' || weDeclared === 'autonomy';
      
      // Determine the effective relationship
      let effectiveRelationship = weDeclared === 'war' ? 'war' : theyGrantUs;
      
      // Override: autonomy grants military access
      if (hasAutonomy) {
        effectiveRelationship = 'military_access';
      }
      
      if (effectiveRelationship === 'military_access' || effectiveRelationship === 'autonomy') {
        // Military access - units can move but no occupation or combat
        nextRegions[toRegion] = {
          ...to,
          divisions: [...to.divisions, ...divisions],
        };
        console.log(`[MILITARY ACCESS] ${divisions.length} ${owner} divisions moved to ${to.name} with military access`);
        
      } else if (effectiveRelationship === 'war' || effectiveRelationship === 'neutral') {
        // War state or neutral (hostile) - proceed with combat/occupation logic

        // INTERCEPTION LOGIC: Check for counter-movements (Meeting Engagement)
        // If enemy units are moving FROM our destination TO our origin, they meet at our destination
        const counterMovement = allMovements.find(m => 
          m.fromRegion === toRegion && 
          m.toRegion === fromRegion && 
          m.owner !== owner &&
          !interceptedMovementIds.includes(m.id)
        );

        const interceptingDivisions = counterMovement ? counterMovement.divisions : [];
        if (counterMovement) {
          interceptedMovementIds.push(counterMovement.id);
          console.log(`[MEETING ENGAGEMENT] ${owner} forces intercepted ${counterMovement.owner} forces moving from ${to.name} to origin`);
        }

        // Check for ongoing combat
        const ongoingCombat = nextCombats.find(c => c.regionId === toRegion && !c.isComplete);
        
        if (ongoingCombat) {
          // There's an ongoing combat - add reinforcements to the appropriate side
          const combatIndex = nextCombats.findIndex(c => c.id === ongoingCombat.id);
          
          if (owner === ongoingCombat.attackerFaction) {
            // Join the attackers
            const totalDivisionsToAdd = [...divisions];
            const updatedCombat = {
              ...ongoingCombat,
              attackerDivisions: [...ongoingCombat.attackerDivisions, ...totalDivisionsToAdd],
              initialAttackerHp: ongoingCombat.initialAttackerHp + totalDivisionsToAdd.reduce((sum, d) => sum + d.hp, 0),
              initialAttackerCount: ongoingCombat.initialAttackerCount + totalDivisionsToAdd.length,
            };

            // If we intercepted a counter-movement, they join the defenders
            if (counterMovement) {
              updatedCombat.defenderDivisions = [...updatedCombat.defenderDivisions, ...interceptingDivisions];
              updatedCombat.initialDefenderHp += interceptingDivisions.reduce((sum, d) => sum + d.hp, 0);
              updatedCombat.initialDefenderCount += interceptingDivisions.length;
            }

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
          } else if (owner === ongoingCombat.defenderFaction) {
            // Join the defenders
            const totalDivisionsToAdd = [...divisions, ...interceptingDivisions];
            const updatedCombat = {
              ...ongoingCombat,
              defenderDivisions: [...ongoingCombat.defenderDivisions, ...totalDivisionsToAdd],
              initialDefenderHp: ongoingCombat.initialDefenderHp + totalDivisionsToAdd.reduce((sum, d) => sum + d.hp, 0),
              initialDefenderCount: ongoingCombat.initialDefenderCount + totalDivisionsToAdd.length,
            };

            // If we intercepted a counter-movement, they join the attackers (if they belong to attacker faction)
            // This case is unlikely given the counter-movement check, but for completeness:
            if (counterMovement && counterMovement.owner === ongoingCombat.attackerFaction) {
               // This would be weird, but let's handle it
               updatedCombat.attackerDivisions = [...updatedCombat.attackerDivisions, ...interceptingDivisions];
               updatedCombat.initialAttackerHp += interceptingDivisions.reduce((sum, d) => sum + d.hp, 0);
               updatedCombat.initialAttackerCount += interceptingDivisions.length;
               // And remove them from the defender add
               updatedCombat.defenderDivisions = updatedCombat.defenderDivisions.filter(d => !interceptingDivisions.includes(d));
            }

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
          }
        } else {
          // No ongoing combat - follow standard combat/occupation logic
          const existingDefenderDivisions = to.divisions.filter(d => d.owner === to.owner);
          const totalDefenderDivisions = [...existingDefenderDivisions, ...interceptingDivisions];

          if (totalDefenderDivisions.length === 0) {
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
              totalDefenderDivisions,
              currentDate
            );
            nextCombats.push(newCombat);
            nextRegions[toRegion] = { ...to, divisions: [] };
            const battleEvent = createGameEvent(
              'combat_victory',
              `Battle for ${to.name} Begins!`,
              `${owner === 'soviet' ? 'Soviet' : 'White'} forces (${divisions.length} divisions) are attacking ${to.owner === 'soviet' ? 'Soviet' : 'White'} defenders (${totalDefenderDivisions.length} divisions) at ${to.name}.`,
              currentDate,
              owner,
              toRegion
            );
            nextEvents.push(battleEvent);
          }
        }
      }
    }
  });

  return { nextRegions, nextCombats, nextEvents, nextNotifications, interceptedMovementIds };
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

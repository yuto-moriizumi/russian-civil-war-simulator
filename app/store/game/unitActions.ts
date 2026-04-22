import { Movement, ArmyGroup, ActiveCombat } from '../../types/game';
import { createDivision, createActiveCombat } from '../../utils/combat';
import { createGameEvent, createNotification, getOrdinalSuffix } from '../../utils/eventUtils';
import { generateArmyGroupName } from '../../utils/armyGroupNaming';
import { ARMY_GROUP_COLORS } from './initialState';
import { GameStore } from './types';
import { StoreApi } from 'zustand';
import { calculateDistance, calculateTravelTime } from '../../utils/distance';
import { findPath, buildCanEnterPredicate } from '../../utils/pathfinding';
import { getDivisionsInRegion } from '../../utils/divisionState';
import { createRegionOwnersPatch } from '../../utils/regionState';

/**
 * Returns the effective defenderDivisions to use when starting a new combat,
 * copying from an existing combat if there is already one on the same region
 * (multi-front: same defenders fight on multiple borders).
 * Also returns whether this is the first combat on the defender region.
 */
function resolveMultiFrontDefenders(
  toRegion: string,
  activeCombats: ActiveCombat[],
  regionDivisions: ReturnType<typeof getDivisionsInRegion>,
  destOwner: string
): { combatDefenderDivisions: ActiveCombat['defenderDivisions']; isFirstCombat: boolean } {
  const existing = activeCombats.filter(c => c.defenderRegionId === toRegion && !c.isComplete);
  return {
    combatDefenderDivisions: existing.length > 0
      ? existing[0].defenderDivisions.map(d => ({ ...d }))
      : regionDivisions.filter(d => d.owner === destOwner),
    isFirstCombat: existing.length === 0,
  };
}

/**
 * Defines actions related to unit creation, deployment, and movement:
 * - Creating infantry divisions
 * - Moving units between regions
 * - Deploying units to army groups
 */
export const createUnitActions = (
  set: StoreApi<GameStore>['setState'],
  get: StoreApi<GameStore>['getState']
) => ({
  createInfantry: () => {
    const { selectedCountry, dateTime, gameEvents, regions, selectedGroupId, armyGroups, selectedRegion, countryBonuses, divisions } = get();

    if (selectedCountry) {
      let deploymentTarget: string | null = null;
      let targetGroupId: string | null = selectedGroupId;

      if (selectedGroupId) {
        const group = armyGroups.find(g => g.id === selectedGroupId);
        if (group) {
          const validRegions = group.regionIds.filter(id => {
            const region = regions[id];
            return region && region.owner === selectedCountry.id;
          });
          if (validRegions.length > 0) {
            deploymentTarget = validRegions[Math.floor(Math.random() * validRegions.length)];
          }
        }
      }

      if (!deploymentTarget && selectedRegion) {
        const region = regions[selectedRegion];
        if (region && region.owner === selectedCountry.id) {
          deploymentTarget = selectedRegion;
        }
      }

      if (!deploymentTarget) {
        const ownedRegions = Object.keys(regions).filter(id => regions[id].owner === selectedCountry.id);
        if (ownedRegions.length > 0) {
          deploymentTarget = ownedRegions[Math.floor(Math.random() * ownedRegions.length)];
        }
      }

      if (!deploymentTarget) {
        console.warn('No valid deployment target found for new division');
        return;
      }

      if (!targetGroupId) {
        const playerArmyGroups = armyGroups.filter(g => g.owner === selectedCountry.id);

        if (playerArmyGroups.length === 0) {
          const newGroupId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const ownedRegions = Object.keys(regions).filter(id => regions[id].owner === selectedCountry.id);
          const newGroup: ArmyGroup = {
            id: newGroupId,
            name: generateArmyGroupName(armyGroups, selectedCountry.id),
            regionIds: ownedRegions,
            color: ARMY_GROUP_COLORS[0],
            owner: selectedCountry.id,
            theaterId: null,
            mode: 'none',
          };

          set({ armyGroups: [...armyGroups, newGroup], selectedGroupId: newGroupId });
          targetGroupId = newGroupId;
        } else {
          targetGroupId = playerArmyGroups[0].id;
        }
      }

      if (!targetGroupId) {
        console.warn('No army group available for new division');
        return;
      }

      // Count existing divisions to generate unique name
      const existingDivisions = Object.values(divisions).filter(d => d.owner === selectedCountry.id).length;
      const divisionNumber = existingDivisions + 1;
      const divisionName = `${selectedCountry.id === 'soviet' ? 'Red' : 'White'} Guard ${divisionNumber}${getOrdinalSuffix(divisionNumber)} Division`;
      const newDivision = createDivision(
        selectedCountry.id,
        divisionName,
        targetGroupId,
        countryBonuses[selectedCountry.id]
      );

      const targetRegion = regions[deploymentTarget];
      const newEvent = createGameEvent(
        'unit_deployed',
        `Division Trained and Deployed`,
        `${divisionName} has been trained and deployed to ${targetRegion.name}. HP: ${newDivision.hp}, Attack: ${newDivision.attack}, Defence: ${newDivision.defence}.`,
        dateTime,
        selectedCountry.id,
        deploymentTarget
      );

      const newNotification = createNotification(newEvent, dateTime);

      set({
        divisions: { ...divisions, [newDivision.id]: { ...newDivision, regionId: deploymentTarget } },
        gameEvents: [...gameEvents, newEvent],
        notifications: [...get().notifications, newNotification],
      });
    }
  },

  deployUnit: () => {
    console.warn('deployUnit is deprecated - units are now deployed directly when created');
  },

  moveUnits: (fromRegion: string, toRegion: string, count: number, divisionIds?: string[]) => {
    const { adjacency, regions, selectedCountry, dateTime, movingUnits, relationships, activeCombats, gameEvents, notifications, divisions } = get();

    const isDirectlyAdjacent = adjacency[fromRegion]?.includes(toRegion);
    let firstHop = toRegion;
    let remainingPath: string[] | undefined;
    if (!isDirectlyAdjacent) {
      const canEnter = buildCanEnterPredicate(selectedCountry?.id ?? ('' as import('../../types/game').CountryId), regions, relationships);
      const path = findPath(fromRegion, toRegion, adjacency, canEnter);
      if (!path || path.length === 0) {
        console.warn(`Cannot move from ${fromRegion} to ${toRegion}: no accessible path found`);
        return;
      }
      firstHop = path[0];
      remainingPath = path.slice(1);
    }

    const actualToRegion = firstHop;
    const finalDestination = remainingPath && remainingPath.length > 0 ? toRegion : undefined;

    if (!adjacency[fromRegion]?.includes(actualToRegion)) return;

    const from = regions[fromRegion];
    const to = regions[actualToRegion];
    const fromDivisions = getDivisionsInRegion(divisions, fromRegion);
    if (!from || fromDivisions.length < count || !selectedCountry) return;

    const fromOwner = from.owner;
    const isOwnRegion = fromOwner === selectedCountry.id;
    if (!isOwnRegion) {
      const theirRel = relationships.find(
        r => r.fromCountry === fromOwner && r.toCountry === selectedCountry.id
      );
      const ourRel = relationships.find(
        r => r.fromCountry === selectedCountry.id && r.toCountry === fromOwner
      );
      const theyGrantUs = theirRel ? theirRel.type : 'neutral';
      const weDeclared = ourRel ? ourRel.type : 'neutral';
      const hasAccess =
        theyGrantUs === 'military_access' ||
        theyGrantUs === 'autonomy' ||
        weDeclared === 'autonomy';
      const hasOurDivisions = fromDivisions.some(d => d.owner === selectedCountry.id);
      if (!hasAccess || !hasOurDivisions) return;
    }

    const targetOwner = to.owner;
    const theyGrantUs = relationships.find(r => r.fromCountry === targetOwner && r.toCountry === selectedCountry.id)?.type ?? 'neutral';
    const weDeclared = relationships.find(r => r.fromCountry === selectedCountry.id && r.toCountry === targetOwner)?.type ?? 'neutral';
    const hasAutonomy = theyGrantUs === 'autonomy' || weDeclared === 'autonomy';

    if (targetOwner !== selectedCountry.id) {
      const canMove = theyGrantUs !== 'neutral' || weDeclared === 'war' || hasAutonomy;
      if (!canMove) {
        console.warn(`Cannot move to ${to.name}: No military access or war state with ${targetOwner}`);
        return;
      }
    }

    const ownDivisions = fromDivisions.filter(d => d.owner === selectedCountry.id);
    const divisionsToMove = divisionIds && divisionIds.length > 0
      ? ownDivisions.filter(d => divisionIds.includes(d.id))
      : ownDivisions.slice(0, count);

    const { regionCentroids } = get();
    const distanceKm = calculateDistance(fromRegion, actualToRegion, regionCentroids);
    const travelTimeHours = calculateTravelTime(distanceKm, false);
    const destLabel = finalDestination
      ? `${to.name} → … → ${regions[finalDestination]?.name ?? finalDestination}`
      : to.name;
    console.log(`Moving from ${from.name} to ${destLabel} (first hop: ${to.name}): ${Math.round(distanceKm)} km, ${travelTimeHours.toFixed(1)} hours (${Math.floor(travelTimeHours / 24)}d ${Math.round(travelTimeHours % 24)}h)`);
    const arrivalTime = new Date(dateTime);
    arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

    const isHostile = targetOwner !== selectedCountry.id && !hasAutonomy && theyGrantUs !== 'military_access';

    let newCombat: ActiveCombat | null = null;
    let nextDivisions = { ...divisions };
    const nextRegions = { ...regions };
    let nextActiveCombats = activeCombats;
    let nextGameEvents = gameEvents;
    let nextNotifications = notifications;

    if (isHostile) {
      const existingCombat = activeCombats.find(c =>
        c.attackerRegionId === fromRegion &&
        c.defenderRegionId === actualToRegion &&
        !c.isComplete
      );
      if (existingCombat) {
        nextActiveCombats = activeCombats.map(c => {
          if (c.id !== existingCombat.id) return c;
          if (selectedCountry.id === c.attackerCountry) {
            return {
              ...c,
              attackerDivisions: [...c.attackerDivisions, ...divisionsToMove],
              initialAttackerCount: c.initialAttackerCount + divisionsToMove.length,
              initialAttackerHp: c.initialAttackerHp + divisionsToMove.reduce((s, d) => s + d.hp, 0),
            };
          }
          return c;
        });
        const newMovement: Movement = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fromRegion,
          toRegion: actualToRegion,
          divisions: divisionsToMove,
          departureTime: new Date(dateTime),
          arrivalTime,
          owner: selectedCountry.id,
          pendingCombatId: existingCombat.id,
          ...(remainingPath && remainingPath.length > 0 ? { remainingPath, finalDestination } : {}),
        };
        set({
          movingUnits: [...movingUnits, newMovement],
          activeCombats: nextActiveCombats,
        });
        return;
      }

      const inTransitFromDest = new Set(
        movingUnits.filter(m => m.fromRegion === actualToRegion).flatMap(m => m.divisions.map(d => d.id))
      );
      const toDivisions = getDivisionsInRegion(divisions, actualToRegion);
      const defenderDivisions = toDivisions.filter(d => d.owner === to.owner && !inTransitFromDest.has(d.id));
      const hasActiveCombatAtDest = activeCombats.some(c => c.defenderRegionId === actualToRegion && !c.isComplete);
      if (defenderDivisions.length > 0 || hasActiveCombatAtDest) {
        const { combatDefenderDivisions, isFirstCombat } = resolveMultiFrontDefenders(actualToRegion, activeCombats, toDivisions, to.owner);

        newCombat = createActiveCombat(
          fromRegion, from.name, actualToRegion, to.name,
          selectedCountry.id, to.owner, divisionsToMove, combatDefenderDivisions, dateTime
        );
        // Clear defender divisions from DivisionState if this is the first combat on this region
        if (isFirstCombat) {
          for (const d of combatDefenderDivisions) {
            nextDivisions = { ...nextDivisions, [d.id]: { ...d, regionId: null } };
          }
        }
        nextActiveCombats = [...activeCombats, newCombat];
        const battleEvent = createGameEvent(
          'combat_victory',
          `Battle for ${to.name} Begins!`,
          `${selectedCountry.id === 'soviet' ? 'Soviet' : 'White'} forces (${divisionsToMove.length} divisions) are advancing on ${to.owner === 'soviet' ? 'Soviet' : 'White'} defenders (${defenderDivisions.length} divisions) at ${to.name}.`,
          dateTime,
          selectedCountry.id,
          actualToRegion
        );
        nextGameEvents = [...gameEvents, battleEvent];
        nextNotifications = [...notifications, createNotification(battleEvent, dateTime)];
      }
    }

    const newMovement: Movement = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromRegion,
      toRegion: actualToRegion,
      divisions: divisionsToMove,
      departureTime: new Date(dateTime),
      arrivalTime,
      owner: selectedCountry.id,
      ...(newCombat ? { pendingCombatId: newCombat.id } : {}),
      ...(remainingPath && remainingPath.length > 0 ? { remainingPath, finalDestination } : {}),
    };

    set({
      ...createRegionOwnersPatch(nextRegions),
      divisions: nextDivisions,
      movingUnits: [...movingUnits, newMovement],
      activeCombats: nextActiveCombats,
      gameEvents: nextGameEvents,
      notifications: nextNotifications,
    });
  },

  cancelMovement: (movementId: string) => {
    const { selectedCountry, movingUnits } = get();
    const movement = movingUnits.find(m => m.id === movementId);
    if (!movement || !selectedCountry || movement.owner !== selectedCountry.id || movement.pendingCombatId) return;
    set({ movingUnits: movingUnits.filter(m => m.id !== movementId) });
  },

  redirectMovement: (movementId: string, newDestinationRegionId: string) => {
    const { adjacency, regions, selectedCountry, movingUnits, relationships } = get();

    const movement = movingUnits.find(m => m.id === movementId);
    if (!movement) {
      console.warn(`[redirectMovement] Movement "${movementId}" not found`);
      return;
    }
    if (!selectedCountry || movement.owner !== selectedCountry.id) {
      console.warn(`[redirectMovement] Movement "${movementId}" not owned by player`);
      return;
    }
    if (movement.pendingCombatId) {
      console.warn(`[redirectMovement] Cannot redirect movement "${movementId}" - paused for combat`);
      return;
    }
    if (movement.toRegion === newDestinationRegionId) {
      return;
    }

    const canEnter = buildCanEnterPredicate(
      selectedCountry.id,
      regions,
      relationships
    );

    let newRemainingPath: string[] | undefined;
    let newFinalDestination: string | undefined;

    if (movement.toRegion === newDestinationRegionId) {
      newRemainingPath = undefined;
      newFinalDestination = undefined;
    } else {
      const pathFromCurrentHop = findPath(
        movement.toRegion,
        newDestinationRegionId,
        adjacency,
        canEnter
      );
      if (!pathFromCurrentHop || pathFromCurrentHop.length === 0) {
        console.warn(
          `[redirectMovement] No accessible path from "${movement.toRegion}" to "${newDestinationRegionId}"`
        );
        return;
      }
      newRemainingPath = pathFromCurrentHop;
      newFinalDestination = newDestinationRegionId;
    }

    const updatedMovement = {
      ...movement,
      remainingPath: newRemainingPath,
      finalDestination: newFinalDestination,
    };

    set({
      movingUnits: movingUnits.map(m => (m.id === movementId ? updatedMovement : m)),
    });

    const destName = regions[newDestinationRegionId]?.name ?? newDestinationRegionId;
    console.log(`[redirectMovement] Movement "${movementId}" redirected to ${destName}`);
  },

  deployToArmyGroup: (groupId: string, count?: number) => {
    get().addToProductionQueue(groupId, count);
  },
});

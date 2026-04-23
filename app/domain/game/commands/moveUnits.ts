import { createActiveCombat } from '../../../utils/combat';
import { calculateDistance, calculateTravelTime } from '../../../utils/distance';
import { createGameEvent, createNotification } from '../../../utils/eventUtils';
import {
  buildCanEnterPredicate,
  findPath,
} from '../../../utils/pathfinding';
import {
  getCombatDefenders,
  getDivisionsInRegion,
} from '../../../utils/divisionState';
import type { ActiveCombat, Movement } from '../../../types/game';
import type { EngineSimulationState } from '../engine/types';
import type { GameCommandResult } from './types';

function resolveMultiFrontDefenders(
  toRegion: string,
  activeCombats: ActiveCombat[],
  regionDivisions: ReturnType<typeof getDivisionsInRegion>,
  destOwner: string,
  divisionState: EngineSimulationState['divisions'],
) {
  const existing = activeCombats.filter(
    combat => combat.defenderRegionId === toRegion && !combat.isComplete,
  );

  return {
    combatDefenderDivisions:
      existing.length > 0
        ? getCombatDefenders(divisionState, existing[0])
        : regionDivisions.filter(division => division.owner === destOwner),
    isFirstCombat: existing.length === 0,
  };
}

export function applyMoveUnitsCommand(
  state: EngineSimulationState,
  fromRegion: string,
  toRegion: string,
  count: number,
  divisionIds?: string[],
): GameCommandResult {
  const {
    adjacency,
    regions,
    selectedCountry,
    dateTime,
    movingUnits,
    relationships,
    activeCombats,
    gameEvents,
    notifications,
    divisions,
    regionCentroids,
  } = state;

  if (!selectedCountry) {
    return { state, applied: false };
  }

  const isDirectlyAdjacent = adjacency[fromRegion]?.includes(toRegion);
  let firstHop = toRegion;
  let remainingPath: string[] | undefined;

  if (!isDirectlyAdjacent) {
    const canEnter = buildCanEnterPredicate(
      selectedCountry.id,
      regions,
      relationships,
    );
    const path = findPath(fromRegion, toRegion, adjacency, canEnter);
    if (!path || path.length === 0) {
      return { state, applied: false };
    }
    firstHop = path[0];
    remainingPath = path.slice(1);
  }

  const actualToRegion = firstHop;
  const finalDestination =
    remainingPath && remainingPath.length > 0 ? toRegion : undefined;

  if (!adjacency[fromRegion]?.includes(actualToRegion)) {
    return { state, applied: false };
  }

  const from = regions[fromRegion];
  const to = regions[actualToRegion];
  const fromDivisions = getDivisionsInRegion(divisions, fromRegion);
  if (!from || !to || fromDivisions.length < count) {
    return { state, applied: false };
  }

  const fromOwner = from.owner;
  const isOwnRegion = fromOwner === selectedCountry.id;
  if (!isOwnRegion) {
    const theirRel = relationships.find(
      relationship =>
        relationship.fromCountry === fromOwner &&
        relationship.toCountry === selectedCountry.id,
    );
    const ourRel = relationships.find(
      relationship =>
        relationship.fromCountry === selectedCountry.id &&
        relationship.toCountry === fromOwner,
    );
    const theyGrantUs = theirRel ? theirRel.type : 'neutral';
    const weDeclared = ourRel ? ourRel.type : 'neutral';
    const hasAccess =
      theyGrantUs === 'military_access' ||
      theyGrantUs === 'autonomy' ||
      weDeclared === 'autonomy';
    const hasOurDivisions = fromDivisions.some(
      division => division.owner === selectedCountry.id,
    );
    if (!hasAccess || !hasOurDivisions) {
      return { state, applied: false };
    }
  }

  const targetOwner = to.owner;
  const theyGrantUs =
    relationships.find(
      relationship =>
        relationship.fromCountry === targetOwner &&
        relationship.toCountry === selectedCountry.id,
    )?.type ?? 'neutral';
  const weDeclared =
    relationships.find(
      relationship =>
        relationship.fromCountry === selectedCountry.id &&
        relationship.toCountry === targetOwner,
    )?.type ?? 'neutral';
  const hasAutonomy =
    theyGrantUs === 'autonomy' || weDeclared === 'autonomy';

  if (targetOwner !== selectedCountry.id) {
    const canMove =
      theyGrantUs !== 'neutral' || weDeclared === 'war' || hasAutonomy;
    if (!canMove) {
      return { state, applied: false };
    }
  }

  const ownDivisions = fromDivisions.filter(
    division => division.owner === selectedCountry.id,
  );
  const divisionsToMove =
    divisionIds && divisionIds.length > 0
      ? ownDivisions.filter(division => divisionIds.includes(division.id))
      : ownDivisions.slice(0, count);

  if (divisionsToMove.length === 0) {
    return { state, applied: false };
  }

  const distanceKm = calculateDistance(fromRegion, actualToRegion, regionCentroids);
  const travelTimeHours = calculateTravelTime(distanceKm, false);
  const arrivalTime = new Date(dateTime);
  arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

  const isHostile =
    targetOwner !== selectedCountry.id &&
    !hasAutonomy &&
    theyGrantUs !== 'military_access';

  let newCombat: ActiveCombat | null = null;
  let nextDivisions = { ...divisions };
  let nextActiveCombats = activeCombats;
  let nextGameEvents = gameEvents;
  let nextNotifications = notifications;

  for (const division of divisionsToMove) {
    nextDivisions = {
      ...nextDivisions,
      [division.id]: { ...division, regionId: null },
    };
  }

  if (isHostile) {
    const existingCombat = activeCombats.find(
      combat =>
        combat.attackerRegionId === fromRegion &&
        combat.defenderRegionId === actualToRegion &&
        !combat.isComplete,
    );

    if (existingCombat) {
      nextActiveCombats = activeCombats.map(combat => {
        if (combat.id !== existingCombat.id) return combat;
        if (selectedCountry.id === combat.attackerCountry) {
          return {
            ...combat,
            attackerDivisionIds: [
              ...combat.attackerDivisionIds,
              ...divisionsToMove.map(division => division.id),
            ],
            initialAttackerCount:
              combat.initialAttackerCount + divisionsToMove.length,
            initialAttackerHp:
              combat.initialAttackerHp +
              divisionsToMove.reduce((sum, division) => sum + division.hp, 0),
          };
        }
        return combat;
      });

      const movement: Movement = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fromRegion,
        toRegion: actualToRegion,
        divisionIds: divisionsToMove.map(division => division.id),
        departureTime: new Date(dateTime),
        arrivalTime,
        owner: selectedCountry.id,
        pendingCombatId: existingCombat.id,
        ...(remainingPath && remainingPath.length > 0
          ? { remainingPath, finalDestination }
          : {}),
      };

      return {
        applied: true,
        state: {
          ...state,
          divisions: nextDivisions,
          movingUnits: [...movingUnits, movement],
          activeCombats: nextActiveCombats,
        },
      };
    }

    const inTransitFromDest = new Set(
      movingUnits
        .filter(movement => movement.fromRegion === actualToRegion)
        .flatMap(movement => movement.divisionIds),
    );
    const toDivisions = getDivisionsInRegion(divisions, actualToRegion);
    const defenderDivisions = toDivisions.filter(
      division =>
        division.owner === to.owner && !inTransitFromDest.has(division.id),
    );
    const hasActiveCombatAtDest = activeCombats.some(
      combat =>
        combat.defenderRegionId === actualToRegion && !combat.isComplete,
    );

    if (defenderDivisions.length > 0 || hasActiveCombatAtDest) {
      const { combatDefenderDivisions, isFirstCombat } =
        resolveMultiFrontDefenders(
          actualToRegion,
          activeCombats,
          toDivisions,
          to.owner,
          nextDivisions,
        );

      newCombat = createActiveCombat(
        fromRegion,
        from.name,
        actualToRegion,
        to.name,
        selectedCountry.id,
        to.owner,
        divisionsToMove,
        combatDefenderDivisions,
        dateTime,
      );

      if (isFirstCombat) {
        for (const division of combatDefenderDivisions) {
          nextDivisions = {
            ...nextDivisions,
            [division.id]: { ...division, regionId: null },
          };
        }
      }

      nextActiveCombats = [...activeCombats, newCombat];
      const battleEvent = createGameEvent(
        'combat_victory',
        `Battle for ${to.name} Begins!`,
        `${selectedCountry.id === 'soviet' ? 'Soviet' : 'White'} forces (${divisionsToMove.length} divisions) are advancing on ${to.owner === 'soviet' ? 'Soviet' : 'White'} defenders (${defenderDivisions.length} divisions) at ${to.name}.`,
        dateTime,
        selectedCountry.id,
        actualToRegion,
      );
      nextGameEvents = [...gameEvents, battleEvent];
      nextNotifications = [
        ...notifications,
        createNotification(battleEvent, dateTime),
      ];
    }
  }

  const movement: Movement = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    fromRegion,
    toRegion: actualToRegion,
    divisionIds: divisionsToMove.map(division => division.id),
    departureTime: new Date(dateTime),
    arrivalTime,
    owner: selectedCountry.id,
    ...(newCombat ? { pendingCombatId: newCombat.id } : {}),
    ...(remainingPath && remainingPath.length > 0
      ? { remainingPath, finalDestination }
      : {}),
  };

  return {
    applied: true,
    state: {
      ...state,
      divisions: nextDivisions,
      movingUnits: [...movingUnits, movement],
      activeCombats: nextActiveCombats,
      gameEvents: nextGameEvents,
      notifications: nextNotifications,
    },
  };
}

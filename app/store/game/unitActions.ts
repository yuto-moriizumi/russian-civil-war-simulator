import { ArmyGroup } from '../../types/game';
import { createDivision } from '../../utils/combat';
import { createGameEvent, createNotification, getOrdinalSuffix } from '../../utils/eventUtils';
import { generateArmyGroupName } from '../../utils/armyGroupNaming';
import { ARMY_GROUP_COLORS } from './initialState';
import { GameStore } from './types';
import { StoreApi } from 'zustand';
import { findPath, buildCanEnterPredicate } from '../../utils/pathfinding';
import { buildMoveUnitsPatch } from './services/moveUnits';

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
    const patch = buildMoveUnitsPatch(get(), fromRegion, toRegion, count, divisionIds);
    if (patch) {
      set(patch);
    }
  },

  cancelMovement: (movementId: string) => {
    const { selectedCountry, movingUnits, divisions } = get();
    const movement = movingUnits.find(m => m.id === movementId);
    if (!movement || !selectedCountry || movement.owner !== selectedCountry.id || movement.pendingCombatId) return;
    // Restore divisions to fromRegion
    let nextDivisions = { ...divisions };
    for (const divId of movement.divisionIds) {
      const div = nextDivisions[divId];
      if (div) {
        nextDivisions = { ...nextDivisions, [divId]: { ...div, regionId: movement.fromRegion } };
      }
    }
    set({ movingUnits: movingUnits.filter(m => m.id !== movementId), divisions: nextDivisions });
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

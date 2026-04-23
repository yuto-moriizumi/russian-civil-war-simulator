import { ArmyGroup, ArmyGroupMode } from '../../types/game';
import { detectTheatersForCountries, syncAIArmyGroupsToTheaters } from '../../utils/aiArmyGroupTheaters';
import { generateArmyGroupName } from '../../utils/armyGroupNaming';
import { ARMY_GROUP_COLORS } from './initialState';
import { ActionsState } from './types';
import { StoreApi } from 'zustand';
import { defendArmyGroup } from './armyGroupDefend';
import { attackArmyGroup } from './armyGroupAttack';
import { buildRegionUpdate, extractRegionOwners } from '../../utils/regionState';

/**
 * Defines actions related to army group management:
 * - Creating, deleting, renaming army groups
 * - Selecting army groups and theaters
 * - Theater detection and updates
 * - Army group advancement (moving all units toward enemy)
 */
export const createArmyGroupActions = (
  set: StoreApi<ActionsState>['setState'],
  get: StoreApi<ActionsState>['getState']
) => ({
  // Theater Actions
  detectAndUpdateTheaters: () => {
    const { regions, adjacency, selectedCountry, theaters, armyGroups, relationships, aiStates, movingUnits, activeCombats, productionQueues, divisions } = get();
    if (!selectedCountry) return;

    const aiCountryIds = aiStates.map(s => s.countryId).filter(id => id !== selectedCountry.id);
    const allCountryIds = Array.from(new Set([...aiCountryIds, selectedCountry.id]));

    const allUpdatedTheaters = detectTheatersForCountries({
      regions,
      adjacency,
      countryIds: allCountryIds,
      existingTheaters: theaters,
      relationships,
    });

    let updatedArmyGroups = armyGroups;
    let updatedRegions = regions;
    let updatedMovingUnits = movingUnits;
    let updatedActiveCombats = activeCombats;
    let updatedProductionQueues = productionQueues;
    if (aiCountryIds.length > 0) {
      const aiSync = syncAIArmyGroupsToTheaters({
        aiCountryIds,
        theaters: allUpdatedTheaters,
        armyGroups,
        regions,
        divisions,
        movingUnits,
        activeCombats,
        productionQueues,
      });
      updatedArmyGroups = aiSync.armyGroups;
      updatedRegions = aiSync.regions;
      updatedMovingUnits = aiSync.movingUnits;
      updatedActiveCombats = aiSync.activeCombats;
      updatedProductionQueues = aiSync.productionQueues;
    }

    const newTheaters = allUpdatedTheaters.filter(theater => theater.owner === selectedCountry.id);

    // Handle player army group reassignment when theaters merge or disappear
    const oldTheaterIds = new Set(
      theaters.filter(t => t.owner === selectedCountry.id).map(t => t.id)
    );
    const newTheaterIds = new Set(newTheaters.map(t => t.id));
    const disappearedTheaterIds = Array.from(oldTheaterIds).filter(id => !newTheaterIds.has(id));

    if (disappearedTheaterIds.length > 0) {
      console.log('[THEATER MERGE] Theaters disappeared:', disappearedTheaterIds);

      // For each disappeared theater, find which new theater(s) contain its regions
      disappearedTheaterIds.forEach(oldTheaterId => {
        const oldTheater = theaters.find(t => t.id === oldTheaterId);
        if (!oldTheater) return;

        // Find army groups assigned to this theater
        const affectedGroups = updatedArmyGroups.filter(g =>
          g.owner === selectedCountry.id && g.theaterId === oldTheaterId
        );
        if (affectedGroups.length === 0) return;
        
        console.log(`[THEATER MERGE] ${affectedGroups.length} army groups affected by theater ${oldTheaterId} disappearing`);
        
        // Find which new theater contains the most regions from the old theater
        let bestMatchTheaterId: string | null = null;
        let bestMatchTheaterName = '';
        let bestMatchScore = 0;

        newTheaters.forEach(newTheater => {
          const intersection = oldTheater.frontlineRegions.filter(r =>
            newTheater.frontlineRegions.includes(r)
          ).length;

          if (intersection > bestMatchScore) {
            bestMatchScore = intersection;
            bestMatchTheaterId = newTheater.id;
            bestMatchTheaterName = newTheater.name;
          }
        });

        // Fallback: if no frontline overlap, match by same enemy country (frontline shifted forward)
        if (bestMatchTheaterId === null && oldTheater.enemyCountry) {
          const sameEnemyTheater = newTheaters.find(t => t.enemyCountry === oldTheater.enemyCountry);
          if (sameEnemyTheater) {
            bestMatchTheaterId = sameEnemyTheater.id;
            bestMatchTheaterName = sameEnemyTheater.name;
          }
        }

        // Reassign army groups to the best matching theater
        if (bestMatchTheaterId !== null) {
          console.log(`[THEATER MERGE] Reassigning ${affectedGroups.length} army groups from ${oldTheaterId} to ${bestMatchTheaterId} (${bestMatchTheaterName})`);
          
          updatedArmyGroups = updatedArmyGroups.map(group => {
            if (group.theaterId === oldTheaterId) {
              return { ...group, theaterId: bestMatchTheaterId };
            }
            return group;
          });
        } else {
          // No match found, set theaterId to null (general reserve)
          console.log(`[THEATER MERGE] No matching theater found for ${oldTheaterId}, moving army groups to general reserve`);
          
          updatedArmyGroups = updatedArmyGroups.map(group => {
            if (group.theaterId === oldTheaterId) {
              return { ...group, theaterId: null };
            }
            return group;
          });
        }
      });
    }
    
    set({
      theaters: allUpdatedTheaters,
      armyGroups: updatedArmyGroups,
      ...buildRegionUpdate(get().regionDefinitions, extractRegionOwners(updatedRegions)),
      divisions: get().divisions,
      movingUnits: updatedMovingUnits,
      activeCombats: updatedActiveCombats,
      productionQueues: updatedProductionQueues,
    });
  },

  selectTheater: (theaterId: string | null) => {
    set({ 
      selectedTheaterId: theaterId,
      selectedGroupId: null // Clear selected army group when changing theaters
    });
  },

  // Army Group Actions
  createArmyGroup: (name: string, regionIds: string[], theaterId: string | null = null) => {
    const { armyGroups, selectedCountry, isPlayerAIEnabled } = get();
    if (!selectedCountry) return;

    // If no name provided, generate one systematically
    const groupName = name.trim() || generateArmyGroupName(
      armyGroups,
      selectedCountry.id
    );

    const newGroup: ArmyGroup = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: groupName,
      regionIds: [...regionIds],
      color: ARMY_GROUP_COLORS[armyGroups.length % ARMY_GROUP_COLORS.length],
      owner: selectedCountry.id,
      theaterId,
      mode: isPlayerAIEnabled ? 'advance' : 'none',
    };

    set({
      armyGroups: [...armyGroups, newGroup],
      selectedGroupId: newGroup.id,
      selectedTheaterId: null, // Clear selected theater when creating/selecting a new group
    });
  },

  deleteArmyGroup: (groupId: string) => {
    const { armyGroups, selectedGroupId } = get();
    set({
      armyGroups: armyGroups.filter(g => g.id !== groupId),
      selectedGroupId: selectedGroupId === groupId ? null : selectedGroupId,
      // If the selected group was the one providing the theater highlight, it will naturally clear
      // We don't necessarily want to clear an explicitly selected theater here
    });
  },

  renameArmyGroup: (groupId: string, name: string) => {
    const { armyGroups } = get();
    set({
      armyGroups: armyGroups.map(g => 
        g.id === groupId ? { ...g, name } : g
      ),
    });
  },

  assignTheaterToGroup: (groupId: string, theaterId: string | null) => {
    const { armyGroups } = get();
    set({
      armyGroups: armyGroups.map(g => 
        g.id === groupId ? { ...g, theaterId } : g
      ),
    });
  },

  selectArmyGroup: (groupId: string | null) => {
    set({ 
      selectedGroupId: groupId,
      selectedTheaterId: null // Clear selected theater when changing/deselecting army groups
    });
  },

  setArmyGroupMode: (groupId: string, mode: ArmyGroupMode) => {
    const { armyGroups } = get();
    set({
      armyGroups: armyGroups.map(g => 
        g.id === groupId ? { ...g, mode } : g
      ),
    });
  },

  advanceArmyGroup: (groupId: string) => {
    const state = get();
    attackArmyGroup(groupId, state, partial => {
      const patch = partial.regions ? { ...partial, ...buildRegionUpdate(state.regionDefinitions, extractRegionOwners(partial.regions)) } : partial;
      set({
        ...patch,
        divisions: partial.divisions ?? state.divisions,
      });
    });
  },

  attackArmyGroup: (groupId: string) => {
    const state = get();
    attackArmyGroup(groupId, state, partial => {
      const patch = partial.regions ? { ...partial, ...buildRegionUpdate(state.regionDefinitions, extractRegionOwners(partial.regions)) } : partial;
      set({
        ...patch,
        divisions: partial.divisions ?? state.divisions,
      });
    });
  },

  defendArmyGroup: (groupId: string) => {
    const state = get();
    defendArmyGroup(groupId, state, partial => {
      const patch = partial.regions ? { ...partial, ...buildRegionUpdate(state.regionDefinitions, extractRegionOwners(partial.regions)) } : partial;
      set({
        ...patch,
        divisions: partial.divisions ?? state.divisions,
      });
    });
  },

  /**
   * Assign the currently selected divisions to the given army group.
   * Divisions that already belong to the group are left unchanged.
   */
  addDivisionsToArmyGroup: (groupId: string, divisionIds: string[]) => {
    const { divisions } = get();

    if (divisionIds.length === 0) return;

    const divisionIdSet = new Set(divisionIds);

    const updatedDivisions = { ...divisions };
    for (const [id, div] of Object.entries(updatedDivisions)) {
      if (divisionIdSet.has(id) && div.armyGroupId !== groupId) {
        updatedDivisions[id] = { ...div, armyGroupId: groupId };
      }
    }

    // With DivisionState as source of truth, no need to update movingUnits
    set({
      divisions: updatedDivisions,
    });
  },
});

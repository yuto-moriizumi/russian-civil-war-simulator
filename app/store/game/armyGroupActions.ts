import { ArmyGroup, ArmyGroupMode } from '../../types/game';
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

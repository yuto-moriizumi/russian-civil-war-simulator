import { ArmyGroup, ArmyGroupMode } from '../../types/game';
import { detectTheaters } from '../../utils/theaterDetection';
import { generateArmyGroupName } from '../../utils/armyGroupNaming';
import { ARMY_GROUP_COLORS } from './initialState';
import { GameStore } from './types';
import { StoreApi } from 'zustand';
import { advanceArmyGroup } from './armyGroupAdvance';
import { defendArmyGroup } from './armyGroupDefend';

/**
 * Defines actions related to army group management:
 * - Creating, deleting, renaming army groups
 * - Selecting army groups and theaters
 * - Theater detection and updates
 * - Army group advancement (moving all units toward enemy)
 */
export const createArmyGroupActions = (
  set: StoreApi<GameStore>['setState'],
  get: StoreApi<GameStore>['getState']
) => ({
  // Theater Actions
  detectAndUpdateTheaters: () => {
    const { regions, adjacency, selectedCountry, theaters, armyGroups } = get();
    if (!selectedCountry) return;
    
    const newTheaters = detectTheaters(regions, adjacency, selectedCountry.id, theaters);
    
    // Handle army group reassignment when theaters merge or disappear
    const oldTheaterIds = new Set(theaters.map(t => t.id));
    const newTheaterIds = new Set(newTheaters.map(t => t.id));
    const disappearedTheaterIds = Array.from(oldTheaterIds).filter(id => !newTheaterIds.has(id));
    
    let updatedArmyGroups = armyGroups;
    
    if (disappearedTheaterIds.length > 0) {
      console.log('[THEATER MERGE] Theaters disappeared:', disappearedTheaterIds);
      
      // For each disappeared theater, find which new theater(s) contain its regions
      disappearedTheaterIds.forEach(oldTheaterId => {
        const oldTheater = theaters.find(t => t.id === oldTheaterId);
        if (!oldTheater) return;
        
        // Find army groups assigned to this theater
        const affectedGroups = armyGroups.filter(g => g.theaterId === oldTheaterId);
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
    
    set({ theaters: newTheaters, armyGroups: updatedArmyGroups });
  },

  selectTheater: (theaterId: string | null) => {
    set({ 
      selectedTheaterId: theaterId,
      selectedGroupId: null // Clear selected army group when changing theaters
    });
  },

  // Army Group Actions
  createArmyGroup: (name: string, regionIds: string[], theaterId: string | null = null) => {
    const { armyGroups, selectedCountry } = get();
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
      mode: 'none', // Default to no automatic mode
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
    advanceArmyGroup(groupId, get(), set);
  },

  defendArmyGroup: (groupId: string) => {
    defendArmyGroup(groupId, get(), set);
  },
});

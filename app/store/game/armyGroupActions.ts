import { Movement, ArmyGroup } from '../../types/game';
import { findBestMoveTowardEnemy } from '../../utils/pathfinding';
import { detectTheaters } from '../../utils/theaterDetection';
import { generateArmyGroupName } from '../../utils/armyGroupNaming';
import { ARMY_GROUP_COLORS } from './initialState';
import { GameStore } from './types';
import { StoreApi } from 'zustand';

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
    if (!selectedCountry || regionIds.length === 0) return;

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
    };

    set({
      armyGroups: [...armyGroups, newGroup],
      selectedGroupId: newGroup.id,
    });
  },

  deleteArmyGroup: (groupId: string) => {
    const { armyGroups, selectedGroupId } = get();
    set({
      armyGroups: armyGroups.filter(g => g.id !== groupId),
      selectedGroupId: selectedGroupId === groupId ? null : selectedGroupId,
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

  selectArmyGroup: (groupId: string | null) => {
    set({ selectedGroupId: groupId });
  },

  advanceArmyGroup: (groupId: string) => {
    const state = get();
    const { armyGroups, regions, adjacency, selectedCountry, dateTime, movingUnits, selectedUnitRegion } = state;
    
    const group = armyGroups.find(g => g.id === groupId);
    if (!group || !selectedCountry) return;

    const newMovements: Movement[] = [];
    const newRegions = { ...regions };
    const movedRegions = new Set<string>();
    const targetRegions = new Set<string>();

    // Find all regions that contain divisions belonging to this army group
    // This allows divisions to be moved even after they've been relocated
    const regionsWithGroupDivisions = Object.keys(newRegions).filter(regionId => {
      const region = newRegions[regionId];
      if (!region || region.owner !== selectedCountry.id) return false;
      return region.divisions.some(d => d.armyGroupId === groupId);
    });

    for (const regionId of regionsWithGroupDivisions) {
      const region = newRegions[regionId];
      if (!region || region.divisions.length === 0) continue;

      // Find the best move toward an enemy
      const nextStep = findBestMoveTowardEnemy(regionId, newRegions, adjacency, selectedCountry.id);
      if (!nextStep) continue;

      // Check if divisions from THIS specific group are already moving from this region
      const groupAlreadyMoving = movingUnits.some(m => 
        m.fromRegion === regionId && 
        m.divisions.some(d => d.armyGroupId === groupId)
      );
      if (groupAlreadyMoving) continue;

      // Filter divisions that belong to this specific army group
      const divisionsInGroup = region.divisions.filter(d => d.armyGroupId === groupId);
      if (divisionsInGroup.length === 0) continue;

      // Create the movement with only the divisions from this group
      const divisionsToMove = divisionsInGroup;
      const remainingDivisions = region.divisions.filter(d => d.armyGroupId !== groupId);
      const travelTimeHours = 6;
      const arrivalTime = new Date(dateTime);
      arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

      const newMovement: Movement = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${regionId}`,
        fromRegion: regionId,
        toRegion: nextStep,
        divisions: divisionsToMove,
        departureTime: new Date(dateTime),
        arrivalTime,
        owner: selectedCountry.id,
      };

      newMovements.push(newMovement);
      newRegions[regionId] = {
        ...region,
        divisions: remainingDivisions,
      };
      movedRegions.add(regionId);
      targetRegions.add(nextStep);
    }

    if (newMovements.length > 0) {
      // Clear selectedUnitRegion if it was in a region that had units moved
      const shouldClearSelection = selectedUnitRegion && movedRegions.has(selectedUnitRegion);
      
      // Update army groups to include target regions immediately
      const updatedArmyGroups = armyGroups.map(g => {
        if (g.id === groupId) {
          const newRegionIds = new Set([...g.regionIds, ...Array.from(targetRegions)]);
          return { ...g, regionIds: Array.from(newRegionIds) };
        }
        return g;
      });

      set({
        regions: newRegions,
        movingUnits: [...movingUnits, ...newMovements],
        armyGroups: updatedArmyGroups,
        ...(shouldClearSelection && { selectedUnitRegion: null }),
      });
    }
  },

  defendArmyGroup: (groupId: string) => {
    const state = get();
    const { armyGroups, regions, adjacency, selectedCountry, dateTime, movingUnits, selectedUnitRegion, theaters } = state;
    
    const group = armyGroups.find(g => g.id === groupId);
    if (!group || !selectedCountry) return;

    const newMovements: Movement[] = [];
    const newRegions = { ...regions };
    const movedRegions = new Set<string>();
    const targetRegions = new Set<string>();

    // Find the theater this group belongs to
    const theater = group.theaterId ? theaters.find(t => t.id === group.theaterId) : null;
    
    // Find border regions in this theater (or all friendly border regions if no theater)
    const allBorderRegions: string[] = [];
    for (const [regionId, region] of Object.entries(newRegions)) {
      if (!region || region.owner !== selectedCountry.id) continue;
      
      // If there's a theater, only consider regions in that theater
      if (theater && !theater.frontlineRegions.includes(regionId)) continue;
      
      const neighbors = adjacency[regionId] || [];
      const hasEnemyNeighbor = neighbors.some(neighborId => {
        const neighbor = newRegions[neighborId];
        return neighbor && neighbor.owner !== selectedCountry.id && neighbor.owner !== 'neutral';
      });
      
      if (hasEnemyNeighbor) {
        allBorderRegions.push(regionId);
      }
    }

    if (allBorderRegions.length === 0) return; // No borders to defend

    // Count current divisions at each border region (including this group's divisions)
    const borderDivisionCounts = new Map<string, number>();
    allBorderRegions.forEach(regionId => {
      const region = newRegions[regionId];
      const groupDivisions = region.divisions.filter(d => d.armyGroupId === groupId).length;
      borderDivisionCounts.set(regionId, groupDivisions);
    });

    // Find all divisions belonging to this army group
    const allGroupDivisions: { regionId: string; divisions: typeof regions[string]['divisions'] }[] = [];
    Object.keys(newRegions).forEach(regionId => {
      const region = newRegions[regionId];
      if (!region || region.owner !== selectedCountry.id) return;
      const divisionsInGroup = region.divisions.filter(d => d.armyGroupId === groupId);
      if (divisionsInGroup.length > 0) {
        allGroupDivisions.push({ regionId, divisions: divisionsInGroup });
      }
    });

    // Calculate total divisions and target count per border region
    const totalDivisions = allGroupDivisions.reduce((sum, item) => sum + item.divisions.length, 0);
    const targetPerBorder = Math.floor(totalDivisions / allBorderRegions.length);
    const remainder = totalDivisions % allBorderRegions.length;

    // Distribute divisions evenly across border regions
    // First, collect divisions from regions that need to send them
    const divisionsToRedistribute: typeof regions[string]['divisions'] = [];
    
    allGroupDivisions.forEach(({ regionId, divisions }) => {
      const isBorder = allBorderRegions.includes(regionId);
      const currentCount = borderDivisionCounts.get(regionId) || 0;
      
      if (isBorder) {
        // If this border has more than target, take the excess
        const excess = currentCount - targetPerBorder;
        if (excess > 0) {
          const divisionsToTake = divisions.slice(0, excess);
          divisionsToRedistribute.push(...divisionsToTake);
          
          // Update the region to remove these divisions
          const remainingDivisions = newRegions[regionId].divisions.filter(
            d => !divisionsToTake.some(dt => dt.id === d.id)
          );
          newRegions[regionId] = { ...newRegions[regionId], divisions: remainingDivisions };
          borderDivisionCounts.set(regionId, currentCount - excess);
        }
      } else {
        // Not at border, send all divisions
        divisionsToRedistribute.push(...divisions);
        
        // Remove divisions from this region
        const remainingDivisions = newRegions[regionId].divisions.filter(d => d.armyGroupId !== groupId);
        newRegions[regionId] = { ...newRegions[regionId], divisions: remainingDivisions };
        movedRegions.add(regionId);
      }
    });

    // Now distribute divisions to border regions that need them
    let divisionIndex = 0;
    allBorderRegions.forEach((borderRegionId, index) => {
      const currentCount = borderDivisionCounts.get(borderRegionId) || 0;
      const targetCount = targetPerBorder + (index < remainder ? 1 : 0);
      const needed = targetCount - currentCount;
      
      if (needed > 0 && divisionIndex < divisionsToRedistribute.length) {
        const divisionsToAdd = divisionsToRedistribute.slice(divisionIndex, divisionIndex + needed);
        divisionIndex += needed;
        
        if (divisionsToAdd.length > 0) {
          // Find the best source region for these divisions
          const sourceRegions = new Set(
            divisionsToAdd.map(d => {
              for (const { regionId, divisions } of allGroupDivisions) {
                if (divisions.some(div => div.id === d.id)) return regionId;
              }
              return null;
            }).filter(Boolean)
          );
          
          // Create movements from each source region
          sourceRegions.forEach(sourceRegionId => {
            if (!sourceRegionId) return;
            
            const divsFromSource = divisionsToAdd.filter(d => {
              const original = allGroupDivisions.find(item => item.regionId === sourceRegionId);
              return original?.divisions.some(div => div.id === d.id);
            });
            
            if (divsFromSource.length === 0) return;
            
            // Check if already moving from this region
            const groupAlreadyMoving = movingUnits.some(m => 
              m.fromRegion === sourceRegionId && 
              m.divisions.some(d => d.armyGroupId === groupId)
            );
            if (groupAlreadyMoving) return;
            
            const travelTimeHours = 6;
            const arrivalTime = new Date(dateTime);
            arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

            const newMovement: Movement = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${sourceRegionId}`,
              fromRegion: sourceRegionId,
              toRegion: borderRegionId,
              divisions: divsFromSource,
              departureTime: new Date(dateTime),
              arrivalTime,
              owner: selectedCountry.id,
            };

            newMovements.push(newMovement);
            movedRegions.add(sourceRegionId);
            targetRegions.add(borderRegionId);
          });
        }
      }
    });

    if (newMovements.length > 0 || movedRegions.size > 0) {
      // Clear selectedUnitRegion if it was in a region that had units moved
      const shouldClearSelection = selectedUnitRegion && movedRegions.has(selectedUnitRegion);
      
      // Update army groups to include target regions immediately
      const updatedArmyGroups = armyGroups.map(g => {
        if (g.id === groupId) {
          const newRegionIds = new Set([...g.regionIds, ...Array.from(targetRegions)]);
          return { ...g, regionIds: Array.from(newRegionIds) };
        }
        return g;
      });

      set({
        regions: newRegions,
        movingUnits: [...movingUnits, ...newMovements],
        armyGroups: updatedArmyGroups,
        ...(shouldClearSelection && { selectedUnitRegion: null }),
      });
    }
  },
});

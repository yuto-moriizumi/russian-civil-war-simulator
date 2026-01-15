import { Movement, ArmyGroup } from '../../types/game';
import { createDivision } from '../../utils/combat';
import { createGameEvent, createNotification, getOrdinalSuffix } from '../../utils/eventUtils';
import { generateArmyGroupName } from '../../utils/armyGroupNaming';
import { ARMY_GROUP_COLORS } from './initialState';
import { GameStore } from './types';
import { StoreApi } from 'zustand';
import { calculateDistance, calculateTravelTime } from '../../utils/distance';

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
    const { money, selectedCountry, dateTime, gameEvents, regions, selectedGroupId, armyGroups, selectedRegion, factionBonuses } = get();
    const cost = 10;
    
    if (money >= cost && selectedCountry) {
      // Find deployment target
      let deploymentTarget: string | null = null;
      let targetGroupId: string | null = selectedGroupId;
      
      // Priority 1: If an army group is selected, deploy to it
      if (selectedGroupId) {
        const group = armyGroups.find(g => g.id === selectedGroupId);
        if (group) {
          const validRegions = group.regionIds.filter(id => {
            const region = regions[id];
            return region && region.owner === selectedCountry.id;
          });
          if (validRegions.length > 0) {
            // Pick random region in the group
            deploymentTarget = validRegions[Math.floor(Math.random() * validRegions.length)];
          }
        }
      }
      
      // Priority 2: If a region is selected and owned by player, deploy there
      if (!deploymentTarget && selectedRegion) {
        const region = regions[selectedRegion];
        if (region && region.owner === selectedCountry.id) {
          deploymentTarget = selectedRegion;
        }
      }
      
      // Priority 3: Deploy to any owned region
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
      
      // Determine which army group this division belongs to
      if (!targetGroupId) {
        // If no army group is selected, we need to create one or find one
        // Check if there are any existing army groups for this player
        const playerArmyGroups = armyGroups.filter(g => g.owner === selectedCountry.id);
        
        if (playerArmyGroups.length === 0) {
          // No army groups exist, create a default one automatically
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
          // Use the first available player army group
          targetGroupId = playerArmyGroups[0].id;
        }
      }
      
      if (!targetGroupId) {
        console.warn('No army group available for new division');
        return;
      }
      
      // Count existing divisions to generate unique name
      const existingDivisions = Object.values(regions).reduce((acc, region) => 
        acc + region.divisions.filter(d => d.owner === selectedCountry.id).length, 0
      );
      const divisionNumber = existingDivisions + 1;
      const divisionName = `${selectedCountry.id === 'soviet' ? 'Red' : 'White'} Guard ${divisionNumber}${getOrdinalSuffix(divisionNumber)} Division`;
      const newDivision = createDivision(
        selectedCountry.id, 
        divisionName, 
        targetGroupId,
        factionBonuses[selectedCountry.id]
      );
      
      const targetRegion = regions[deploymentTarget];
      const newEvent = createGameEvent(
        'unit_deployed',
        `Division Trained and Deployed`,
        `${divisionName} has been trained for $${cost} and deployed to ${targetRegion.name}. HP: ${newDivision.hp}, Attack: ${newDivision.attack}, Defence: ${newDivision.defence}.`,
        dateTime,
        selectedCountry.id,
        deploymentTarget
      );

      // Create notification that expires after 6 game hours
      const newNotification = createNotification(newEvent, dateTime);

      const newRegions = {
        ...regions,
        [deploymentTarget]: {
          ...targetRegion,
          divisions: [...targetRegion.divisions, newDivision],
        },
      };

      set({
        money: money - cost,
        regions: newRegions,
        gameEvents: [...gameEvents, newEvent],
        notifications: [...get().notifications, newNotification],
      });
    }
  },

  deployUnit: () => {
    // This function is no longer needed - units are deployed directly when created
    console.warn('deployUnit is deprecated - units are now deployed directly when created');
  },

  moveUnits: (fromRegion: string, toRegion: string, count: number) => {
    const { adjacency, regions, selectedCountry, dateTime, movingUnits, relationships } = get();
    if (!adjacency[fromRegion]?.includes(toRegion)) return;
    
    const from = regions[fromRegion];
    const to = regions[toRegion];
    if (!from || from.divisions.length < count || !selectedCountry || from.owner !== selectedCountry.id) return;
    
    // Check relationship with target region owner
    const targetOwner = to.owner;
    if (targetOwner !== selectedCountry.id) {
      // Moving to another faction's territory
      // Check if they grant us access/war
      const theirRelationship = relationships.find(
        r => r.fromFaction === targetOwner && r.toFaction === selectedCountry.id
      );
      const theyGrantUs = theirRelationship ? theirRelationship.type : 'neutral';
      
      // Check if we declared war on them
      const ourRelationship = relationships.find(
        r => r.fromFaction === selectedCountry.id && r.toFaction === targetOwner
      );
      const weDeclared = ourRelationship ? ourRelationship.type : 'neutral';
      
      // Check for autonomy relationship (grants mutual military access)
      const hasAutonomy = theyGrantUs === 'autonomy' || weDeclared === 'autonomy';
      
      // Can move if:
      // 1. They grant us military access or war, OR
      // 2. We declared war on them, OR
      // 3. Either side has autonomy relationship (mutual military access)
      const canMove = theyGrantUs !== 'neutral' || weDeclared === 'war' || hasAutonomy;
      
      if (!canMove) {
        console.warn(`Cannot move to ${to.name}: No military access or war state with ${targetOwner}`);
        return;
      }
    }
    
    const divisionsToMove = from.divisions.slice(0, count);
    
    // Calculate distance-based travel time
    const { regionCentroids } = get();
    const distanceKm = calculateDistance(fromRegion, toRegion, regionCentroids);
    const travelTimeHours = calculateTravelTime(distanceKm, false);
    
    console.log(`Moving from ${from.name} to ${to.name}: ${Math.round(distanceKm)} km, ${travelTimeHours.toFixed(1)} hours (${Math.floor(travelTimeHours / 24)}d ${Math.round(travelTimeHours % 24)}h)`);
    
    const arrivalTime = new Date(dateTime);
    arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);
    
    const newMovement: Movement = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromRegion,
      toRegion,
      divisions: divisionsToMove,
      departureTime: new Date(dateTime),
      arrivalTime,
      owner: selectedCountry.id,
    };
    
    const newRegions = {
      ...regions,
      [fromRegion]: {
        ...from,
        divisions: from.divisions.slice(count),
      },
    };

    set({
      regions: newRegions,
      movingUnits: [...movingUnits, newMovement],
    });
  },

  deployToArmyGroup: (groupId: string, count?: number) => {
    // Call the production queue action instead of instant deployment
    get().addToProductionQueue(groupId, count);
  },
});

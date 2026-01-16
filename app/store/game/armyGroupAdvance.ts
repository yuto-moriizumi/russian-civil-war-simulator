import { Movement } from '../../types/game';
import { findBestMoveTowardEnemy } from '../../utils/pathfinding';
import { calculateDistance, calculateTravelTime } from '../../utils/distance';
import { GameStore } from './types';

/**
 * Advances an army group by moving all its divisions toward enemy positions
 */
export function advanceArmyGroup(
  groupId: string,
  state: GameStore,
  setState: (partial: Partial<GameStore>) => void
) {
  const { armyGroups, regions, adjacency, dateTime, movingUnits, selectedUnitRegion, relationships } = state;
  
  const group = armyGroups.find(g => g.id === groupId);
  if (!group) return;
  
  // Use the army group's owner country instead of selectedCountry to support AI
  const countryId = group.owner;

  const newMovements: Movement[] = [];
  const newRegions = { ...regions };
  const movedRegions = new Set<string>();
  const targetRegions = new Set<string>();

  // Find all regions that contain divisions belonging to this army group
  // This allows divisions to be moved even after they've been relocated
  const regionsWithGroupDivisions = Object.keys(newRegions).filter(regionId => {
    const region = newRegions[regionId];
    if (!region || region.owner !== countryId) return false;
    return region.divisions.some(d => d.armyGroupId === groupId);
  });

  for (const regionId of regionsWithGroupDivisions) {
    const region = newRegions[regionId];
    if (!region || region.divisions.length === 0) continue;

    // Find the best move toward an enemy
    const nextStep = findBestMoveTowardEnemy(regionId, newRegions, adjacency, countryId);
    if (!nextStep) continue;

    // Check relationship with target region owner
    const targetRegion = newRegions[nextStep];
    if (targetRegion && targetRegion.owner !== countryId) {
      // Check if they grant us access/war
      const theirRelationship = relationships.find(
        r => r.fromCountry === targetRegion.owner && r.toCountry === countryId
      );
      const theyGrantUs = theirRelationship ? theirRelationship.type : 'neutral';
      
      // Check if we declared war on them
      const ourRelationship = relationships.find(
        r => r.fromCountry === countryId && r.toCountry === targetRegion.owner
      );
      const weDeclared = ourRelationship ? ourRelationship.type : 'neutral';
      
      // Check for autonomy relationship (grants mutual military access)
      const hasAutonomy = theyGrantUs === 'autonomy' || weDeclared === 'autonomy';
      
      // Can move if they grant us access/war OR we declared war on them OR autonomy
      const canMove = theyGrantUs !== 'neutral' || weDeclared === 'war' || hasAutonomy;
      
      if (!canMove) {
        console.warn(`[ADVANCE] Cannot move to ${targetRegion.name}: No military access or war state with ${targetRegion.owner}`);
        continue;
      }
    }

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
    
    // Calculate distance-based travel time
    const { regionCentroids } = state;
    const distanceKm = calculateDistance(regionId, nextStep, regionCentroids);
    const travelTimeHours = calculateTravelTime(distanceKm, false);
    
    const arrivalTime = new Date(dateTime);
    arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

    const newMovement: Movement = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${regionId}`,
      fromRegion: regionId,
      toRegion: nextStep,
      divisions: divisionsToMove,
      departureTime: new Date(dateTime),
      arrivalTime,
      owner: countryId,
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

    setState({
      regions: newRegions,
      movingUnits: [...movingUnits, ...newMovements],
      armyGroups: updatedArmyGroups,
      ...(shouldClearSelection && { selectedUnitRegion: null }),
    });
  }
}

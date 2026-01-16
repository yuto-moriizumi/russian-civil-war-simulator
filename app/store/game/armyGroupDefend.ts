import { Movement } from '../../types/game';
import { getNextStepToward } from '../../utils/pathfinding';
import { calculateDistance, calculateTravelTime } from '../../utils/distance';
import { GameStore } from './types';

/**
 * Defends an army group by redistributing its divisions to border regions
 */
export function defendArmyGroup(
  groupId: string,
  state: GameStore,
  setState: (partial: Partial<GameStore>) => void
) {
  const { armyGroups, regions, adjacency, dateTime, movingUnits, selectedUnitRegion, theaters, relationships } = state;
  
  const group = armyGroups.find(g => g.id === groupId);
  if (!group) return;
  
  // Use the army group's owner country instead of selectedCountry to support AI
  const countryId = group.owner;

  const newMovements: Movement[] = [];
  const newRegions = { ...regions };
  const movedRegions = new Set<string>();
  const targetRegions = new Set<string>();

  // Find the theater this group belongs to
  const theater = group.theaterId ? theaters.find(t => t.id === group.theaterId) : null;
  
  // Find border regions in this theater (or all friendly border regions if no theater)
  const allBorderRegions: string[] = [];
  for (const [regionId, region] of Object.entries(newRegions)) {
    if (!region || region.owner !== countryId) continue;
    
    // If there's a theater, only consider regions in that theater
    if (theater && !theater.frontlineRegions.includes(regionId)) continue;
    
    const neighbors = adjacency[regionId] || [];
    const hasEnemyNeighbor = neighbors.some(neighborId => {
      const neighbor = newRegions[neighborId];
      return neighbor && neighbor.owner !== countryId && neighbor.owner !== 'neutral';
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
    if (!region || region.owner !== countryId) return;
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
  const sourceRegionMap = new Map<string, string>(); // divisionId -> regionId
  
  allGroupDivisions.forEach(({ regionId, divisions }) => {
    const isBorder = allBorderRegions.includes(regionId);
    const currentCount = borderDivisionCounts.get(regionId) || 0;
    
    if (isBorder) {
      // If this border has more than target, take the excess
      const excess = currentCount - targetPerBorder;
      if (excess > 0) {
        const divisionsToTake = divisions.slice(0, excess);
        divisionsToRedistribute.push(...divisionsToTake);
        divisionsToTake.forEach(d => sourceRegionMap.set(d.id, regionId));
        // NOTE: We don't remove from newRegions yet, only when movement is confirmed
        borderDivisionCounts.set(regionId, currentCount - excess);
      }
    } else {
      // Not at border, send all divisions
      divisionsToRedistribute.push(...divisions);
      divisions.forEach(d => sourceRegionMap.set(d.id, regionId));
      // NOTE: We don't remove from newRegions yet
    }
  });

  // Now distribute divisions to border regions that need them
  let divisionIndex = 0;
  allBorderRegions.forEach((borderRegionId, index) => {
    const currentCount = borderDivisionCounts.get(borderRegionId) || 0;
    const targetCount = targetPerBorder + (index < remainder ? 1 : 0);
    const needed = targetCount - currentCount;
    
    if (needed > 0 && divisionIndex < divisionsToRedistribute.length) {
      const divisionsPlanned = divisionsToRedistribute.slice(divisionIndex, divisionIndex + needed);
      divisionIndex += needed;
      
      if (divisionsPlanned.length > 0) {
        // Group by source region to create movements
        const bySource = new Map<string, typeof regions[string]['divisions']>();
        divisionsPlanned.forEach(d => {
          const sourceId = sourceRegionMap.get(d.id);
          if (sourceId) {
            if (!bySource.has(sourceId)) bySource.set(sourceId, []);
            bySource.get(sourceId)!.push(d);
          }
        });
        
        // Create movements from each source region
        bySource.forEach((divsFromSource, sourceRegionId) => {
          // Skip if source and destination are the same
          if (sourceRegionId === borderRegionId) return;
          
          // Find the next adjacent step toward the border region using pathfinding
          const nextStep = getNextStepToward(sourceRegionId, borderRegionId, adjacency);
          
          // If no valid path exists or already at destination, skip
          if (!nextStep) {
            console.warn(`[DEFEND] No valid path from ${sourceRegionId} to ${borderRegionId}`);
            return;
          }
          
          // Check relationship with target region owner
          const targetRegion = newRegions[nextStep];
          if (targetRegion && targetRegion.owner !== countryId) {
            // ... relationship check logic ...
            const theirRelationship = relationships.find(
              r => r.fromCountry === targetRegion.owner && r.toCountry === countryId
            );
            const theyGrantUs = theirRelationship ? theirRelationship.type : 'neutral';
            
            const ourRelationship = relationships.find(
              r => r.fromCountry === countryId && r.toCountry === targetRegion.owner
            );
            const weDeclared = ourRelationship ? ourRelationship.type : 'neutral';
            
            const hasAutonomy = theyGrantUs === 'autonomy' || weDeclared === 'autonomy';
            const canMove = theyGrantUs !== 'neutral' || weDeclared === 'war' || hasAutonomy;
            
            if (!canMove) {
              console.warn(`[DEFEND] Cannot move to ${targetRegion.name}: No military access or war state with ${targetRegion.owner}`);
              return;
            }
          }
          
          // Check if already moving from this region
          const groupAlreadyMoving = movingUnits.some(m => 
            m.fromRegion === sourceRegionId && 
            m.divisions.some(d => d.armyGroupId === groupId)
          );
          if (groupAlreadyMoving) return;
          
          // SUCCESS: We can move these units. Remove them from region and create movement.
          const { regionCentroids } = state;
          const distanceKm = calculateDistance(sourceRegionId, nextStep, regionCentroids);
          const travelTimeHours = calculateTravelTime(distanceKm, false);
          
          const arrivalTime = new Date(dateTime);
          arrivalTime.setHours(arrivalTime.getHours() + travelTimeHours);

          const newMovement: Movement = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${sourceRegionId}`,
            fromRegion: sourceRegionId,
            toRegion: nextStep,
            divisions: divsFromSource,
            departureTime: new Date(dateTime),
            arrivalTime,
            owner: countryId,
          };

          newMovements.push(newMovement);
          
          // ONLY NOW update the region state
          const currentDivsInRegion = newRegions[sourceRegionId].divisions;
          const remainingDivs = currentDivsInRegion.filter(
            d => !divsFromSource.some(dfs => dfs.id === d.id)
          );
          newRegions[sourceRegionId] = {
            ...newRegions[sourceRegionId],
            divisions: remainingDivs
          };
          
          movedRegions.add(sourceRegionId);
          targetRegions.add(nextStep);
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

    setState({
      regions: newRegions,
      movingUnits: [...movingUnits, ...newMovements],
      armyGroups: updatedArmyGroups,
      ...(shouldClearSelection && { selectedUnitRegion: null }),
    });
  }
}

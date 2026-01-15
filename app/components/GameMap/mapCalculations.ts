import type { RegionState, Movement, ActiveCombat, FactionId, Region } from '../../types/game';

export interface UnitMarkerData {
  regionId: string;
  region: Region;
  centroid: [number, number];
  isSelected: boolean;
  isPlayerUnit: boolean;
}

export interface MovingUnitMarkerData {
  id: string;
  movement: Movement;
  longitude: number;
  latitude: number;
}

export interface CombatMarkerData {
  combat: ActiveCombat;
  centroid: [number, number];
}

/**
 * Calculate unit marker data for all regions with units
 */
export function calculateUnitMarkers(
  regions: RegionState,
  regionCentroids: Record<string, [number, number]>,
  selectedUnitRegion: string | null,
  playerFaction: FactionId
): (UnitMarkerData | null)[] {
  // Early return if centroids haven't loaded yet
  if (Object.keys(regionCentroids).length === 0) return [];
  
  return Object.entries(regions)
    .filter(([, region]) => region.divisions.length > 0)
    .map(([regionId, region]) => {
      const centroid = regionCentroids[regionId];
      if (!centroid) return null;
      
      const isSelected = selectedUnitRegion === regionId;
      const isPlayerUnit = region.owner === playerFaction;
      
      return {
        regionId,
        region,
        centroid,
        isSelected,
        isPlayerUnit,
      };
    })
    .filter(Boolean);
}

/**
 * Calculate moving unit marker data and interpolate positions
 */
export function calculateMovingUnitMarkers(
  movingUnits: Movement[],
  regionCentroids: Record<string, [number, number]>,
  currentDateTime: Date
): (MovingUnitMarkerData | null)[] {
  // Early return if centroids haven't loaded yet
  if (Object.keys(regionCentroids).length === 0) return [];
  
  return movingUnits.map((movement) => {
    const fromCentroid = regionCentroids[movement.fromRegion];
    const toCentroid = regionCentroids[movement.toRegion];
    if (!fromCentroid || !toCentroid) return null;

    // Calculate current position based on progress
    const totalTime = movement.arrivalTime.getTime() - movement.departureTime.getTime();
    const elapsed = currentDateTime.getTime() - movement.departureTime.getTime();
    const progress = Math.min(1, Math.max(0, elapsed / totalTime));
    
    const currentLng = fromCentroid[0] + (toCentroid[0] - fromCentroid[0]) * progress;
    const currentLat = fromCentroid[1] + (toCentroid[1] - fromCentroid[1]) * progress;
    
    return {
      id: movement.id,
      movement,
      longitude: currentLng,
      latitude: currentLat,
    };
  }).filter(Boolean);
}

/**
 * Calculate combat marker data for active combats
 */
export function calculateCombatMarkers(
  activeCombats: ActiveCombat[],
  regionCentroids: Record<string, [number, number]>
): (CombatMarkerData | null)[] {
  // Early return if centroids haven't loaded yet
  if (Object.keys(regionCentroids).length === 0) return [];
  
  return activeCombats
    .filter(combat => !combat.isComplete)
    .map((combat) => {
      const centroid = regionCentroids[combat.regionId];
      if (!centroid || !Array.isArray(centroid) || centroid.length !== 2 || 
          typeof centroid[0] !== 'number' || typeof centroid[1] !== 'number' ||
          isNaN(centroid[0]) || isNaN(centroid[1])) {
        return null;
      }

      return {
        combat,
        centroid,
      };
    })
    .filter(Boolean);
}

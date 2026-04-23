import type { RegionState, Movement, ActiveCombat, CountryId, Region, DivisionState } from '../../types/game';
import { getDivisionsInRegion } from '../../domain/game/divisionState';

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
  offset: [number, number];
}

export interface CombatMarkerData {
  combat: ActiveCombat;
  centroid: [number, number];
}

/**
 * Calculate unit marker data for all regions with units.
 * Divisions always have a regionId (even in combat or transit), so
 * getDivisionsInRegion returns the complete set.
 */
export function calculateUnitMarkers(
  regions: RegionState,
  regionCentroids: Record<string, [number, number]>,
  selectedUnitRegion: string | null,
  playerCountry: CountryId,
  selectedDivisionIds: string[] = [],
  _activeCombats: ActiveCombat[] = [],
  movingUnits: Movement[] = [],
  divisions: DivisionState = {}
): (UnitMarkerData | null)[] {
  // Early return if centroids haven't loaded yet
  if (Object.keys(regionCentroids).length === 0) {
    console.warn('calculateUnitMarkers: Centroids not loaded yet');
    return [];
  }

  const selectedDivisionSet = new Set(selectedDivisionIds);

  // Build the set of in-transit division IDs so they are excluded from
  // region markers (they are shown separately by MovingUnitMarker).
  const inTransitDivisionIds = new Set<string>(
    movingUnits.flatMap(m => m.divisionIds)
  );

  const regionIds = new Set(
    Object.keys(regions).filter(id =>
      getDivisionsInRegion(divisions, id).some(d => !inTransitDivisionIds.has(d.id))
    ),
  );

  return Array.from(regionIds).map(regionId => {
    const region = regions[regionId];
    if (!region) return null;

    const centroid = regionCentroids[regionId];
    if (!centroid) {
      console.warn(`calculateUnitMarkers: Missing centroid for region ${regionId} (${region.name})`);
      return null;
    }

    const allDivisions = getDivisionsInRegion(divisions, regionId).filter(d => !inTransitDivisionIds.has(d.id));
    if (allDivisions.length === 0) return null;

    // Highlight the marker only when at least one division in this region is
    // explicitly selected via the division-selection system.  Selecting a
    // region (selectedUnitRegion) alone must NOT trigger the highlight, so
    // that clicking a province no longer glows the unit marker.
    const isSelected = selectedDivisionSet.size > 0 &&
      allDivisions.some(d => selectedDivisionSet.has(d.id));
    // A marker is a player-controllable unit if the player owns the region
    // OR if the player has their own divisions there (military access / autonomy).
    const isPlayerUnit = region.owner === playerCountry ||
      allDivisions.some(d => d.owner === playerCountry);

    return {
      regionId,
      region,
      centroid,
      isSelected,
      isPlayerUnit,
    };
  }).filter(Boolean);
}

/**
 * Calculate moving unit marker data and interpolate positions
 */
export function calculateMovingUnitMarkers(
  movingUnits: Movement[],
  regionCentroids: Record<string, [number, number]>,
  _currentDateTime: Date
): (MovingUnitMarkerData | null)[] {
  // Early return if centroids haven't loaded yet
  if (Object.keys(regionCentroids).length === 0) return [];
  
  return movingUnits.map((movement) => {
    const fromCentroid = regionCentroids[movement.fromRegion];
    const toCentroid = regionCentroids[movement.toRegion];
    if (!fromCentroid || !toCentroid) return null;

    // Guard against zero/negative totalTime (instant-arrival movements) to avoid NaN from 0/0
    const totalTime = movement.arrivalTime.getTime() - movement.departureTime.getTime();
    if (totalTime <= 0) return null;

    // Calculate direction unit vector from source to destination in pixel space
    // Apply cos(lat) correction so the direction is visually accurate
    const latRad = (fromCentroid[1] * Math.PI) / 180;
    const dLng = (toCentroid[0] - fromCentroid[0]) * Math.cos(latRad);
    const dLat = -(toCentroid[1] - fromCentroid[1]); // invert Y for screen space
    const magnitude = Math.sqrt(dLng * dLng + dLat * dLat);
    const OFFSET_PX = 20;
    const offset: [number, number] = magnitude > 0
      ? [(dLng / magnitude) * OFFSET_PX, (dLat / magnitude) * OFFSET_PX]
      : [0, 0];

    return {
      id: movement.id,
      movement,
      longitude: fromCentroid[0],
      latitude: fromCentroid[1],
      offset,
    };
  }).filter(Boolean);
}

/**
 * Calculate combat marker data for active combats
 */
export function calculateCombatMarkers(
  activeCombats: ActiveCombat[],
  regionCentroids: Record<string, [number, number]>,
  borderMidpoints: Record<string, [number, number]> = {}
): (CombatMarkerData | null)[] {
  // Early return if centroids haven't loaded yet
  if (Object.keys(regionCentroids).length === 0) return [];

  return activeCombats
    .filter(combat => !combat.isComplete)
    .map((combat) => {
      // Prefer pre-computed border midpoint; fall back to average of the two centroids
      const pairKey = [combat.attackerRegionId, combat.defenderRegionId].sort().join('|');
      const midpoint = borderMidpoints[pairKey];
      let centroid: [number, number];
      if (midpoint) {
        centroid = midpoint;
      } else {
        const a = regionCentroids[combat.attackerRegionId];
        const d = regionCentroids[combat.defenderRegionId];
        if (!a || !d) return null;
        centroid = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2];
      }

      if (!Array.isArray(centroid) || centroid.length !== 2 ||
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

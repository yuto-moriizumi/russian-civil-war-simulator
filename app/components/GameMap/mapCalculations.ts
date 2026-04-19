import type { RegionState, Movement, ActiveCombat, CountryId, Region } from '../../types/game';

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
 * Calculate unit marker data for all regions with units.
 * Also synthesizes markers for defender divisions that are locked in active
 * combats (they are removed from region.divisions when combat starts, but
 * should still appear on the map at their defending region).
 */
export function calculateUnitMarkers(
  regions: RegionState,
  regionCentroids: Record<string, [number, number]>,
  selectedUnitRegion: string | null,
  playerCountry: CountryId,
  selectedDivisionIds: string[] = [],
  activeCombats: ActiveCombat[] = [],
  movingUnits: Movement[] = []
): (UnitMarkerData | null)[] {
  // Early return if centroids haven't loaded yet
  if (Object.keys(regionCentroids).length === 0) {
    console.warn('calculateUnitMarkers: Centroids not loaded yet');
    return [];
  }

  const selectedDivisionSet = new Set(selectedDivisionIds);

  // Divisions currently in transit stay in region.divisions (design intent) but
  // should not be shown on the static region marker — they are rendered separately
  // by the MovingUnitMarker. Exclude them from the region display.
  const inTransitDivisionIds = new Set<string>(
    movingUnits.flatMap(m => m.divisions.map(d => d.id))
  );

  // Build a map of extra divisions to overlay per region from active combats.
  // Defender divisions are pulled out of region.divisions when combat starts,
  // so we re-inject them here so they remain visible.
  const combatDefendersByRegion = new Map<string, typeof activeCombats[0]['defenderDivisions']>();
  for (const combat of activeCombats) {
    if (combat.isComplete) continue;
    const regionId = combat.defenderRegionId;
    const existing = combatDefendersByRegion.get(regionId) ?? [];
    const existingIds = new Set(existing.map(d => d.id));
    const newDivisions = combat.defenderDivisions.filter(d => !existingIds.has(d.id));
    combatDefendersByRegion.set(regionId, [...existing, ...newDivisions]);
  }

  // Collect all region IDs we need markers for: regions with divisions, plus
  // regions that only have combat defenders
  const regionIds = new Set([
    ...Object.keys(regions).filter(id => regions[id].divisions.length > 0),
    ...combatDefendersByRegion.keys(),
  ]);

  return Array.from(regionIds).map(regionId => {
    const region = regions[regionId];
    if (!region) return null;

    const centroid = regionCentroids[regionId];
    if (!centroid) {
      console.warn(`calculateUnitMarkers: Missing centroid for region ${regionId} (${region.name})`);
      return null;
    }

    // Merge resident divisions with defender divisions from ongoing combats,
    // but exclude in-transit divisions (shown separately by MovingUnitMarker).
    const combatDivisions = combatDefendersByRegion.get(regionId) ?? [];
    const allDivisions = [...region.divisions.filter(d => !inTransitDivisionIds.has(d.id)), ...combatDivisions];
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

    // Use the merged division list so the marker reflects all units present
    const regionWithCombatDivisions: Region = combatDivisions.length > 0
      ? { ...region, divisions: allDivisions }
      : region;

    return {
      regionId,
      region: regionWithCombatDivisions,
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
    // Guard against zero/negative totalTime (instant-arrival movements) to avoid NaN from 0/0
    if (totalTime <= 0) return null;
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

import * as turf from '@turf/turf';

// Movement speed constants
export const MOVEMENT_SPEED_KM_PER_HOUR = 4;
export const RETREAT_SPEED_MULTIPLIER = 2; // 2x faster = 8 km/h

/**
 * Calculate geographic distance between two regions using their centroids
 * @param fromRegionId - Source region ID
 * @param toRegionId - Destination region ID
 * @param centroids - Record of region centroids [longitude, latitude]
 * @returns Distance in kilometers (0 if centroids missing)
 */
export function calculateDistance(
  fromRegionId: string,
  toRegionId: string,
  centroids: Record<string, [number, number]>
): number {
  const from = centroids[fromRegionId];
  const to = centroids[toRegionId];
  
  if (!from || !to) {
    console.warn(`Missing centroid for ${fromRegionId} or ${toRegionId}`);
    return 0;
  }
  
  const fromPoint = turf.point(from);
  const toPoint = turf.point(to);
  return turf.distance(fromPoint, toPoint, { units: 'kilometers' });
}

/**
 * Calculate travel time in hours based on distance
 * @param distanceKm - Distance in kilometers
 * @param isRetreat - Whether this is a retreat movement (faster speed)
 * @returns Travel time in hours
 */
export function calculateTravelTime(
  distanceKm: number,
  isRetreat: boolean = false
): number {
  const speed = isRetreat 
    ? MOVEMENT_SPEED_KM_PER_HOUR * RETREAT_SPEED_MULTIPLIER
    : MOVEMENT_SPEED_KM_PER_HOUR;
  
  return distanceKm / speed;
}

/**
 * Format travel time for display
 * @param hours - Travel time in hours
 * @returns Formatted string (e.g., "2d 8h", "56h", "3d")
 */
export function formatTravelTime(hours: number): string {
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  
  if (days === 0) return `${remainingHours}h`;
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
}

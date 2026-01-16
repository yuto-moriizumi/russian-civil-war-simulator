import { useEffect, useState } from 'react';

// Calculate centroid of a polygon
const calculateCentroid = (coordinates: number[][][]): [number, number] => {
  let totalX = 0;
  let totalY = 0;
  let totalPoints = 0;
  
  // Handle MultiPolygon by iterating all rings
  for (const ring of coordinates) {
    for (const coord of ring) {
      totalX += coord[0];
      totalY += coord[1];
      totalPoints++;
    }
  }
  
  return [totalX / totalPoints, totalY / totalPoints];
};

/**
 * Hook to load region centroids from GeoJSON file
 */
export function useRegionCentroids() {
  const [regionCentroids, setRegionCentroids] = useState<Record<string, [number, number]>>({});

  useEffect(() => {
    const loadCentroids = async () => {
      try {
        const response = await fetch('/map/regions.geojson');
        const data = await response.json();
        const centroids: Record<string, [number, number]> = {};
        
        for (const feature of data.features) {
          const id = feature.properties?.shapeID;
          if (!id) continue;
          
          const geometry = feature.geometry;
          if (geometry.type === 'Polygon') {
            centroids[id] = calculateCentroid(geometry.coordinates);
          } else if (geometry.type === 'MultiPolygon') {
            // For MultiPolygon, use the largest polygon's centroid
            let largestRing = geometry.coordinates[0];
            let maxPoints = 0;
            for (const polygon of geometry.coordinates) {
              const points = polygon[0]?.length || 0;
              if (points > maxPoints) {
                maxPoints = points;
                largestRing = polygon;
              }
            }
            centroids[id] = calculateCentroid(largestRing);
          }
        }
        
        console.log('Loaded region centroids:', Object.keys(centroids).length, 'regions');
        setRegionCentroids(centroids);
      } catch (error) {
        console.error('Failed to load centroids:', error);
      }
    };
    
    loadCentroids();
  }, []);

  return regionCentroids;
}

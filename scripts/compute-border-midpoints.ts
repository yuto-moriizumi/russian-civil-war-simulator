/**
 * Compute border midpoints from existing regions.geojson and adjacency.json
 *
 * Uses centroid-to-centroid midpoint as a fallback, and computes actual
 * shared-border midpoints where possible from the polygon geometry.
 *
 * Usage: npx tsx scripts/compute-border-midpoints.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface RegionFeature {
  type: string;
  id: string;
  properties: Record<string, string>;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

interface RegionFeatureCollection {
  type: string;
  features: RegionFeature[];
}

interface Adjacency {
  [regionId: string]: string[];
}

/**
 * Compute the centroid of a GeoJSON polygon or multipolygon
 */
function computeCentroid(feature: RegionFeature): [number, number] | null {
  let coords: number[][] = [];

  if (feature.geometry.type === 'Polygon') {
    coords = (feature.geometry.coordinates[0] || []) as number[][];
  } else if (feature.geometry.type === 'MultiPolygon') {
    let maxLen = 0;
    for (const polygon of feature.geometry.coordinates) {
      const ring = polygon[0] as number[][];
      if (ring && ring.length > maxLen) {
        maxLen = ring.length;
        coords = ring;
      }
    }
  }

  if (coords.length === 0) return null;

  const sumLng = coords.reduce((sum, c) => sum + c[0], 0);
  const sumLat = coords.reduce((sum, c) => sum + c[1], 0);

  return [sumLng / coords.length, sumLat / coords.length];
}

/**
 * Find shared boundary points between two polygon rings
 * Points that are within a small epsilon are considered shared
 */
function findSharedBoundaryPoints(
  ring1: number[][],
  ring2: number[][],
  epsilon: number = 0.0001
): [number, number][] {
  const shared: [number, number][] = [];
  // Use spatial hashing for performance
  const hash = (x: number, y: number): string =>
    `${Math.round(x / epsilon) * epsilon},${Math.round(y / epsilon) * epsilon}`;

  const ring2Set = new Set<string>();
  for (const point of ring2) {
    ring2Set.add(hash(point[0], point[1]));
  }

  for (const point of ring1) {
    const key = hash(point[0], point[1]);
    if (ring2Set.has(key)) {
      shared.push([point[0], point[1]]);
    }
  }

  return shared;
}

/**
 * Get all rings from a feature's geometry
 */
function getAllRings(feature: RegionFeature): number[][][] {
  const rings: number[][][] = [];
  if (feature.geometry.type === 'Polygon') {
    for (const ring of feature.geometry.coordinates) {
      rings.push(ring as number[][]);
    }
  } else if (feature.geometry.type === 'MultiPolygon') {
    for (const polygon of feature.geometry.coordinates) {
      for (const ring of polygon) {
        rings.push(ring as number[][]);
      }
    }
  }
  return rings;
}

function main() {
  console.log('=== Computing Border Midpoints ===\n');

  const geojsonPath = path.resolve(__dirname, '../public/map/regions.geojson');
  const adjacencyPath = path.resolve(__dirname, '../public/map/adjacency.json');
  const outputPath = path.resolve(__dirname, '../public/map/borderMidpoints.json');

  const geojson: RegionFeatureCollection = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));
  const adjacency: Adjacency = JSON.parse(fs.readFileSync(adjacencyPath, 'utf-8'));

  // Compute centroids for all regions
  const centroids: Record<string, [number, number]> = {};
  const featureMap: Record<string, RegionFeature> = {};

  for (const feature of geojson.features) {
    const regionId = feature.id as string;
    if (regionId) {
      featureMap[regionId] = feature;
      const centroid = computeCentroid(feature);
      if (centroid) {
        centroids[regionId] = centroid;
      }
    }
  }

  console.log(`Loaded ${geojson.features.length} regions`);
  console.log(`Loaded ${Object.keys(adjacency).length} adjacency entries\n`);

  // Compute border midpoints for each adjacent pair
  const midpoints: Record<string, [number, number]> = {};
  let computedFromBorder = 0;
  let computedFromCentroid = 0;
  const processedPairs = new Set<string>();

  for (const [regionId, neighbors] of Object.entries(adjacency)) {
    const feature1 = featureMap[regionId];
    if (!feature1) continue;

    const rings1 = getAllRings(feature1);

    for (const neighborId of neighbors) {
      const pairKey = [regionId, neighborId].sort().join('|');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const feature2 = featureMap[neighborId];
      if (!feature2) {
        // Fallback to centroid midpoint
        const c1 = centroids[regionId];
        const c2 = centroids[neighborId];
        if (c1 && c2) {
          midpoints[pairKey] = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];
          computedFromCentroid++;
        }
        continue;
      }

      const rings2 = getAllRings(feature2);

      // Find shared boundary points between all ring combinations
      let allSharedPoints: [number, number][] = [];

      for (const ring1 of rings1) {
        for (const ring2 of rings2) {
          const shared = findSharedBoundaryPoints(ring1, ring2);
          allSharedPoints.push(...shared);
        }
      }

      if (allSharedPoints.length > 0) {
        // Compute centroid of shared boundary points
        const sumLng = allSharedPoints.reduce((sum, c) => sum + c[0], 0);
        const sumLat = allSharedPoints.reduce((sum, c) => sum + c[1], 0);
        midpoints[pairKey] = [sumLng / allSharedPoints.length, sumLat / allSharedPoints.length];
        computedFromBorder++;
      } else {
        // Fallback to centroid midpoint
        const c1 = centroids[regionId];
        const c2 = centroids[neighborId];
        if (c1 && c2) {
          midpoints[pairKey] = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];
          computedFromCentroid++;
        }
      }
    }
  }

  console.log(`Computed from shared border: ${computedFromBorder}`);
  console.log(`Computed from centroid fallback: ${computedFromCentroid}`);
  console.log(`Total midpoints: ${Object.keys(midpoints).length}\n`);

  fs.writeFileSync(outputPath, JSON.stringify(midpoints, null, 2));
  console.log(`Saved to: ${outputPath}`);

  // Sample output
  const sampleKeys = Object.keys(midpoints).slice(0, 5);
  console.log('\nSample midpoints:');
  for (const key of sampleKeys) {
    console.log(`  ${key}: [${midpoints[key][0].toFixed(4)}, ${midpoints[key][1].toFixed(4)}]`);
  }

  console.log('\n=== Done ===');
}

main();

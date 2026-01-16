import { NextRequest, NextResponse } from 'next/server';
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import * as turf from '@turf/turf';

interface GenerateAdjacencyRequest {
  geojson: FeatureCollection;
  options?: {
    bufferKm?: number;
    detectIsolated?: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateAdjacencyRequest = await request.json();
    const { geojson, options = {} } = body;
    const { bufferKm = 2, detectIsolated = true } = options;

    if (!geojson || geojson.type !== 'FeatureCollection') {
      return NextResponse.json(
        { error: 'Valid FeatureCollection required' },
        { status: 400 }
      );
    }

    const adjacency: Record<string, string[]> = {};
    const features = geojson.features;
    let totalConnections = 0;

    // Initialize adjacency lists
    for (const feature of features) {
      const regionId = feature.properties?.regionId || feature.properties?.shapeISO;
      if (regionId) {
        adjacency[regionId] = [];
      }
    }

    console.log(`Generating adjacency for ${features.length} regions...`);

    // Method 1: Direct intersection check (for adjacent regions)
    for (let i = 0; i < features.length; i++) {
      const featureA = features[i];
      const idA = featureA.properties?.regionId || featureA.properties?.shapeISO;
      if (!idA) continue;

      for (let j = i + 1; j < features.length; j++) {
        const featureB = features[j];
        const idB = featureB.properties?.regionId || featureB.properties?.shapeISO;
        if (!idB) continue;

        try {
          // Check if boundaries touch or intersect
          const geometryA = featureA.geometry as Polygon | MultiPolygon;
          const geometryB = featureB.geometry as Polygon | MultiPolygon;

          if (turf.booleanIntersects(geometryA, geometryB)) {
            adjacency[idA].push(idB);
            adjacency[idB].push(idA);
            totalConnections++;
          }
        } catch (error) {
          // Skip invalid geometries
          console.error(`Error checking intersection between ${idA} and ${idB}:`, error);
        }
      }
    }

    console.log(`Found ${totalConnections} connections via direct intersection`);

    // Method 2: Buffer-based detection for near-misses (cross-border)
    let bufferConnections = 0;
    for (let i = 0; i < features.length; i++) {
      const featureA = features[i];
      const idA = featureA.properties?.regionId || featureA.properties?.shapeISO;
      if (!idA) continue;

      try {
        const geometryA = featureA.geometry as Polygon | MultiPolygon;
        const bufferedA = turf.buffer(geometryA, bufferKm, { units: 'kilometers' });
        if (!bufferedA) continue;

        for (let j = i + 1; j < features.length; j++) {
          const featureB = features[j];
          const idB = featureB.properties?.regionId || featureB.properties?.shapeISO;
          if (!idB) continue;

          // Skip if already adjacent
          if (adjacency[idA].includes(idB)) continue;

          try {
            const geometryB = featureB.geometry as Polygon | MultiPolygon;
            
            if (turf.booleanIntersects(bufferedA, geometryB)) {
              adjacency[idA].push(idB);
              adjacency[idB].push(idA);
              bufferConnections++;
            }
          } catch (error) {
            // Skip invalid geometries
          }
        }
      } catch (error) {
        console.error(`Error buffering ${idA}:`, error);
      }
    }

    console.log(`Found ${bufferConnections} additional connections via buffer (${bufferKm}km)`);

    // Method 3: Detect isolated regions (enclaves)
    let enclaveConnections = 0;
    if (detectIsolated) {
      for (const feature of features) {
        const regionId = feature.properties?.regionId || feature.properties?.shapeISO;
        if (!regionId || adjacency[regionId].length > 0) continue;

        try {
          // This region has no adjacencies yet - check if it's inside another region
          const geometry = feature.geometry as Polygon | MultiPolygon;
          const centroid = turf.centroid(geometry);

          for (const otherFeature of features) {
            const otherId = otherFeature.properties?.regionId || otherFeature.properties?.shapeISO;
            if (!otherId || otherId === regionId) continue;

            try {
              const otherGeometry = otherFeature.geometry as Polygon | MultiPolygon;
              
              if (turf.booleanPointInPolygon(centroid, otherGeometry)) {
                adjacency[regionId].push(otherId);
                adjacency[otherId].push(regionId);
                enclaveConnections++;
                console.log(`  Enclave detected: ${regionId} inside ${otherId}`);
                break;
              }
            } catch (error) {
              // Skip
            }
          }
        } catch (error) {
          console.error(`Error detecting enclave for ${regionId}:`, error);
        }
      }
    }

    console.log(`Found ${enclaveConnections} enclave connections`);

    // Find isolated regions (still no connections)
    const isolatedRegions = Object.entries(adjacency)
      .filter(([_, neighbors]) => neighbors.length === 0)
      .map(([id]) => id);

    const stats = {
      totalRegions: features.length,
      totalConnections: totalConnections + bufferConnections + enclaveConnections,
      isolatedRegions,
    };

    return NextResponse.json({ adjacency, stats });
  } catch (error) {
    console.error('Error generating adjacency:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

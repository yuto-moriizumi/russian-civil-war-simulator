/**
 * Shared type definitions for map processing scripts
 */

export interface CountryConfig {
  iso3: string;
  name: string;
  admLevel: string;
}

export interface MapConfig {
  countries: CountryConfig[];
  customAdjacency?: {
    [regionId: string]: string[];
  };
  output: {
    geojson: string;
    adjacency: string;
  };
  api: {
    baseUrl: string;
  };
}

export interface Adjacency {
  [regionId: string]: string[];
}

// GeoJSON types — defined in /types.ts (repo root) and re-exported here
// so script code can import them from the familiar scripts/lib/types path.
export type { RegionFeatureProperties, RegionFeature, RegionFeatureCollection } from '../../types.js';

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

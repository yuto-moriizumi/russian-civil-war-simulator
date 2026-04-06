/**
 * Shared GeoJSON type wrappers used by both the app (app/) and build scripts (scripts/).
 *
 * These narrow the generic GeoJSON types to the exact shape of
 * public/map/regions.geojson, making imports of FeatureCollection from the
 * 'geojson' package unnecessary outside of this file.
 */

import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export interface RegionFeatureProperties {
  shapeName: string;   // Human-readable region name (e.g. "Altai Krai")
  countryIso3: string; // ISO 3-letter country code (e.g. "RUS", "UKR")
  id: string;          // Duplicate of feature.id — required for MapLibre promoteId
}

export type RegionFeature = Feature<Polygon | MultiPolygon, RegionFeatureProperties>;

export type RegionFeatureCollection = FeatureCollection<Polygon | MultiPolygon, RegionFeatureProperties>;

/**
 * Spatial indexing utilities using RBush R-tree
 * 
 * Provides fast spatial queries for geographic features using bounding box indexing.
 * This dramatically improves performance of adjacency detection from O(n²) to O(n log n).
 */

import RBush from 'rbush';
import type { Feature } from 'geojson';
import { computeBBox } from './geometry-utils.js';

/**
 * Feature indexed by bounding box for spatial queries
 */
export interface IndexedFeature {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  feature: Feature;
  regionId: string;
  countryIso3: string;
}

/**
 * Build a spatial index from a collection of features
 * 
 * Uses bulk loading for optimal performance (2-3x faster than individual inserts).
 * 
 * @param features - Array of GeoJSON features to index
 * @returns RBush spatial index
 */
export function buildSpatialIndex(features: Feature[]): RBush<IndexedFeature> {
  const tree = new RBush<IndexedFeature>();
  
  const items: IndexedFeature[] = [];
  
  for (const feature of features) {
    const regionId = feature.properties?.regionId as string;
    const countryIso3 = feature.properties?.countryIso3 as string;
    
    if (!regionId || !countryIso3) {
      continue;
    }
    
    const [minX, minY, maxX, maxY] = computeBBox(feature);
    
    items.push({
      minX,
      minY,
      maxX,
      maxY,
      feature,
      regionId,
      countryIso3,
    });
  }
  
  // Bulk load for optimal performance
  tree.load(items);
  
  return tree;
}

/**
 * Query features whose bounding boxes intersect with the given bbox (with optional margin)
 * 
 * @param tree - Spatial index to query
 * @param bbox - Bounding box [minX, minY, maxX, maxY]
 * @param margin - Margin to expand the query bbox (in degrees)
 * @returns Array of indexed features that intersect
 */
export function queryNearby(
  tree: RBush<IndexedFeature>,
  bbox: [number, number, number, number],
  margin: number = 0
): IndexedFeature[] {
  const [minX, minY, maxX, maxY] = bbox;
  
  return tree.search({
    minX: minX - margin,
    minY: minY - margin,
    maxX: maxX + margin,
    maxY: maxY + margin,
  });
}

/**
 * Query features from a different country than the given country
 * 
 * @param tree - Spatial index to query
 * @param bbox - Bounding box [minX, minY, maxX, maxY]
 * @param excludeCountry - Country to exclude from results
 * @param margin - Margin to expand the query bbox (in degrees)
 * @returns Array of indexed features from different countries
 */
export function queryCrossBorder(
  tree: RBush<IndexedFeature>,
  bbox: [number, number, number, number],
  excludeCountry: string,
  margin: number = 0
): IndexedFeature[] {
  const candidates = queryNearby(tree, bbox, margin);
  return candidates.filter(item => item.countryIso3 !== excludeCountry);
}

/**
 * Query features from the same country
 * 
 * @param tree - Spatial index to query
 * @param bbox - Bounding box [minX, minY, maxX, maxY]
 * @param country - Country to filter results
 * @param margin - Margin to expand the query bbox (in degrees)
 * @returns Array of indexed features from the same country
 */
export function querySameCountry(
  tree: RBush<IndexedFeature>,
  bbox: [number, number, number, number],
  country: string,
  margin: number = 0
): IndexedFeature[] {
  const candidates = queryNearby(tree, bbox, margin);
  return candidates.filter(item => item.countryIso3 === country);
}

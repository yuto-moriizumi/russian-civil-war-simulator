/**
 * GeoJSON utilities for loading, merging, and processing map data
 */

import * as fs from 'fs';
import * as path from 'path';
import type { FeatureCollection, Feature } from 'geojson';
import type { MapConfig } from './types.js';
import { quantizeGeometry, COORDINATE_PRECISION } from './geometry-utils.js';

/**
 * Load configuration from map-config.json
 */
export function loadConfig(scriptsDir: string): MapConfig {
  const configPath = path.join(scriptsDir, 'map-config.json');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(configContent);
}

/**
 * Load a GeoJSON file from disk
 */
export function loadGeoJSON(filePath: string): FeatureCollection {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * GeoJSONのプロパティから一意のリージョンIDを生成する
 * 
 * 優先順位:
 * 1. shapeISO (例: "RU-ALT") - 最も読みやすい
 * 2. shapeID (例: "28173009B80457268982215") - 一意だが読みにくい
 * 3. 国コード + 名前 - フォールバック
 */
export function getRegionId(feature: Feature, countryIso3: string): string {
  const props = feature.properties || {};
  
  // shapeISO が最優先（読みやすいISO形式）
  const shapeIso = props.shapeISO || props.SHAPEISO;
  if (shapeIso) {
    return shapeIso;
  }
  
  // shapeIDがある場合
  const shapeId = props.shapeID || props.SHAPEID || props.id;
  if (shapeId) {
    return shapeId;
  }
  
  // フォールバック: 国コード + 名前
  const name = props.shapeName || props.SHAPENAME || props.name || props.NAME || 'unknown';
  return `${countryIso3}-${name.replace(/\s+/g, '_')}`;
}

/**
 * 複数のGeoJSONを1つに結合する
 */
export function mergeGeoJSON(
  geojsonFiles: { filePath: string; countryIso3: string }[]
): FeatureCollection {
  const mergedFeatures: Feature[] = [];
  
  for (const { filePath, countryIso3 } of geojsonFiles) {
    console.log(`  Loading: ${filePath}`);
    const geojson = loadGeoJSON(filePath);
    
    for (const feature of geojson.features) {
      // リージョンIDを追加
      const regionId = getRegionId(feature, countryIso3);
      
      // 座標を量子化して異なるソース間のズレを解消
      const quantizedGeometry = quantizeGeometry(feature.geometry);
      
      const enhancedFeature: Feature = {
        ...feature,
        geometry: quantizedGeometry,
        properties: {
          ...feature.properties,
          regionId,
          countryIso3,
        },
      };
      
      mergedFeatures.push(enhancedFeature);
    }
    
    console.log(`    Added ${geojson.features.length} features`);
  }
  
  console.log(`  Coordinates quantized to ${COORDINATE_PRECISION} decimal places (~${Math.round(111000 / Math.pow(10, COORDINATE_PRECISION))}m precision)`);
  
  return {
    type: 'FeatureCollection',
    features: mergedFeatures,
  };
}

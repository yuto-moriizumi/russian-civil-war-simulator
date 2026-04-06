/**
 * GeoJSON utilities for loading, merging, and processing map data
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MapConfig, RegionFeature, RegionFeatureCollection } from './types.js';
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
export function loadGeoJSON(filePath: string): RegionFeatureCollection {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/** Raw GeoJSON feature as it comes from the downloaded source files. */
interface RawFeature {
  type: 'Feature';
  id?: string | number;
  properties: Record<string, unknown> | null;
  geometry: RegionFeature['geometry'];
}

/** Raw GeoJSON FeatureCollection as it comes from the downloaded source files. */
interface RawFeatureCollection {
  type: 'FeatureCollection';
  features: RawFeature[];
}

/**
 * Load a raw GeoJSON file from disk (before property normalisation).
 */
function loadRawGeoJSON(filePath: string): RawFeatureCollection {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as RawFeatureCollection;
}

/**
 * GeoJSONのプロパティから一意のリージョンIDを生成する
 * 
 * 優先順位:
 * 1. shapeISO (例: "RU-ALT") - 最も読みやすい
 * 2. shapeID (例: "28173009B80457268982215") - 一意だが読みにくい
 * 3. 国コード + 名前 - フォールバック
 */
export function getRegionId(feature: RawFeature, countryIso3: string): string {
  const props = feature.properties || {};
  
  // shapeISO が最優先（読みやすいISO形式）
  const shapeIso = props.shapeISO || props.SHAPEISO;
  if (shapeIso) {
    return String(shapeIso);
  }
  
  // shapeIDがある場合
  const shapeId = props.shapeID || props.SHAPEID || props.id;
  if (shapeId) {
    return String(shapeId);
  }
  
  // フォールバック: 国コード + 名前
  const name = props.shapeName || props.SHAPENAME || props.name || props.NAME || 'unknown';
  return `${countryIso3}-${String(name).replace(/\s+/g, '_')}`;
}

/**
 * 複数のGeoJSONを1つに結合する
 */
export function mergeGeoJSON(
  geojsonFiles: { filePath: string; countryIso3: string }[]
): RegionFeatureCollection {
  const mergedFeatures: RegionFeature[] = [];
  
  for (const { filePath, countryIso3 } of geojsonFiles) {
    console.log(`  Loading: ${filePath}`);
    const geojson = loadRawGeoJSON(filePath);
    
    for (const feature of geojson.features) {
      // リージョンIDを追加
      const regionId = getRegionId(feature, countryIso3);
      
      // 座標を量子化して異なるソース間のズレを解消
      const quantizedGeometry = quantizeGeometry(
        feature.geometry as import('geojson').Geometry
      ) as RegionFeature['geometry'];
      
      // 不要なプロパティを除去
      const {
        shapeISO, SHAPEISO, shapeID, SHAPEID,
        shapeGroup, SHAPEGROUP,
        shapeType, SHAPETYPE,
        regionId: _regionId,
        shapeName,
        ...restProps
      } = (feature.properties || {}) as unknown as Record<string, unknown>;
      void shapeISO; void SHAPEISO; void shapeID; void SHAPEID;
      void shapeGroup; void SHAPEGROUP; void shapeType; void SHAPETYPE;
      void _regionId;
      void restProps;
      
      const enhancedFeature: RegionFeature = {
        type: 'Feature',
        id: regionId,
        geometry: quantizedGeometry,
        properties: {
          shapeName: String(shapeName || regionId),
          countryIso3,
          id: regionId,
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

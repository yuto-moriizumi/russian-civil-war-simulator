/**
 * Adjacency detection functions for geographic regions
 * 
 * Optimized with RBush spatial indexing for O(n log n) performance
 */

import * as turf from '@turf/turf';
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import type RBush from 'rbush';
import type { Adjacency } from './types.js';
import { computeBBox } from './geometry-utils.js';
import { buildSpatialIndex, queryCrossBorder, querySameCountry, type IndexedFeature } from './spatial-index.js';

/**
 * 異なる国の間の隣接関係を検出する（境界データの不整合を補完）
 * 
 * GeoJSONデータソースが異なる国では境界が完全に一致しないため、
 * TopoJSONのarc共有では検出できない。バッファ付きの交差判定で検出する。
 * 
 * 最適化: RBush空間インデックスを使用してO(n log n)の性能を実現
 */
export function detectCrossBorderAdjacency(
  mergedGeoJSON: FeatureCollection,
  existingAdjacency: Adjacency,
  spatialIndex?: RBush<IndexedFeature>
): { adjacency: Adjacency; addedCount: number } {
  const adjacency: Adjacency = {};
  
  // 既存の隣接関係をコピー
  for (const [key, value] of Object.entries(existingAdjacency)) {
    adjacency[key] = [...value];
  }
  
  const features = mergedGeoJSON.features;
  let addedCount = 0;
  let candidatesChecked = 0;
  
  // 1. 空間インデックスを構築（渡されていない場合のみ）
  if (!spatialIndex) {
    console.log(`  Building spatial index for ${features.length} features...`);
    spatialIndex = buildSpatialIndex(features);
  }
  
  // 2. バッファ付きジオメトリを遅延キャッシュ（必要なときのみ計算）
  const bufferCache = new Map<string, Feature>();
  const getBuffered = (regionId: string, feature: Feature): Feature | null => {
    if (bufferCache.has(regionId)) {
      return bufferCache.get(regionId)!;
    }
    
    try {
      const geom = feature.geometry as Polygon | MultiPolygon;
      const buffered = turf.buffer(turf.feature(geom), 2, { units: 'kilometers' });
      if (buffered) {
        bufferCache.set(regionId, buffered);
        return buffered;
      }
    } catch {
      // ジオメトリエラーは無視
    }
    return null;
  };
  
  console.log(`  Checking cross-border adjacency with spatial queries...`);
  
  // 3. 各フィーチャーに対して、異なる国の近隣候補のみをクエリ
  for (const feature of features) {
    const idA = feature.properties?.regionId as string;
    const countryA = feature.properties?.countryIso3 as string;
    
    if (!idA || !countryA) continue;
    
    const bboxA = computeBBox(feature);
    
    // 空間インデックスから異なる国の候補のみを取得（マージン0.5度 ≈ 55km）
    const candidates = queryCrossBorder(spatialIndex, bboxA, countryA, 0.5);
    
    for (const candidate of candidates) {
      const idB = candidate.regionId;
      
      // 既に隣接している場合はスキップ
      if (adjacency[idA]?.includes(idB)) continue;
      
      candidatesChecked++;
      
      // 遅延バッファリング：必要なときのみバッファを計算
      const bufferedA = getBuffered(idA, feature);
      const bufferedB = getBuffered(idB, candidate.feature);
      
      if (!bufferedA || !bufferedB) continue;
      
      try {
        if (turf.booleanIntersects(bufferedA, bufferedB)) {
          // 隣接を追加
          if (!adjacency[idA]) adjacency[idA] = [];
          if (!adjacency[idB]) adjacency[idB] = [];
          
          if (!adjacency[idA].includes(idB)) {
            adjacency[idA].push(idB);
          }
          if (!adjacency[idB].includes(idA)) {
            adjacency[idB].push(idA);
          }
          addedCount++;
        }
      } catch {
        // ジオメトリエラーは無視
      }
    }
  }
  
  console.log(`  Checked ${candidatesChecked} candidate pairs (spatial index optimization)`);
  
  // ソート
  for (const regionId of Object.keys(adjacency)) {
    adjacency[regionId].sort();
  }
  
  return { adjacency, addedCount };
}

/**
 * 同じ国内の隣接関係を検出する（arc共有で検出できなかった場合の補完）
 * 
 * 一部のリージョンはarc共有が正しく機能しないため、
 * 直接交差判定で隣接関係を検出する。
 * 
 * 最適化: RBush空間インデックスを使用してO(n log n)の性能を実現
 */
export function detectSameCountryAdjacency(
  mergedGeoJSON: FeatureCollection,
  existingAdjacency: Adjacency,
  spatialIndex?: RBush<IndexedFeature>
): { adjacency: Adjacency; addedCount: number } {
  const adjacency: Adjacency = {};
  
  // 既存の隣接関係をコピー
  for (const [key, value] of Object.entries(existingAdjacency)) {
    adjacency[key] = [...value];
  }
  
  let addedCount = 0;
  let candidatesChecked = 0;
  
  // 空間インデックスを構築（渡されていない場合のみ）
  if (!spatialIndex) {
    console.log(`  Building spatial index for same-country checks...`);
    spatialIndex = buildSpatialIndex(mergedGeoJSON.features);
  }
  
  // 各フィーチャーに対して、同じ国の近隣候補のみをクエリ
  for (const feature of mergedGeoJSON.features) {
    const idA = feature.properties?.regionId as string;
    const countryA = feature.properties?.countryIso3 as string;
    
    if (!idA || !countryA) continue;
    
    const bboxA = computeBBox(feature);
    
    // 同じ国の候補のみを取得（マージンなし、厳密なbbox交差）
    const candidates = querySameCountry(spatialIndex, bboxA, countryA, 0);
    
    for (const candidate of candidates) {
      const idB = candidate.regionId;
      
      // 自分自身はスキップ
      if (idA === idB) continue;
      
      // 既に隣接している場合はスキップ
      if (adjacency[idA]?.includes(idB)) continue;
      
      candidatesChecked++;
      
      // 直接交差判定
      try {
        const geomA = feature.geometry as Polygon | MultiPolygon;
        const geomB = candidate.feature.geometry as Polygon | MultiPolygon;
        
        if (turf.booleanIntersects(turf.feature(geomA), turf.feature(geomB))) {
          if (!adjacency[idA]) adjacency[idA] = [];
          if (!adjacency[idB]) adjacency[idB] = [];
          
          if (!adjacency[idA].includes(idB)) {
            adjacency[idA].push(idB);
          }
          if (!adjacency[idB].includes(idA)) {
            adjacency[idB].push(idA);
          }
          addedCount++;
        }
      } catch {
        // ジオメトリエラーは無視
      }
    }
  }
  
  console.log(`  Checked ${candidatesChecked} same-country candidate pairs (spatial index optimization)`);
  
  // ソート
  for (const regionId of Object.keys(adjacency)) {
    adjacency[regionId].sort();
  }
  
  return { adjacency, addedCount };
}

/**
 * 孤立したリージョン（隣接が0のリージョン）の隣接関係を検出する
 * 
 * 飛び地や首都（例：BY-HM ミンスク市）など、内包されているリージョンを検出する
 * 
 * 最適化: RBush空間インデックスを使用してO(n log n)の性能を実現
 */
export function detectIsolatedRegionAdjacency(
  mergedGeoJSON: FeatureCollection,
  existingAdjacency: Adjacency,
  spatialIndex?: RBush<IndexedFeature>
): { adjacency: Adjacency; addedCount: number } {
  const adjacency: Adjacency = {};
  
  // 既存の隣接関係をコピー
  for (const [key, value] of Object.entries(existingAdjacency)) {
    adjacency[key] = [...value];
  }
  
  let addedCount = 0;
  
  // 孤立したリージョンを検出
  const isolatedRegions: Feature[] = [];
  for (const feature of mergedGeoJSON.features) {
    const regionId = feature.properties?.regionId as string;
    if (regionId && (!adjacency[regionId] || adjacency[regionId].length === 0)) {
      isolatedRegions.push(feature);
    }
  }
  
  if (isolatedRegions.length === 0) {
    return { adjacency, addedCount };
  }
  
  console.log(`  Found ${isolatedRegions.length} isolated regions, checking containment...`);
  
  // 空間インデックスを構築（渡されていない場合のみ）
  if (!spatialIndex) {
    spatialIndex = buildSpatialIndex(mergedGeoJSON.features);
  }
  
  // 各孤立リージョンについて、包含している/隣接しているリージョンを探す
  for (const isolatedFeature of isolatedRegions) {
    const isolatedId = isolatedFeature.properties?.regionId as string;
    const isolatedCountry = isolatedFeature.properties?.countryIso3 as string;
    const isolatedBbox = computeBBox(isolatedFeature);
    
    // 同じ国の候補を空間クエリで取得（マージン0.1度）
    const candidates = querySameCountry(spatialIndex, isolatedBbox, isolatedCountry, 0.1);
    
    for (const candidate of candidates) {
      const candidateId = candidate.regionId;
      
      if (candidateId === isolatedId) continue;
      
      try {
        const isolatedGeom = isolatedFeature.geometry as Polygon | MultiPolygon;
        const candidateGeom = candidate.feature.geometry as Polygon | MultiPolygon;
        
        // 包含または交差をチェック
        const isolatedCentroid = turf.centroid(turf.feature(isolatedGeom));
        
        if (turf.booleanPointInPolygon(isolatedCentroid, turf.feature(candidateGeom)) ||
            turf.booleanIntersects(turf.feature(isolatedGeom), turf.feature(candidateGeom))) {
          
          // 隣接を追加
          if (!adjacency[isolatedId]) adjacency[isolatedId] = [];
          if (!adjacency[candidateId]) adjacency[candidateId] = [];
          
          if (!adjacency[isolatedId].includes(candidateId)) {
            adjacency[isolatedId].push(candidateId);
          }
          if (!adjacency[candidateId].includes(isolatedId)) {
            adjacency[candidateId].push(isolatedId);
          }
          addedCount++;
          console.log(`    Connected isolated region ${isolatedId} to ${candidateId}`);
          break; // 1つ見つかれば十分
        }
      } catch {
        // ジオメトリエラーは無視
      }
    }
  }
  
  // ソート
  for (const regionId of Object.keys(adjacency)) {
    adjacency[regionId].sort();
  }
  
  return { adjacency, addedCount };
}

/**
 * カスタム隣接関係を適用する
 * 
 * map-config.json の customAdjacency フィールドで定義された
 * 手動の隣接関係を追加する。自動検出では見つからない隣接関係
 * （例：海峡を隔てた地域、フェリー航路など）を定義できる。
 */
export function applyCustomAdjacency(
  existingAdjacency: Adjacency,
  customAdjacency?: { [regionId: string]: string[] }
): { adjacency: Adjacency; addedCount: number } {
  const adjacency: Adjacency = {};
  
  // 既存の隣接関係をコピー
  for (const [key, value] of Object.entries(existingAdjacency)) {
    adjacency[key] = [...value];
  }
  
  let addedCount = 0;
  
  if (!customAdjacency) {
    return { adjacency, addedCount };
  }
  
  console.log('  Applying custom adjacency definitions...');
  
  for (const [regionId, neighbors] of Object.entries(customAdjacency)) {
    if (!adjacency[regionId]) {
      adjacency[regionId] = [];
    }
    
    for (const neighborId of neighbors) {
      // 双方向に追加
      if (!adjacency[regionId].includes(neighborId)) {
        adjacency[regionId].push(neighborId);
        addedCount++;
        console.log(`    Added custom adjacency: ${regionId} <-> ${neighborId}`);
      }
      
      if (!adjacency[neighborId]) {
        adjacency[neighborId] = [];
      }
      if (!adjacency[neighborId].includes(regionId)) {
        adjacency[neighborId].push(regionId);
      }
    }
  }
  
  // ソート
  for (const regionId of Object.keys(adjacency)) {
    adjacency[regionId].sort();
  }
  
  return { adjacency, addedCount };
}

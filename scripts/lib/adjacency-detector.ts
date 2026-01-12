/**
 * Adjacency detection functions for geographic regions
 */

import * as turf from '@turf/turf';
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import type { Adjacency } from './types.js';
import { computeBBox, bboxIntersects } from './geometry-utils.js';

/**
 * 異なる国の間の隣接関係を検出する（境界データの不整合を補完）
 * 
 * GeoJSONデータソースが異なる国では境界が完全に一致しないため、
 * TopoJSONのarc共有では検出できない。バッファ付きの交差判定で検出する。
 */
export function detectCrossBorderAdjacency(
  mergedGeoJSON: FeatureCollection,
  existingAdjacency: Adjacency
): { adjacency: Adjacency; addedCount: number } {
  const adjacency: Adjacency = {};
  
  // 既存の隣接関係をコピー
  for (const [key, value] of Object.entries(existingAdjacency)) {
    adjacency[key] = [...value];
  }
  
  const features = mergedGeoJSON.features;
  let addedCount = 0;
  
  // 国ごとにフィーチャーをグループ化
  const featuresByCountry: Map<string, Feature[]> = new Map();
  for (const feature of features) {
    const country = feature.properties?.countryIso3 as string;
    if (!featuresByCountry.has(country)) {
      featuresByCountry.set(country, []);
    }
    featuresByCountry.get(country)!.push(feature);
  }
  
  const countries = Array.from(featuresByCountry.keys());
  console.log(`  Checking cross-border adjacency between ${countries.length} countries...`);
  
  // 異なる国のペアのみをチェック
  for (let c1 = 0; c1 < countries.length; c1++) {
    for (let c2 = c1 + 1; c2 < countries.length; c2++) {
      const country1 = countries[c1];
      const country2 = countries[c2];
      const features1 = featuresByCountry.get(country1)!;
      const features2 = featuresByCountry.get(country2)!;
      
      for (const featureA of features1) {
        for (const featureB of features2) {
          const idA = featureA.properties?.regionId as string;
          const idB = featureB.properties?.regionId as string;
          
          if (!idA || !idB) continue;
          
          // 既に隣接している場合はスキップ
          if (adjacency[idA]?.includes(idB)) continue;
          
          // バウンディングボックスの交差チェック（マージン付き）
          const bboxA = computeBBox(featureA);
          const bboxB = computeBBox(featureB);
          if (!bboxIntersects(bboxA, bboxB, 0.5)) continue;
          
          // バッファ付きで交差判定（約2km）
          try {
            const geomA = featureA.geometry as Polygon | MultiPolygon;
            const geomB = featureB.geometry as Polygon | MultiPolygon;
            
            // 小さいバッファでポリゴンを拡張して交差判定
            const bufferedA = turf.buffer(turf.feature(geomA), 2, { units: 'kilometers' });
            const bufferedB = turf.buffer(turf.feature(geomB), 2, { units: 'kilometers' });
            
            if (bufferedA && bufferedB && turf.booleanIntersects(bufferedA, bufferedB)) {
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
    }
  }
  
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
 */
export function detectSameCountryAdjacency(
  mergedGeoJSON: FeatureCollection,
  existingAdjacency: Adjacency
): { adjacency: Adjacency; addedCount: number } {
  const adjacency: Adjacency = {};
  
  // 既存の隣接関係をコピー
  for (const [key, value] of Object.entries(existingAdjacency)) {
    adjacency[key] = [...value];
  }
  
  let addedCount = 0;
  let checkedPairs = 0;
  
  // 国ごとにフィーチャーをグループ化
  const featuresByCountry: Map<string, Feature[]> = new Map();
  for (const feature of mergedGeoJSON.features) {
    const country = feature.properties?.countryIso3 as string;
    if (!featuresByCountry.has(country)) {
      featuresByCountry.set(country, []);
    }
    featuresByCountry.get(country)!.push(feature);
  }
  
  // バウンディングボックスを事前計算
  const bboxCache: Map<string, [number, number, number, number]> = new Map();
  for (const feature of mergedGeoJSON.features) {
    const regionId = feature.properties?.regionId as string;
    if (regionId) {
      bboxCache.set(regionId, computeBBox(feature));
    }
  }
  
  // 各国内でペアをチェック
  for (const [, features] of featuresByCountry) {
    // 2つ以上のリージョンがある国のみ
    if (features.length < 2) continue;
    
    for (let i = 0; i < features.length; i++) {
      const featureA = features[i];
      const idA = featureA.properties?.regionId as string;
      if (!idA) continue;
      
      for (let j = i + 1; j < features.length; j++) {
        const featureB = features[j];
        const idB = featureB.properties?.regionId as string;
        if (!idB) continue;
        
        // 既に隣接している場合はスキップ
        if (adjacency[idA]?.includes(idB)) continue;
        
        // バウンディングボックスの交差チェック（厳密、マージンなし）
        const bboxA = bboxCache.get(idA)!;
        const bboxB = bboxCache.get(idB)!;
        if (!bboxIntersects(bboxA, bboxB, 0)) continue;
        
        checkedPairs++;
        
        // 直接交差判定
        try {
          const geomA = featureA.geometry as Polygon | MultiPolygon;
          const geomB = featureB.geometry as Polygon | MultiPolygon;
          
          // 直接交差をチェック
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
  }
  
  console.log(`  Checked ${checkedPairs} same-country pairs`);
  
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
 */
export function detectIsolatedRegionAdjacency(
  mergedGeoJSON: FeatureCollection,
  existingAdjacency: Adjacency
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
  
  // 各孤立リージョンについて、包含している/隣接しているリージョンを探す
  for (const isolatedFeature of isolatedRegions) {
    const isolatedId = isolatedFeature.properties?.regionId as string;
    const isolatedCountry = isolatedFeature.properties?.countryIso3 as string;
    const isolatedBbox = computeBBox(isolatedFeature);
    
    // 同じ国の他のリージョンをチェック
    for (const candidateFeature of mergedGeoJSON.features) {
      const candidateId = candidateFeature.properties?.regionId as string;
      const candidateCountry = candidateFeature.properties?.countryIso3 as string;
      
      if (!candidateId || candidateId === isolatedId) continue;
      
      // 同じ国を優先（飛び地は通常同じ国内）
      if (candidateCountry !== isolatedCountry) continue;
      
      // バウンディングボックスチェック
      const candidateBbox = computeBBox(candidateFeature);
      if (!bboxIntersects(isolatedBbox, candidateBbox, 0.1)) continue;
      
      try {
        const isolatedGeom = isolatedFeature.geometry as Polygon | MultiPolygon;
        const candidateGeom = candidateFeature.geometry as Polygon | MultiPolygon;
        
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

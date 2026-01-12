/**
 * TopoJSON utilities for arc extraction and adjacency detection
 */

import type { Topology, GeometryCollection, GeometryObject } from 'topojson-specification';
import type { FeatureCollection, GeoJsonProperties } from 'geojson';
import type { Adjacency } from './types.js';
import { computeBBox, bboxIntersects } from './geometry-utils.js';

/**
 * TopoJSONのジオメトリからarc番号を再帰的に取得
 */
export function getArcsFromGeometry(geometry: GeometryObject): number[] {
  const arcs: number[] = [];
  
  if ('arcs' in geometry && geometry.arcs) {
    flattenArcs(geometry.arcs, arcs);
  }
  
  return arcs;
}

/**
 * ネストされたarcs配列をフラット化
 */
function flattenArcs(arcsArray: unknown, result: number[]): void {
  if (Array.isArray(arcsArray)) {
    for (const item of arcsArray) {
      if (typeof item === 'number') {
        result.push(item);
      } else {
        flattenArcs(item, result);
      }
    }
  }
}

/**
 * TopoJSONからarcs共有情報を解析して隣接関係を抽出する
 * 
 * バウンディングボックスのチェックを併用して誤判定を防ぐ
 */
export function extractAdjacency(topology: Topology, mergedGeoJSON: FeatureCollection): Adjacency {
  const adjacency: Adjacency = {};
  const geometries = (topology.objects.regions as GeometryCollection).geometries;
  
  // リージョンIDからバウンディングボックスへのマップを構築
  const regionBBoxes: Map<string, [number, number, number, number]> = new Map();
  for (const feature of mergedGeoJSON.features) {
    const regionId = feature.properties?.regionId as string;
    if (regionId) {
      regionBBoxes.set(regionId, computeBBox(feature));
    }
  }
  
  // arc番号 -> それを使用しているリージョンIDのマップ
  const arcToRegions: Map<number, Set<string>> = new Map();
  
  // 各ジオメトリのarcsを収集
  for (const geometry of geometries) {
    const regionId = (geometry.properties as GeoJsonProperties)?.regionId as string;
    if (!regionId) continue;
    
    // 初期化
    if (!adjacency[regionId]) {
      adjacency[regionId] = [];
    }
    
    // このジオメトリが使用しているarcsを取得
    const arcs = getArcsFromGeometry(geometry);
    
    for (const arcIndex of arcs) {
      // arcは正負の値を取る（負は逆向き）ので絶対値を使用
      const normalizedArc = Math.abs(arcIndex);
      
      if (!arcToRegions.has(normalizedArc)) {
        arcToRegions.set(normalizedArc, new Set());
      }
      arcToRegions.get(normalizedArc)!.add(regionId);
    }
  }
  
  // リージョンペアごとに共有するarcの総点数を集計
  const pairSharedPoints: Map<string, number> = new Map();
  
  for (const [arcIndex, regions] of arcToRegions) {
    const regionArray = Array.from(regions);
    
    // 2つ以上のリージョンがこのarcを共有している場合
    if (regionArray.length >= 2) {
      // このarcの点数を取得
      const arcPoints = topology.arcs[arcIndex]?.length || 0;
      
      for (let i = 0; i < regionArray.length; i++) {
        for (let j = i + 1; j < regionArray.length; j++) {
          const region1 = regionArray[i];
          const region2 = regionArray[j];
          const pairKey = [region1, region2].sort().join('|');
          
          const currentPoints = pairSharedPoints.get(pairKey) || 0;
          pairSharedPoints.set(pairKey, currentPoints + arcPoints);
        }
      }
    }
  }
  
  // 共有点数が閾値以上かつBBoxが交差するペアのみ隣接として記録
  const MIN_SHARED_POINTS = 3;
  let skippedByBBox = 0;
  
  for (const [pairKey, sharedPoints] of pairSharedPoints) {
    if (sharedPoints >= MIN_SHARED_POINTS) {
      const [region1, region2] = pairKey.split('|');
      
      // バウンディングボックスの交差チェック
      const bbox1 = regionBBoxes.get(region1);
      const bbox2 = regionBBoxes.get(region2);
      
      if (bbox1 && bbox2 && !bboxIntersects(bbox1, bbox2)) {
        // BBoxが交差しない場合はスキップ
        skippedByBBox++;
        continue;
      }
      
      // 双方向に隣接を記録
      if (!adjacency[region1]) adjacency[region1] = [];
      if (!adjacency[region2]) adjacency[region2] = [];
      
      if (!adjacency[region1].includes(region2)) {
        adjacency[region1].push(region2);
      }
      if (!adjacency[region2].includes(region1)) {
        adjacency[region2].push(region1);
      }
    }
  }
  
  console.log(`  Skipped by BBox check: ${skippedByBBox} pairs`);
  
  // ソート（読みやすさのため）
  for (const regionId of Object.keys(adjacency)) {
    adjacency[regionId].sort();
  }
  
  return adjacency;
}

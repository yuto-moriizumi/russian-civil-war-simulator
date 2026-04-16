/**
 * TopoJSON utilities for arc extraction and adjacency detection
 */

import type { Topology, GeometryCollection, GeometryObject } from 'topojson-specification';
import type { Adjacency, RegionFeatureCollection } from './types.js';
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
export function extractAdjacency(topology: Topology, mergedGeoJSON: RegionFeatureCollection): Adjacency {
  const adjacency: Adjacency = {};
  const geometries = (topology.objects.regions as GeometryCollection).geometries;

  // リージョンIDからバウンディングボックスへのマップを構築
  const regionBBoxes: Map<string, [number, number, number, number]> = new Map();
  for (const feature of mergedGeoJSON.features) {
    const regionId = feature.id as string;
    if (regionId) {
      regionBBoxes.set(regionId, computeBBox(feature));
    }
  }

  // arc番号 -> それを使用しているリージョンIDのマップ
  const arcToRegions: Map<number, Set<string>> = new Map();

  // 各ジオメトリのarcsを収集
  for (const geometry of geometries) {
    const regionId = (geometry as { id?: string }).id as string;
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

  console.log(`  Skipped by BBox check: ${skippedByBBox}`);

  // ソート（読みやすさのため）
  for (const regionId of Object.keys(adjacency)) {
    adjacency[regionId].sort();
  }

  return adjacency;
}

/**
 * 隣接リージョンペア間の国境中間点を計算する
 *
 * 共有arcの全座標点の重心を国境中間点とする
 * 出力キー形式：ソート済み "A|B" → [longitude, latitude]
 */
export function computeBorderMidpoints(
  topology: Topology,
  mergedGeoJSON: RegionFeatureCollection,
  adjacency: Adjacency
): Record<string, [number, number]> {
  const geometries = (topology.objects.regions as GeometryCollection).geometries;
  const midpoints: Record<string, [number, number]> = {};

  // arc番号 -> それを使用しているリージョンIDのマップ
  const arcToRegions: Map<number, Set<string>> = new Map();

  for (const geometry of geometries) {
    const regionId = (geometry as { id?: string }).id as string;
    if (!regionId) continue;

    const arcs = getArcsFromGeometry(geometry);

    for (const arcIndex of arcs) {
      const normalizedArc = Math.abs(arcIndex);
      if (!arcToRegions.has(normalizedArc)) {
        arcToRegions.set(normalizedArc, new Set());
      }
      arcToRegions.get(normalizedArc)!.add(regionId);
    }
  }

  // リージョンペアごとに共有arcの座標点を収集
  const pairCoordinates: Map<string, [number, number][]> = new Map();

  for (const [arcIndex, regions] of arcToRegions) {
    const regionArray = Array.from(regions);
    if (regionArray.length < 2) continue;

    // このarcの座標点を取得（デコード）
    const arcCoords = decodeArc(topology, arcIndex);

    for (let i = 0; i < regionArray.length; i++) {
      for (let j = i + 1; j < regionArray.length; j++) {
        const region1 = regionArray[i];
        const region2 = regionArray[j];
        const pairKey = [region1, region2].sort().join('|');

        // このペアがadjacencyに含まれているか確認
        if (!adjacency[region1]?.includes(region2) && !adjacency[region2]?.includes(region1)) {
          continue;
        }

        if (!pairCoordinates.has(pairKey)) {
          pairCoordinates.set(pairKey, []);
        }
        pairCoordinates.get(pairKey)!.push(...arcCoords);
      }
    }
  }

  // 各ペアの座標点の重心を計算
  for (const [pairKey, coords] of pairCoordinates) {
    if (coords.length === 0) continue;

    const sumLng = coords.reduce((sum, c) => sum + c[0], 0);
    const sumLat = coords.reduce((sum, c) => sum + c[1], 0);

    midpoints[pairKey] = [sumLng / coords.length, sumLat / coords.length];
  }

  // adjacencyにあるがarc共有から計算できなかったペアについて、
  // 重心の中間点をフォールバックとして計算
  const regionCentroids: Record<string, [number, number]> = {};
  for (const feature of mergedGeoJSON.features) {
    const regionId = feature.id as string;
    if (!regionId) continue;
    const coords = computeFeatureCentroid(feature);
    if (coords) {
      regionCentroids[regionId] = coords;
    }
  }

  for (const [regionId, neighbors] of Object.entries(adjacency)) {
    for (const neighborId of neighbors) {
      const pairKey = [regionId, neighborId].sort().join('|');
      if (midpoints[pairKey]) continue; // Already computed from arcs

      const c1 = regionCentroids[regionId];
      const c2 = regionCentroids[neighborId];
      if (c1 && c2) {
        midpoints[pairKey] = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];
      }
    }
  }

  console.log(`  Computed ${Object.keys(midpoints).length} border midpoints`);

  return midpoints;
}

/**
 * TopoJSONのarc座標をデコードする
 * TopoJSONのarcはdelta encodingされているため、絶対座標に変換する
 */
function decodeArc(topology: Topology, arcIndex: number): [number, number][] {
  const arc = topology.arcs[arcIndex];
  if (!arc || arc.length === 0) return [];

  const coords: [number, number][] = [];
  let x = 0;
  let y = 0;

  for (const point of arc) {
    x += point[0];
    y += point[1];
    // TopoJSON座標を経度緯度に変換（transformがある場合）
    if (topology.transform) {
      coords.push([
        x * topology.transform.scale[0] + topology.transform.translate[0],
        y * topology.transform.scale[1] + topology.transform.translate[1],
      ]);
    } else {
      coords.push([x, y]);
    }
  }

  return coords;
}

/**
 * GeoJSONフィーチャーの重心を計算する
 */
function computeFeatureCentroid(feature: { geometry: { type: string; coordinates: any } }): [number, number] | null {
  let coords: number[][] = [];

  if (feature.geometry.type === 'Polygon') {
    coords = feature.geometry.coordinates[0] || [];
  } else if (feature.geometry.type === 'MultiPolygon') {
    // 最大のポリゴンの座標を使用
    let maxLen = 0;
    for (const polygon of feature.geometry.coordinates) {
      if (polygon[0] && polygon[0].length > maxLen) {
        maxLen = polygon[0].length;
        coords = polygon[0];
      }
    }
  }

  if (coords.length === 0) return null;

  const sumLng = coords.reduce((sum, c) => sum + c[0], 0);
  const sumLat = coords.reduce((sum, c) => sum + c[1], 0);

  return [sumLng / coords.length, sumLat / coords.length];
}

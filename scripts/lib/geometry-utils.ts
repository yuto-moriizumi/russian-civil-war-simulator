/**
 * Geometry utilities for coordinate operations and bounding box calculations
 */

import type { Geometry, Position, Feature } from 'geojson';

/**
 * 座標を量子化（丸め）する
 * 
 * 異なるGeoJSONソース間で微妙にズレている頂点を揃えるため、
 * 座標を一定の精度に丸める。これによりTopoJSONのarc共有が正しく機能する。
 * 
 * precision=3 → 小数点以下3桁 → 約111メートルの精度
 * precision=4 → 小数点以下4桁 → 約11メートルの精度
 * precision=5 → 小数点以下5桁 → 約1.1メートルの精度
 */
export const COORDINATE_PRECISION = 3;

export function quantizeCoordinate(value: number): number {
  const multiplier = Math.pow(10, COORDINATE_PRECISION);
  return Math.round(value * multiplier) / multiplier;
}

function quantizePosition(pos: Position): Position {
  return [quantizeCoordinate(pos[0]), quantizeCoordinate(pos[1]), ...(pos.length > 2 ? [pos[2]] : [])];
}

function quantizeCoords(coords: unknown): unknown {
  if (Array.isArray(coords)) {
    if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      return quantizePosition(coords as Position);
    }
    return coords.map(c => quantizeCoords(c));
  }
  return coords;
}

export function quantizeGeometry(geometry: Geometry): Geometry {
  if (!geometry) return geometry;
  
  if ('coordinates' in geometry) {
    return {
      ...geometry,
      coordinates: quantizeCoords(geometry.coordinates),
    } as Geometry;
  }
  
  return geometry;
}

/**
 * ジオメトリから全座標を抽出
 */
export function extractCoordinates(geometry: Geometry): Position[] {
  const coords: Position[] = [];
  
  function recurse(obj: unknown): void {
    if (Array.isArray(obj)) {
      if (obj.length >= 2 && typeof obj[0] === 'number' && typeof obj[1] === 'number') {
        coords.push(obj as Position);
      } else {
        for (const item of obj) {
          recurse(item);
        }
      }
    }
  }
  
  if ('coordinates' in geometry) {
    recurse(geometry.coordinates);
  }
  
  return coords;
}

/**
 * 2つのバウンディングボックスが交差するかチェック
 */
export function bboxIntersects(
  bbox1: [number, number, number, number],
  bbox2: [number, number, number, number],
  margin: number = 0.5 // 経度/緯度のマージン
): boolean {
  return !(
    bbox1[2] + margin < bbox2[0] - margin || // bbox1が左
    bbox1[0] - margin > bbox2[2] + margin || // bbox1が右
    bbox1[3] + margin < bbox2[1] - margin || // bbox1が下
    bbox1[1] - margin > bbox2[3] + margin    // bbox1が上
  );
}

/**
 * フィーチャーのバウンディングボックスを計算
 */
export function computeBBox(feature: Feature): [number, number, number, number] {
  const coords = extractCoordinates(feature.geometry);
  
  if (coords.length === 0) {
    return [0, 0, 0, 0];
  }
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const [x, y] of coords) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  
  return [minX, minY, maxX, maxY];
}

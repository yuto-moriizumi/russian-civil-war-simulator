/**
 * Map Processing Script
 * 
 * ダウンロードしたGeoJSONを結合し、TopoJSONに変換して隣接関係を抽出する
 * 
 * Usage: npx tsx scripts/process-map.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as topojson from 'topojson-server';
import * as topojsonClient from 'topojson-client';
import * as turf from '@turf/turf';
import type { FeatureCollection, Feature, GeoJsonProperties, Geometry, Position, Polygon, MultiPolygon } from 'geojson';
import type { Topology, GeometryCollection, GeometryObject } from 'topojson-specification';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CountryConfig {
  iso3: string;
  name: string;
  admLevel: string;
}

interface MapConfig {
  countries: CountryConfig[];
  output: {
    geojson: string;
    adjacency: string;
  };
  api: {
    baseUrl: string;
  };
}

interface Adjacency {
  [regionId: string]: string[];
}

function loadConfig(): MapConfig {
  const configPath = path.join(__dirname, 'map-config.json');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(configContent);
}

function loadGeoJSON(filePath: string): FeatureCollection {
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
function getRegionId(feature: Feature, countryIso3: string): string {
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
 * 座標を量子化（丸め）する
 * 
 * 異なるGeoJSONソース間で微妙にズレている頂点を揃えるため、
 * 座標を一定の精度に丸める。これによりTopoJSONのarc共有が正しく機能する。
 * 
 * precision=3 → 小数点以下3桁 → 約111メートルの精度
 * precision=4 → 小数点以下4桁 → 約11メートルの精度
 * precision=5 → 小数点以下5桁 → 約1.1メートルの精度
 */
const COORDINATE_PRECISION = 3;

function quantizeCoordinate(value: number): number {
  const multiplier = Math.pow(10, COORDINATE_PRECISION);
  return Math.round(value * multiplier) / multiplier;
}

function quantizeGeometry(geometry: Geometry): Geometry {
  if (!geometry) return geometry;
  
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
  
  if ('coordinates' in geometry) {
    return {
      ...geometry,
      coordinates: quantizeCoords(geometry.coordinates),
    } as Geometry;
  }
  
  return geometry;
}

/**
 * 複数のGeoJSONを1つに結合する
 */
function mergeGeoJSON(
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

/**
 * TopoJSONからarcs共有情報を解析して隣接関係を抽出する
 * 
 * バウンディングボックスのチェックを併用して誤判定を防ぐ
 */
function extractAdjacency(topology: Topology, mergedGeoJSON: FeatureCollection): Adjacency {
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

/**
 * TopoJSONのジオメトリからarc番号を再帰的に取得
 */
function getArcsFromGeometry(geometry: GeometryObject): number[] {
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
 * ジオメトリから全座標を抽出
 */
function extractCoordinates(geometry: Geometry): Position[] {
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
function bboxIntersects(
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
function computeBBox(feature: Feature): [number, number, number, number] {
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

/**
 * 異なる国の間の隣接関係を検出する（境界データの不整合を補完）
 * 
 * GeoJSONデータソースが異なる国では境界が完全に一致しないため、
 * TopoJSONのarc共有では検出できない。バッファ付きの交差判定で検出する。
 */
function detectCrossBorderAdjacency(
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
function detectSameCountryAdjacency(
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
function detectIsolatedRegionAdjacency(
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

async function main() {
  console.log('=== Map Processing Script ===\n');
  
  const config = loadConfig();
  const tempDir = path.join(__dirname, 'temp');
  
  // Step 1: 各国のGeoJSONを結合
  console.log('Step 1: Merging GeoJSON files...');
  
  const geojsonFiles = config.countries.map(country => ({
    filePath: path.join(tempDir, `${country.iso3}.geojson`),
    countryIso3: country.iso3,
  }));
  
  // ファイル存在チェック
  for (const { filePath } of geojsonFiles) {
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      console.error(`Please run 'npx tsx scripts/download-geojson.ts' first.`);
      process.exit(1);
    }
  }
  
  const mergedGeoJSON = mergeGeoJSON(geojsonFiles);
  console.log(`  Total features: ${mergedGeoJSON.features.length}\n`);
  
  // Step 2: TopoJSONに変換
  console.log('Step 2: Converting to TopoJSON...');
  
  const topology = topojson.topology({
    regions: mergedGeoJSON,
  }) as Topology;
  
  console.log(`  Arcs count: ${topology.arcs.length}\n`);
  
  // Step 3: 隣接関係を抽出
  console.log('Step 3: Extracting adjacency (arc-sharing method)...');
  
  const arcAdjacency = extractAdjacency(topology, mergedGeoJSON);
  const arcPairs = Object.values(arcAdjacency).reduce((sum, arr) => sum + arr.length, 0) / 2;
  
  console.log(`  Regions: ${Object.keys(arcAdjacency).length}`);
  console.log(`  Adjacent pairs (arc-sharing): ${arcPairs}\n`);
  
  // Step 3b: 異なる国間の隣接関係を補完
  console.log('Step 3b: Detecting cross-border adjacency...');
  
  const { adjacency: crossBorderAdjacency, addedCount: crossBorderAdded } = 
    detectCrossBorderAdjacency(mergedGeoJSON, arcAdjacency);
  
  console.log(`  Added cross-border pairs: ${crossBorderAdded}\n`);
  
  // Step 3c: 同じ国内の隣接関係を補完
  console.log('Step 3c: Detecting same-country adjacency (missed by arc-sharing)...');
  
  const { adjacency: sameCountryAdjacency, addedCount: sameCountryAdded } = 
    detectSameCountryAdjacency(mergedGeoJSON, crossBorderAdjacency);
  
  console.log(`  Added same-country pairs: ${sameCountryAdded}\n`);
  
  // Step 3d: 孤立したリージョンの隣接関係を検出
  console.log('Step 3d: Detecting isolated region adjacency...');
  
  const { adjacency: finalAdjacency, addedCount: isolatedAdded } = 
    detectIsolatedRegionAdjacency(mergedGeoJSON, sameCountryAdjacency);
  
  console.log(`  Added isolated region connections: ${isolatedAdded}`);
  
  const totalPairs = Object.values(finalAdjacency).reduce((sum, arr) => sum + arr.length, 0) / 2;
  console.log(`  Total adjacent pairs: ${totalPairs}\n`);
  
  // Step 4: GeoJSONを出力（TopoJSONから逆変換してプロパティを保持）
  console.log('Step 4: Saving output files...');
  
  const outputGeoJSON = topojsonClient.feature(
    topology,
    topology.objects.regions as GeometryCollection
  ) as FeatureCollection;
  
  const geojsonOutputPath = path.resolve(__dirname, config.output.geojson);
  const adjacencyOutputPath = path.resolve(__dirname, config.output.adjacency);
  
  // 出力ディレクトリを確認
  const outputDir = path.dirname(geojsonOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(geojsonOutputPath, JSON.stringify(outputGeoJSON));
  console.log(`  GeoJSON: ${geojsonOutputPath}`);
  
  fs.writeFileSync(adjacencyOutputPath, JSON.stringify(finalAdjacency, null, 2));
  console.log(`  Adjacency: ${adjacencyOutputPath}`);
  
  console.log('\n=== Processing Complete ===');
  
  // 隣接関係のサンプル表示
  console.log('\nAdjacency sample (first 5 regions):');
  const sampleRegions = Object.keys(finalAdjacency).slice(0, 5);
  for (const regionId of sampleRegions) {
    console.log(`  ${regionId}: ${finalAdjacency[regionId].length} neighbors`);
  }
}

main().catch(console.error);

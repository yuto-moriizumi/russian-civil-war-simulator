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
import type { FeatureCollection, Feature, GeoJsonProperties, Geometry, Position } from 'geojson';
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
      
      const enhancedFeature: Feature = {
        ...feature,
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
  console.log('Step 3: Extracting adjacency...');
  
  const adjacency = extractAdjacency(topology, mergedGeoJSON);
  const adjacentPairs = Object.values(adjacency).reduce((sum, arr) => sum + arr.length, 0) / 2;
  
  console.log(`  Regions: ${Object.keys(adjacency).length}`);
  console.log(`  Adjacent pairs: ${adjacentPairs}\n`);
  
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
  
  fs.writeFileSync(adjacencyOutputPath, JSON.stringify(adjacency, null, 2));
  console.log(`  Adjacency: ${adjacencyOutputPath}`);
  
  console.log('\n=== Processing Complete ===');
  
  // 隣接関係のサンプル表示
  console.log('\nAdjacency sample (first 5 regions):');
  const sampleRegions = Object.keys(adjacency).slice(0, 5);
  for (const regionId of sampleRegions) {
    console.log(`  ${regionId}: ${adjacency[regionId].length} neighbors`);
  }
}

main().catch(console.error);

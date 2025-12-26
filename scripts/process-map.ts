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
import type { FeatureCollection, Feature, GeoJsonProperties } from 'geojson';
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
 */
function extractAdjacency(topology: Topology): Adjacency {
  const adjacency: Adjacency = {};
  const geometries = (topology.objects.regions as GeometryCollection).geometries;
  
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
  
  // 同じarcを共有しているリージョン同士を隣接として記録
  for (const [, regions] of arcToRegions) {
    const regionArray = Array.from(regions);
    
    // 2つ以上のリージョンがこのarcを共有している場合
    if (regionArray.length >= 2) {
      for (let i = 0; i < regionArray.length; i++) {
        for (let j = i + 1; j < regionArray.length; j++) {
          const region1 = regionArray[i];
          const region2 = regionArray[j];
          
          // 双方向に隣接を記録
          if (!adjacency[region1].includes(region2)) {
            adjacency[region1].push(region2);
          }
          if (!adjacency[region2].includes(region1)) {
            adjacency[region2].push(region1);
          }
        }
      }
    }
  }
  
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
  
  const adjacency = extractAdjacency(topology);
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

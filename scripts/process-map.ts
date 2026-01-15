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
import type { FeatureCollection } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';

import { loadConfig, mergeGeoJSON } from './lib/geojson-utils.js';
import { extractAdjacency } from './lib/topojson-utils.js';
import { 
  detectCrossBorderAdjacency, 
  detectSameCountryAdjacency, 
  detectIsolatedRegionAdjacency,
  applyCustomAdjacency 
} from './lib/adjacency-detector.js';
import { buildSpatialIndex } from './lib/spatial-index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('=== Map Processing Script ===\n');
  
  const config = loadConfig(__dirname);
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
  
  // Build spatial index once for all detection functions
  console.log('Building spatial index for optimized adjacency detection...');
  const spatialIndex = buildSpatialIndex(mergedGeoJSON.features);
  console.log(`  Indexed ${mergedGeoJSON.features.length} features\n`);
  
  // Step 3b: 異なる国間の隣接関係を補完
  console.log('Step 3b: Detecting cross-border adjacency...');
  
  const { adjacency: crossBorderAdjacency, addedCount: crossBorderAdded } = 
    detectCrossBorderAdjacency(mergedGeoJSON, arcAdjacency, spatialIndex);
  
  console.log(`  Added cross-border pairs: ${crossBorderAdded}\n`);
  
  // Step 3c: 同じ国内の隣接関係を補完
  console.log('Step 3c: Detecting same-country adjacency (missed by arc-sharing)...');
  
  const { adjacency: sameCountryAdjacency, addedCount: sameCountryAdded } = 
    detectSameCountryAdjacency(mergedGeoJSON, crossBorderAdjacency, spatialIndex);
  
  console.log(`  Added same-country pairs: ${sameCountryAdded}\n`);
  
  // Step 3d: 孤立したリージョンの隣接関係を検出
  console.log('Step 3d: Detecting isolated region adjacency...');
  
  const { adjacency: finalAdjacency, addedCount: isolatedAdded } = 
    detectIsolatedRegionAdjacency(mergedGeoJSON, sameCountryAdjacency, spatialIndex);
  
  console.log(`  Added isolated region connections: ${isolatedAdded}`);
  
  let totalPairs = Object.values(finalAdjacency).reduce((sum, arr) => sum + arr.length, 0) / 2;
  console.log(`  Total adjacent pairs: ${totalPairs}\n`);
  
  // Step 3e: カスタム隣接関係を適用
  console.log('Step 3e: Applying custom adjacency...');
  
  const { adjacency: customAdjacencyResult, addedCount: customAdded } = 
    applyCustomAdjacency(finalAdjacency, config.customAdjacency);
  
  console.log(`  Added custom adjacency pairs: ${customAdded}`);
  
  totalPairs = Object.values(customAdjacencyResult).reduce((sum, arr) => sum + arr.length, 0) / 2;
  console.log(`  Total adjacent pairs: ${totalPairs}\n`);
  
  // Step 4: GeoJSONを出力（TopoJSONから逆変換してプロパティを保持）
  console.log('Step 4: Saving output files...');
  
  const outputGeoJSON = topojsonClient.feature(
    topology,
    topology.objects.regions as unknown as GeometryCollection
  ) as unknown as FeatureCollection;
  
  const geojsonOutputPath = path.resolve(__dirname, config.output.geojson);
  const adjacencyOutputPath = path.resolve(__dirname, config.output.adjacency);
  
  // 出力ディレクトリを確認
  const outputDir = path.dirname(geojsonOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(geojsonOutputPath, JSON.stringify(outputGeoJSON));
  console.log(`  GeoJSON: ${geojsonOutputPath}`);
  
  fs.writeFileSync(adjacencyOutputPath, JSON.stringify(customAdjacencyResult, null, 2));
  console.log(`  Adjacency: ${adjacencyOutputPath}`);
  
  console.log('\n=== Processing Complete ===');
  
  // 隣接関係のサンプル表示
  console.log('\nAdjacency sample (first 5 regions):');
  const sampleRegions = Object.keys(customAdjacencyResult).slice(0, 5);
  for (const regionId of sampleRegions) {
    console.log(`  ${regionId}: ${customAdjacencyResult[regionId].length} neighbors`);
  }
}

main().catch(console.error);

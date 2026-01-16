/**
 * GeoJSON Building Script
 * 
 * ダウンロードしたGeoJSONを結合し、TopoJSONに変換して出力する
 * 
 * Usage: npx tsx scripts/build-geojson.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as topojson from 'topojson-server';
import * as topojsonClient from 'topojson-client';
import type { FeatureCollection } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';

import { loadConfig, mergeGeoJSON } from './lib/geojson-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('=== GeoJSON Building Script ===\n');
  
  const config = loadConfig(__dirname);
  const tempDir = path.join(__dirname, 'temp');
  
  // Step 1: 各国のGeoJSONを結合
  console.log('Step 1: Merging GeoJSON files...');
  
  const geojsonFiles = config.countries.map(country => ({
    filePath: path.join(tempDir, `${country.iso3}_${country.admLevel}.geojson`),
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
  
  // Step 3: GeoJSONを出力（TopoJSONから逆変換してプロパティを保持）
  console.log('Step 3: Saving output file...');
  
  const outputGeoJSON = topojsonClient.feature(
    topology,
    topology.objects.regions as unknown as GeometryCollection
  ) as unknown as FeatureCollection;
  
  const geojsonOutputPath = path.resolve(__dirname, config.output.geojson);
  
  // 出力ディレクトリを確認
  const outputDir = path.dirname(geojsonOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(geojsonOutputPath, JSON.stringify(outputGeoJSON));
  console.log(`  GeoJSON: ${geojsonOutputPath}`);
  
  console.log('\n=== GeoJSON Building Complete ===');
}

main().catch(console.error);

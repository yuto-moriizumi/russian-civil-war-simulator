/**
 * GeoJSON Download Script
 * 
 * geoBoundaries APIから指定された国のGeoJSONをダウンロードする
 * 
 * Usage: npx tsx scripts/download-geojson.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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

interface GeoBoundariesApiResponse {
  boundaryID: string;
  boundaryName: string;
  boundaryISO: string;
  boundaryYearRepresented: string;
  boundaryType: string;
  boundaryCanonical: string;
  gjDownloadURL: string;
  simplifiedGeometryGeoJSON: string;
  tjDownloadURL: string;
  admUnitCount: number;
}

async function loadConfig(): Promise<MapConfig> {
  const configPath = path.join(__dirname, 'map-config.json');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(configContent);
}

async function fetchApiMetadata(
  baseUrl: string,
  iso3: string,
  admLevel: string
): Promise<GeoBoundariesApiResponse> {
  const url = `${baseUrl}/${iso3}/${admLevel}/`;
  console.log(`  Fetching API metadata: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

async function downloadGeoJSON(url: string): Promise<object> {
  console.log(`  Downloading GeoJSON: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

async function main() {
  console.log('=== GeoJSON Download Script ===\n');
  
  const config = await loadConfig();
  const tempDir = path.join(__dirname, 'temp');
  
  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  console.log(`Downloading ${config.countries.length} countries...\n`);
  
  for (const country of config.countries) {
    console.log(`[${country.iso3}] ${country.name} (${country.admLevel})`);
    
    try {
      // Fetch API metadata to get download URL
      const metadata = await fetchApiMetadata(
        config.api.baseUrl,
        country.iso3,
        country.admLevel
      );
      
      console.log(`  Found ${metadata.admUnitCount} regions`);
      
      // Save to temp directory with admin level in filename
      const outputPath = path.join(tempDir, `${country.iso3}_${country.admLevel}.geojson`);
      
      // Check if file already exists
      if (fs.existsSync(outputPath)) {
        console.log(`  Already exists, skipping: ${outputPath}\n`);
        continue;
      }
      
      // Download simplified GeoJSON (smaller file size)
      const geojsonUrl = metadata.simplifiedGeometryGeoJSON || metadata.gjDownloadURL;
      const geojson = await downloadGeoJSON(geojsonUrl);
      
      fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
      
      console.log(`  Saved to: ${outputPath}\n`);
    } catch (error) {
      console.error(`  Error: ${error}\n`);
      process.exit(1);
    }
  }
  
  console.log('=== Download Complete ===');
  console.log(`\nNext step: Run 'npx tsx scripts/process-map.ts' to merge and extract adjacency`);
}

main().catch(console.error);

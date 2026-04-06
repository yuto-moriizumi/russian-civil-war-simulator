import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { ownership } = body;

    if (!ownership || typeof ownership !== 'object') {
      return NextResponse.json(
        { error: 'Ownership data is required' },
        { status: 400 }
      );
    }

    // Load GeoJSON to get countryIso3 for categorization
    const geojsonPath = path.join(process.cwd(), 'public', 'map', 'regions.geojson');
    const geojsonData = JSON.parse(await readFile(geojsonPath, 'utf-8'));
    
    // Create mapping from feature.id to country info for categorization
    const featureIdToCountry: Record<string, { countryIso3: string }> = {};
    geojsonData.features.forEach((feature: { 
      id?: string | number;
      properties?: { 
        countryIso3?: string;
      } 
    }) => {
      const featureId = feature.id != null ? String(feature.id) : undefined;
      const countryIso3 = feature.properties?.countryIso3 || '';
      if (featureId) {
        featureIdToCountry[featureId] = { countryIso3 };
      }
    });

    // Group regions by country ISO3 code prefix for better organization
    const regionsByFile: Record<string, Record<string, string>> = {
      russia: {},
      easternEurope: {},
      centralEurope: {},
      balkans: {},
      asia: {},
      middleEast: {},
      other: {},
    };

    for (const [regionId, countryId] of Object.entries(ownership)) {
      if (typeof countryId !== 'string') continue;
      
      // Get country info for categorization
      const countryInfo = featureIdToCountry[regionId];
      if (!countryInfo) {
        // If region doesn't exist in GeoJSON, put in 'other'
        regionsByFile.other[regionId] = countryId;
        continue;
      }
      
      // Use the feature id prefix for region categorization (e.g. RU-ALT → prefix RU)
      // and countryIso3 for country-level matching
      const isoCode = regionId;
      const iso3 = countryInfo.countryIso3;
      if (!iso3 && !isoCode) {
        regionsByFile.other[regionId] = countryId;
        continue;
      }
      
      // Extract prefix (first 2 characters for regional codes like RU-ALT)
      // For 3-letter ISO3 codes (ARM, CHN), prefix will be empty
      const prefix = isoCode.length > 3 ? isoCode.substring(0, 2) : '';
      
      // Categorize by region prefix or country ISO3
      if (prefix === 'RU' || iso3 === 'RUS') {
        regionsByFile.russia[regionId] = countryId;
      } else if (['UA', 'BY', 'MD', 'EE', 'LV', 'LT', 'FI'].includes(prefix) ||
                 ['UKR', 'BLR', 'MDA', 'EST', 'LVA', 'LTU', 'FIN'].includes(iso3)) {
        regionsByFile.easternEurope[regionId] = countryId;
      } else if (['PL', 'DE', 'CZ', 'SK', 'HU', 'AT', 'RO'].includes(prefix) ||
                 ['POL', 'DEU', 'CZE', 'SVK', 'HUN', 'AUT', 'ROU'].includes(iso3)) {
        regionsByFile.centralEurope[regionId] = countryId;
      } else if (['HR', 'RS', 'SI', 'BA', 'MK', 'AL', 'BG', 'GR', 'ME', 'XK'].includes(prefix) ||
                 ['HRV', 'SRB', 'SVN', 'BIH', 'MKD', 'ALB', 'BGR', 'GRC', 'MNE', 'XKX'].includes(iso3)) {
        regionsByFile.balkans[regionId] = countryId;
      } else if (['KZ', 'UZ', 'TM', 'KG', 'TJ', 'MN', 'CN', 'JP', 'KR', 'KP'].includes(prefix) ||
                 ['KAZ', 'UZB', 'TKM', 'KGZ', 'TJK', 'MNG', 'CHN', 'JPN', 'KOR', 'PRK'].includes(iso3)) {
        regionsByFile.asia[regionId] = countryId;
      } else if (['TR', 'IR', 'IQ', 'SY', 'SA', 'AZ', 'AM', 'GE', 'YE', 'OM', 'AE', 'KW', 'QA', 'BH', 'JO', 'LB', 'IL', 'PS'].includes(prefix) ||
                 ['TUR', 'IRN', 'IRQ', 'SYR', 'SAU', 'AZE', 'ARM', 'GEO', 'YEM', 'OMN', 'ARE', 'KWT', 'QAT', 'BHR', 'JOR', 'LBN', 'ISR', 'PSE'].includes(iso3)) {
        regionsByFile.middleEast[regionId] = countryId;
      } else {
        regionsByFile.other[regionId] = countryId;
      }
    }

    const filesWritten: string[] = [];
    const ownershipDir = path.join(process.cwd(), 'app', 'data', 'map', 'ownership');

    // Ensure directory exists
    if (!existsSync(ownershipDir)) {
      await mkdir(ownershipDir, { recursive: true });
    }

    // Write each file
    for (const [fileName, regions] of Object.entries(regionsByFile)) {
      if (Object.keys(regions).length === 0) continue;

      const filePath = path.join(ownershipDir, `${fileName}.ts`);
      const content = generateTypeScriptFile(fileName, regions);
      
      await writeFile(filePath, content, 'utf-8');
      filesWritten.push(filePath);
    }

    return NextResponse.json({
      success: true,
      message: `Wrote ${filesWritten.length} TypeScript files`,
      filesWritten,
    });
  } catch (error) {
    console.error('Error saving ownership:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateTypeScriptFile(fileName: string, regions: Record<string, string>): string {
  const capitalizedName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
  
  let content = `import { CountryId } from '../../../types/game';\n\n`;
  content += `/**\n * Region ownership for ${capitalizedName}\n * Generated by Map Tool\n */\n`;
  content += `export const ${fileName}Ownership: Record<string, CountryId> = {\n`;

  // Sort by region ID for consistency
  const sortedEntries = Object.entries(regions).sort(([a], [b]) => a.localeCompare(b));
  
  for (const [regionId, countryId] of sortedEntries) {
    content += `  '${regionId}': '${countryId}',\n`;
  }

  content += `};\n`;

  return content;
}

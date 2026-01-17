import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';
import { CountryId } from '../../../types/game';

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
    const { coreRegions } = body as { coreRegions: Record<CountryId, string[]> };

    if (!coreRegions || typeof coreRegions !== 'object') {
      return NextResponse.json(
        { error: 'Core regions data is required' },
        { status: 400 }
      );
    }

    // Read the existing countryMetadata.ts file
    const countryMetadataPath = path.join(process.cwd(), 'app', 'data', 'countryMetadata.ts');
    let fileContent = await readFile(countryMetadataPath, 'utf-8');

    // Update each country's coreRegions property
    for (const [countryId, regions] of Object.entries(coreRegions)) {
      // Find the country block in the file
      const countryBlockRegex = new RegExp(
        `(${countryId}:\\s*{[^}]*?coreRegions:\\s*)(\\[[^\\]]*?\\])`,
        's'
      );

      const newCoreRegionsArray = formatCoreRegionsArray(regions);
      
      if (countryBlockRegex.test(fileContent)) {
        // Update existing coreRegions
        fileContent = fileContent.replace(countryBlockRegex, `$1${newCoreRegionsArray}`);
      } else {
        // If coreRegions doesn't exist, add it before the closing brace
        const countryEndRegex = new RegExp(
          `(${countryId}:\\s*{[^}]*?)(\\s*},)`,
          's'
        );
        
        if (countryEndRegex.test(fileContent)) {
          fileContent = fileContent.replace(
            countryEndRegex,
            `$1\n    coreRegions: ${newCoreRegionsArray},\n  },$2`
          );
        }
      }
    }

    // Write the updated content back to the file
    await writeFile(countryMetadataPath, fileContent, 'utf-8');

    return NextResponse.json({
      success: true,
      message: `Updated core regions in countryMetadata.ts`,
    });
  } catch (error) {
    console.error('Error saving core regions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function formatCoreRegionsArray(regions: string[]): string {
  if (regions.length === 0) {
    return '[]';
  }

  // Sort regions for consistency
  const sortedRegions = [...regions].sort();
  
  // Format with proper indentation
  let result = '[\n';
  
  // Group regions in lines of ~5 items for readability
  const itemsPerLine = 5;
  for (let i = 0; i < sortedRegions.length; i += itemsPerLine) {
    const group = sortedRegions.slice(i, i + itemsPerLine);
    result += '      ' + group.map(r => `'${r}'`).join(', ');
    if (i + itemsPerLine < sortedRegions.length) {
      result += ',\n';
    } else {
      result += ',\n';
    }
  }
  
  result += '    ]';
  
  return result;
}

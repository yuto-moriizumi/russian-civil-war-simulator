import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { CountryId } from '../../../types/game';
import { Project, SyntaxKind } from 'ts-morph';

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

    // Create a ts-morph project
    const project = new Project();
    const countryMetadataPath = path.join(process.cwd(), 'app', 'data', 'countryMetadata.ts');
    
    // Add the source file to the project
    const sourceFile = project.addSourceFileAtPath(countryMetadataPath);

    // Find the COUNTRY_METADATA object literal
    const countryMetadataVar = sourceFile.getVariableDeclaration('COUNTRY_METADATA');
    if (!countryMetadataVar) {
      throw new Error('Could not find COUNTRY_METADATA variable declaration');
    }

    let initializer = countryMetadataVar.getInitializer();
    if (!initializer) {
      throw new Error('COUNTRY_METADATA has no initializer');
    }

    // Handle 'satisfies' expressions (e.g., {...} satisfies Record<string, CountryMetadata>)
    if (initializer.getKind() === SyntaxKind.SatisfiesExpression) {
      const satisfiesExpr = initializer.asKindOrThrow(SyntaxKind.SatisfiesExpression);
      initializer = satisfiesExpr.getExpression();
    }

    // Handle 'as' expressions (e.g., {...} as const)
    if (initializer.getKind() === SyntaxKind.AsExpression) {
      const asExpr = initializer.asKindOrThrow(SyntaxKind.AsExpression);
      initializer = asExpr.getExpression();
    }

    if (initializer.getKind() !== SyntaxKind.ObjectLiteralExpression) {
      throw new Error('COUNTRY_METADATA is not initialized with an object literal');
    }

    const countryMetadataObj = initializer.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

    // Update each country's coreRegions property
    for (const [countryId, regions] of Object.entries(coreRegions)) {
      // Find the country property
      const countryProperty = countryMetadataObj.getProperty(countryId);
      
      if (!countryProperty) {
        console.warn(`Country "${countryId}" not found in COUNTRY_METADATA`);
        continue;
      }

      // Get the country object literal
      const countryObjectInitializer = countryProperty.asKind(SyntaxKind.PropertyAssignment)?.getInitializer();
      if (!countryObjectInitializer || countryObjectInitializer.getKind() !== SyntaxKind.ObjectLiteralExpression) {
        console.warn(`Country "${countryId}" is not an object literal`);
        continue;
      }

      const countryObj = countryObjectInitializer.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

      // Check if coreRegions property exists
      const coreRegionsProp = countryObj.getProperty('coreRegions');

      // Sort regions for consistency
      const sortedRegions = [...regions].sort();

      // Format the array as a multiline string for better readability
      const formattedArray = formatCoreRegionsForTsMorph(sortedRegions);

      if (coreRegionsProp) {
        // Update existing coreRegions property
        const propAssignment = coreRegionsProp.asKind(SyntaxKind.PropertyAssignment);
        if (propAssignment) {
          propAssignment.setInitializer(formattedArray);
        }
      } else {
        // Add new coreRegions property
        countryObj.addPropertyAssignment({
          name: 'coreRegions',
          initializer: formattedArray,
        });
      }
    }

    // Save the file with proper formatting
    await sourceFile.save();

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

/**
 * Format core regions array for ts-morph insertion
 * Creates a multiline array with proper indentation
 */
function formatCoreRegionsForTsMorph(regions: string[]): string {
  if (regions.length === 0) {
    return '[]';
  }

  // Group regions in lines of ~8 items for readability
  const itemsPerLine = 8;
  const lines: string[] = [];
  
  for (let i = 0; i < regions.length; i += itemsPerLine) {
    const group = regions.slice(i, i + itemsPerLine);
    lines.push(group.map(r => `'${r}'`).join(', '));
  }
  
  // Create multiline array with proper formatting
  return `[\n      ${lines.join(',\n      ')},\n    ]`;
}

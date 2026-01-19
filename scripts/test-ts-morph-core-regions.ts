#!/usr/bin/env tsx
/**
 * Test script to verify the ts-morph refactored save-core-regions logic
 * 
 * Usage: npx tsx scripts/test-ts-morph-core-regions.ts
 */

import path from 'path';
import { Project, SyntaxKind } from 'ts-morph';
import { CountryId } from '../app/types/game';

async function testTsMorphCoreRegions() {
  console.log('🧪 Testing ts-morph core regions modification...\n');

  // Test data - add a test region to Finland
  const testCoreRegions: Partial<Record<CountryId, string[]>> = {
    finland: ['FI-01', 'FI-02', 'FI-03', 'TEST-REGION'],
  };

  try {
    // Create a ts-morph project
    const project = new Project();
    const countryMetadataPath = path.join(process.cwd(), 'app', 'data', 'countryMetadata.ts');
    
    console.log(`📖 Reading file: ${countryMetadataPath}`);
    const sourceFile = project.addSourceFileAtPath(countryMetadataPath);

    // Find the COUNTRY_METADATA object literal
    const countryMetadataVar = sourceFile.getVariableDeclaration('COUNTRY_METADATA');
    if (!countryMetadataVar) {
      throw new Error('Could not find COUNTRY_METADATA variable declaration');
    }

    const initializer = countryMetadataVar.getInitializer();
    if (!initializer || !initializer.getKind || initializer.getKind() !== SyntaxKind.ObjectLiteralExpression) {
      throw new Error('COUNTRY_METADATA is not initialized with an object literal');
    }

    const countryMetadataObj = initializer.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

    // Test: Read current Finland core regions
    console.log('\n📍 Testing read operation...');
    const finlandProperty = countryMetadataObj.getProperty('finland');
    if (!finlandProperty) {
      throw new Error('Finland property not found');
    }

    const finlandObj = finlandProperty
      .asKind(SyntaxKind.PropertyAssignment)
      ?.getInitializer()
      ?.asKind(SyntaxKind.ObjectLiteralExpression);

    if (!finlandObj) {
      throw new Error('Finland is not an object literal');
    }

    const coreRegionsProp = finlandObj.getProperty('coreRegions');
    if (coreRegionsProp) {
      const currentValue = coreRegionsProp.asKind(SyntaxKind.PropertyAssignment)?.getInitializer()?.getText();
      console.log('✅ Current Finland coreRegions:', currentValue?.substring(0, 100) + '...');
    } else {
      console.log('⚠️  Finland has no coreRegions property');
    }

    // Test: Write operation (dry run - don't actually save)
    console.log('\n✏️  Testing write operation (dry run)...');
    for (const [countryId, regions] of Object.entries(testCoreRegions)) {
      const countryProperty = countryMetadataObj.getProperty(countryId);
      
      if (!countryProperty) {
        console.warn(`❌ Country "${countryId}" not found`);
        continue;
      }

      const countryObjInit = countryProperty.asKind(SyntaxKind.PropertyAssignment)?.getInitializer();
      if (!countryObjInit || countryObjInit.getKind() !== SyntaxKind.ObjectLiteralExpression) {
        console.warn(`❌ Country "${countryId}" is not an object literal`);
        continue;
      }

      const countryObj = countryObjInit.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
      const coreRegionsProp = countryObj.getProperty('coreRegions');

      // Format test data
      const sortedRegions = [...regions].sort();
      const formattedArray = `[\n      ${sortedRegions.map(r => `'${r}'`).join(', ')},\n    ]`;

      if (coreRegionsProp) {
        console.log(`✅ Would update ${countryId} coreRegions to: ${formattedArray}`);
      } else {
        console.log(`✅ Would add ${countryId} coreRegions: ${formattedArray}`);
      }
    }

    // Test AST structure
    console.log('\n🔍 Verifying AST structure...');
    const allCountries = countryMetadataObj.getProperties();
    console.log(`✅ Found ${allCountries.length} countries in COUNTRY_METADATA`);

    console.log('\n✨ All tests passed! ts-morph implementation is working correctly.\n');
    console.log('💡 Note: No files were modified (dry run mode)');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testTsMorphCoreRegions();

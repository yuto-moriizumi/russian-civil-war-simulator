#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');

// Load the GeoJSON to create regionId -> shapeID mapping
const geojsonPath = path.join(__dirname, '../public/map/regions.geojson');
const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const regionIdToShapeId = {};
geojson.features.forEach(feature => {
  const regionId = feature.properties.regionId;
  const shapeID = feature.properties.shapeID;
  if (regionId && shapeID) {
    regionIdToShapeId[regionId] = shapeID;
  }
});

console.log(`Created mapping for ${Object.keys(regionIdToShapeId).length} regions`);

// Function to migrate a TypeScript file
function migrateFile(filePath) {
  console.log(`\nMigrating: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changeCount = 0;
  
  // Replace all regionId keys with shapeID
  Object.entries(regionIdToShapeId).forEach(([regionId, shapeID]) => {
    // Match the regionId as a key in an object (with quotes)
    const pattern = new RegExp(`'${regionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'(?=:)`, 'g');
    const matches = content.match(pattern);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(pattern, `'${shapeID}'`);
    }
  });
  
  if (changeCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Migrated ${changeCount} region IDs`);
  } else {
    console.log(`  - No changes needed`);
  }
  
  return changeCount;
}

// Migrate all ownership files
const ownershipDir = path.join(__dirname, '../app/data/map/ownership');
const ownershipFiles = fs.readdirSync(ownershipDir)
  .filter(f => f.endsWith('.ts'))
  .map(f => path.join(ownershipDir, f));

// Migrate regionValues.ts
const regionValuesPath = path.join(__dirname, '../app/data/map/regionValues.ts');

// Migrate all files
let totalChanges = 0;
[...ownershipFiles, regionValuesPath].forEach(filePath => {
  totalChanges += migrateFile(filePath);
});

console.log(`\n✓ Migration complete! Total changes: ${totalChanges}`);

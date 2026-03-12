import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { UnitPlacementData, UnitPlacementEntry } from '../../../data/map/initialUnitPlacement';
import { CountryId } from '../../../types/game';

interface ArmyGroupDef {
  name: string;
  color: string;
}

export async function POST(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json() as {
      placement: UnitPlacementData;
      armyGroupDefs: Record<CountryId, ArmyGroupDef[]>;
    };
    const { placement, armyGroupDefs } = body;

    if (!placement || typeof placement !== 'object') {
      return NextResponse.json(
        { error: 'Placement data is required' },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'app', 'data', 'map', 'initialUnitPlacement.ts');
    const content = generateTypeScriptFile(placement, armyGroupDefs ?? {});

    await writeFile(filePath, content, 'utf-8');

    const regionCount = Object.keys(placement).length;
    const divCount = Object.values(placement).reduce(
      (s, entries) => s + entries.reduce((t, e) => t + e.count, 0),
      0
    );

    return NextResponse.json({
      success: true,
      message: `Saved ${divCount} divisions across ${regionCount} regions`,
    });
  } catch (error) {
    console.error('Error saving unit placement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function escapeSingleQuote(s: string): string {
  return s.replace(/'/g, "\\'");
}

function generateEntryTs(entry: UnitPlacementEntry): string {
  return `    { owner: '${escapeSingleQuote(entry.owner)}', armyGroupName: '${escapeSingleQuote(entry.armyGroupName)}', count: ${entry.count} }`;
}

function generateTypeScriptFile(
  placement: UnitPlacementData,
  armyGroupDefs: Record<CountryId, ArmyGroupDef[]>
): string {
  const sortedRegions = Object.keys(placement).sort();

  let content = `import { CountryId } from '../../types/game';

/**
 * Initial unit placement data.
 * Generated and maintained by the Map Tool (/map-tool, Units mode).
 */

export interface UnitPlacementEntry {
  owner: CountryId;
  armyGroupName: string;
  count: number;
}

export type UnitPlacementData = Record<string, UnitPlacementEntry[]>;

export interface ArmyGroupDef {
  name: string;
  color: string;
}

`;

  // Army group definitions
  content += `export const initialArmyGroupDefs: Record<string, ArmyGroupDef[]> = {\n`;
  for (const [countryId, groups] of Object.entries(armyGroupDefs).sort(([a], [b]) => a.localeCompare(b))) {
    if (!groups || groups.length === 0) continue;
    content += `  '${escapeSingleQuote(countryId)}': [\n`;
    for (const g of groups) {
      content += `    { name: '${escapeSingleQuote(g.name)}', color: '${escapeSingleQuote(g.color)}' },\n`;
    }
    content += `  ],\n`;
  }
  content += `} as Record<CountryId, ArmyGroupDef[]>;\n\n`;

  // Unit placement data
  content += `export const initialUnitPlacement: UnitPlacementData = {\n`;
  for (const regionId of sortedRegions) {
    const entries = placement[regionId];
    if (!entries || entries.length === 0) continue;
    content += `  '${escapeSingleQuote(regionId)}': [\n`;
    for (const entry of entries) {
      content += `${generateEntryTs(entry)},\n`;
    }
    content += `  ],\n`;
  }
  content += `} as UnitPlacementData;\n`;

  return content;
}

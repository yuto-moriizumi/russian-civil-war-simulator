import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { CountryId } from '../../../types/game';

/**
 * API endpoint to load core regions data
 *
 * GET /api/map-tool/load-core-regions
 * Returns: { coreRegions: Record<CountryId, string[]> }
 */
export async function GET() {
  try {
    const jsonPath = path.join(process.cwd(), 'app', 'data', 'countryMetadata.json');
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Record<string, { coreRegions?: string[] }>;

    const coreRegions: Record<CountryId, string[]> = {} as Record<CountryId, string[]>;
    for (const [countryId, metadata] of Object.entries(raw)) {
      coreRegions[countryId as CountryId] = metadata.coreRegions ?? [];
    }

    return NextResponse.json({ coreRegions });
  } catch (error) {
    console.error('Error loading core regions data:', error);
    return NextResponse.json(
      { error: 'Failed to load core regions data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

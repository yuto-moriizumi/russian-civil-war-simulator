import { NextResponse } from 'next/server';
import { CountryId } from '../../../types/game';

/**
 * API endpoint to dynamically load core regions data without module caching
 * This prevents stale module cache issues when country metadata is updated
 * 
 * GET /api/map-tool/load-core-regions
 * Returns: { coreRegions: Record<CountryId, string[]> }
 */
export async function GET() {
  try {
    // Use dynamic imports to fetch fresh data on each request
    const { COUNTRY_METADATA } = await import('../../../data/countryMetadata');

    // Extract core regions from country metadata
    const coreRegions: Record<CountryId, string[]> = {} as Record<CountryId, string[]>;
    
    for (const [countryId, metadata] of Object.entries(COUNTRY_METADATA)) {
      coreRegions[countryId as CountryId] = metadata.coreRegions || [];
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

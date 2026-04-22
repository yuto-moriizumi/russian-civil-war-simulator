import { NextResponse } from 'next/server';
import { readGeneratedMapData } from '../generatedFileUtils';
import type { GeneratedOwnershipData } from '../../../data/map/generatedTypes';

/**
 * GET /api/map-tool/load-ownership
 * Returns: { ownership: Record<string, CountryId>, notes?: MapDataNotes }
 */
export async function GET() {
  try {
    const data = await readGeneratedMapData<GeneratedOwnershipData>('ownership.json');

    return NextResponse.json({
      ownership: data?.ownership ?? {},
      notes: data?.notes,
    });
  } catch (error) {
    console.error('Error loading ownership data:', error);
    return NextResponse.json(
      { error: 'Failed to load ownership data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

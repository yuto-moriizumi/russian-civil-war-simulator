import { NextRequest, NextResponse } from 'next/server';
import { buildGeneratedOwnershipData } from '../../../data/map/generatedDataUtils';
import type {
  GeneratedOwnershipData,
  MapDataNotes,
} from '../../../data/map/generatedTypes';
import type { CountryId } from '../../../types/game';
import { readGeneratedMapData, writeGeneratedMapData } from '../generatedFileUtils';

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
      ownership: Record<string, CountryId>;
      notes?: MapDataNotes;
    };
    const { ownership, notes } = body;

    if (!ownership || typeof ownership !== 'object') {
      return NextResponse.json(
        { error: 'Ownership data is required' },
        { status: 400 }
      );
    }

    const previous = await readGeneratedMapData<GeneratedOwnershipData>('ownership.json');
    const data = buildGeneratedOwnershipData(ownership, previous?.notes, notes);
    await writeGeneratedMapData('ownership.json', data);

    return NextResponse.json({
      success: true,
      message: `Saved ownership for ${Object.keys(data.ownership).length} regions`,
    });
  } catch (error) {
    console.error('Error saving ownership:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

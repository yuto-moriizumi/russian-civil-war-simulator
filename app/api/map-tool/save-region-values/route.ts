import { NextRequest, NextResponse } from 'next/server';
import { buildGeneratedRegionValuesData } from '../../../data/map/generatedDataUtils';
import type {
  GeneratedRegionValuesData,
  MapDataNotes,
} from '../../../data/map/generatedTypes';
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
      regionValues: Record<string, number>;
      notes?: MapDataNotes;
    };
    const { regionValues, notes } = body;

    if (!regionValues || typeof regionValues !== 'object') {
      return NextResponse.json(
        { error: 'regionValues data is required' },
        { status: 400 }
      );
    }

    const previous = await readGeneratedMapData<GeneratedRegionValuesData>('regionValues.json');
    const data = buildGeneratedRegionValuesData(regionValues, previous?.notes, notes);
    await writeGeneratedMapData('regionValues.json', data);

    return NextResponse.json({
      success: true,
      message: `Saved ${Object.keys(data.values).length} non-default region values`,
    });
  } catch (error) {
    console.error('Error saving region values:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

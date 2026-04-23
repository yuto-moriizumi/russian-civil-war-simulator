import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
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

    const jsonPath = path.join(process.cwd(), 'app', 'data', 'countryMetadata.json');
    const existing = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Record<string, Record<string, unknown>>;

    for (const [countryId, regions] of Object.entries(coreRegions)) {
      if (!existing[countryId]) {
        console.warn(`Country "${countryId}" not found in countryMetadata.json`);
        continue;
      }
      existing[countryId].coreRegions = [...regions].sort();
    }

    fs.writeFileSync(jsonPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Updated core regions in countryMetadata.json',
    });
  } catch (error) {
    console.error('Error saving core regions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

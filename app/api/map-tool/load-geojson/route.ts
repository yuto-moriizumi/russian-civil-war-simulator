import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Fetch the GeoJSON from the provided URL
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.statusText}` },
        { status: response.status }
      );
    }

    const geojson = await response.json();

    // Basic validation
    if (!geojson.type || geojson.type !== 'FeatureCollection') {
      return NextResponse.json(
        { error: 'Not a valid FeatureCollection' },
        { status: 400 }
      );
    }

    return NextResponse.json({ geojson });
  } catch (error) {
    console.error('Error loading GeoJSON:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

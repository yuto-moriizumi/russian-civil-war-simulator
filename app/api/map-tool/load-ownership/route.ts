import { NextResponse } from 'next/server';

/**
 * API endpoint to dynamically load ownership data without module caching
 * This prevents stale module cache issues when ownership files are updated
 * by using dynamic imports which are fresh on each request
 * 
 * GET /api/map-tool/load-ownership
 * Returns: { ownership: Record<string, CountryId> }
 */
export async function GET() {
  try {
    // Use dynamic imports to fetch fresh data on each request
    // This bypasses Next.js module caching between saves
    const [
      { russiaOwnership },
      { easternEuropeOwnership },
      { centralEuropeOwnership },
      { asiaOwnership },
      { middleEastOwnership }
    ] = await Promise.all([
      import('../../../data/map/ownership/russia'),
      import('../../../data/map/ownership/easternEurope'),
      import('../../../data/map/ownership/centralEurope'),
      import('../../../data/map/ownership/asia'),
      import('../../../data/map/ownership/middleEast')
    ]);

    const ownership = {
      ...russiaOwnership,
      ...easternEuropeOwnership,
      ...centralEuropeOwnership,
      ...asiaOwnership,
      ...middleEastOwnership
    };

    return NextResponse.json({ ownership });
  } catch (error) {
    console.error('Error loading ownership data:', error);
    return NextResponse.json(
      { error: 'Failed to load ownership data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

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
    const { regionValues } = body;

    if (!regionValues || typeof regionValues !== 'object') {
      return NextResponse.json(
        { error: 'regionValues data is required' },
        { status: 400 }
      );
    }

    // Only persist regions whose value differs from the default (1)
    const nonDefaultEntries = Object.entries(regionValues as Record<string, number>).filter(
      ([, v]) => typeof v === 'number' && v !== 1
    );

    // Sort by region ID for consistency
    nonDefaultEntries.sort(([a], [b]) => a.localeCompare(b));

    let content = `/**\n`;
    content += ` * Region economic values/weights for income generation.\n`;
    content += ` * Default value is 1, major cities and industrial centers have higher values.\n`;
    content += ` *\n`;
    content += ` * Moscow: 5 (capital, political center)\n`;
    content += ` * St. Petersburg: 4 (former capital, major industrial city)\n`;
    content += ` * Kyiv: 3 (major city, strategic importance)\n`;
    content += ` * Other major cities: 2 (significant economic centers)\n`;
    content += ` * Standard regions: 1 (default)\n`;
    content += ` */\n`;
    content += `export const regionValues: Record<string, number> = {\n`;

    for (const [regionId, value] of nonDefaultEntries) {
      content += `  '${regionId}': ${value},\n`;
    }

    content += `\n  // All other regions default to value 1\n`;
    content += `};\n`;

    const filePath = path.join(process.cwd(), 'app', 'data', 'map', 'regionValues.ts');
    await writeFile(filePath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      message: `Saved ${nonDefaultEntries.length} non-default region values`,
    });
  } catch (error) {
    console.error('Error saving region values:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

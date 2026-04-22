import { NextResponse } from 'next/server';
import { readGeneratedMapData } from '../generatedFileUtils';
import type { GeneratedUnitPlacementData } from '../../../data/map/generatedTypes';

export async function GET() {
  try {
    const data = await readGeneratedMapData<GeneratedUnitPlacementData>('unitPlacement.json');

    return NextResponse.json({
      placement: data?.placement ?? {},
      armyGroupDefs: data?.armyGroupDefs ?? {},
      notes: data?.notes,
    });
  } catch (error) {
    console.error('Error loading unit placement:', error);
    return NextResponse.json({ placement: {}, armyGroupDefs: {}, notes: undefined });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  buildGeneratedUnitPlacementData,
  countPlacedDivisions,
} from '../../../data/map/generatedDataUtils';
import type {
  ArmyGroupDef,
  GeneratedUnitPlacementData,
  MapDataNotes,
  UnitPlacementData,
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
      placement: UnitPlacementData;
      armyGroupDefs: Record<CountryId, ArmyGroupDef[]>;
      notes?: MapDataNotes;
    };
    const { placement, armyGroupDefs, notes } = body;

    if (!placement || typeof placement !== 'object') {
      return NextResponse.json(
        { error: 'Placement data is required' },
        { status: 400 }
      );
    }

    const previous = await readGeneratedMapData<GeneratedUnitPlacementData>('unitPlacement.json');
    const data = buildGeneratedUnitPlacementData(
      placement,
      armyGroupDefs ?? {},
      previous?.notes,
      notes
    );

    await writeGeneratedMapData('unitPlacement.json', data);

    const regionCount = Object.keys(data.placement).length;
    const divCount = countPlacedDivisions(data.placement);

    return NextResponse.json({
      success: true,
      message: `Saved ${divCount} divisions across ${regionCount} regions`,
    });
  } catch (error) {
    console.error('Error saving unit placement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

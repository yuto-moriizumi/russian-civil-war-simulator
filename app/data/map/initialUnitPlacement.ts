import generatedUnitPlacement from './generated/unitPlacement.json';
import type { CountryId } from '../../types/game';
import type {
  ArmyGroupDef,
  MapDataNotes,
  UnitPlacementData,
  UnitPlacementEntry,
} from './generatedTypes';

export type { ArmyGroupDef, UnitPlacementData, UnitPlacementEntry };

/**
 * Compatibility wrapper for map-tool generated unit placement data.
 * The editable source of truth is app/data/map/generated/unitPlacement.json.
 */
export const initialArmyGroupDefs = generatedUnitPlacement.armyGroupDefs as Record<CountryId, ArmyGroupDef[]>;

export const initialUnitPlacement = generatedUnitPlacement.placement as UnitPlacementData;

export const initialUnitPlacementNotes = generatedUnitPlacement.notes as MapDataNotes | undefined;

import type { CountryId } from "../../types/game";
import type { ArmyGroupDef, UnitPlacementData } from "../../data/map/initialUnitPlacement";

export type EditMode = "ownership" | "core" | "units" | "value";

export interface MapToolDocument {
  ownership: Record<string, CountryId>;
  coreRegions: Record<CountryId, string[]>;
  unitPlacement: UnitPlacementData;
  armyGroupDefs: Record<CountryId, ArmyGroupDef[]>;
  regionValues: Record<string, number>;
}

export interface MapToolEditorState {
  current: MapToolDocument;
  baseline: MapToolDocument;
  history: MapToolDocument[];
  historyIndex: number;
  regionIds: string[];
  selectedCountry: CountryId;
  unitCountry: CountryId;
  selectedArmyGroup: string | null;
  editMode: EditMode;
  isPaintEnabled: boolean;
  showAdjacency: boolean;
}

export type MapToolAction =
  | { type: "loadDocument"; document: MapToolDocument }
  | { type: "loadRegionIds"; regionIds: string[] }
  | { type: "paintOwnership"; regionId: string; countryId: CountryId }
  | { type: "addCoreRegion"; regionId: string; countryId: CountryId }
  | { type: "removeCoreRegion"; regionId: string; countryId: CountryId }
  | { type: "changeRegionValue"; regionId: string; delta: number }
  | { type: "addUnit"; regionId: string; countryId: CountryId; armyGroupName: string }
  | { type: "removeUnit"; regionId: string; countryId: CountryId; armyGroupName: string }
  | { type: "addArmyGroup"; countryId: CountryId; name: string; color: string }
  | { type: "removeArmyGroup"; countryId: CountryId; name: string }
  | { type: "setSelectedCountry"; countryId: CountryId }
  | { type: "setUnitCountry"; countryId: CountryId }
  | { type: "setSelectedArmyGroup"; armyGroupName: string | null }
  | { type: "setEditMode"; editMode: EditMode }
  | { type: "setPaintEnabled"; enabled: boolean }
  | { type: "setShowAdjacency"; show: boolean }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "markSaved"; document?: MapToolDocument }
  | { type: "reset" };

import type { CountryId } from "../../types/game";
import { regionValues as initialRegionValues } from "../../data/map/regionValues";
import type { ArmyGroupDef, UnitPlacementData } from "../../data/map/initialUnitPlacement";
import type { MapToolAction, MapToolDocument, MapToolEditorState } from "./types";

export function createEmptyMapToolDocument(): MapToolDocument {
  return {
    ownership: {},
    coreRegions: {} as Record<CountryId, string[]>,
    unitPlacement: {},
    armyGroupDefs: {} as Record<CountryId, ArmyGroupDef[]>,
    regionValues: { ...initialRegionValues },
  };
}

export const initialMapToolEditorState: MapToolEditorState = {
  current: createEmptyMapToolDocument(),
  baseline: createEmptyMapToolDocument(),
  history: [createEmptyMapToolDocument()],
  historyIndex: 0,
  regionIds: [],
  selectedCountry: "soviet",
  unitCountry: "soviet",
  selectedArmyGroup: null,
  editMode: "ownership",
  isPaintEnabled: false,
  showAdjacency: false,
};

export function cloneDocument(document: MapToolDocument): MapToolDocument {
  return {
    ownership: { ...document.ownership },
    coreRegions: cloneCoreRegions(document.coreRegions),
    unitPlacement: cloneUnitPlacement(document.unitPlacement),
    armyGroupDefs: cloneArmyGroupDefs(document.armyGroupDefs),
    regionValues: { ...document.regionValues },
  };
}

export function selectIsDirty(state: MapToolEditorState): boolean {
  return !documentsEqual(state.current, state.baseline);
}

export function selectCanUndo(state: MapToolEditorState): boolean {
  return state.historyIndex > 0;
}

export function selectCanRedo(state: MapToolEditorState): boolean {
  return state.historyIndex < state.history.length - 1;
}

export function mapToolEditorReducer(
  state: MapToolEditorState,
  action: MapToolAction
): MapToolEditorState {
  switch (action.type) {
    case "loadDocument": {
      const document = normalizeDocumentForRegionIds(action.document, state.regionIds);
      return {
        ...state,
        current: cloneDocument(document),
        baseline: cloneDocument(document),
        history: [cloneDocument(document)],
        historyIndex: 0,
      };
    }

    case "loadRegionIds": {
      const current = normalizeDocumentForRegionIds(state.current, action.regionIds);
      const baseline = normalizeDocumentForRegionIds(state.baseline, action.regionIds);
      return {
        ...state,
        regionIds: [...action.regionIds],
        current,
        baseline,
        history: [cloneDocument(current)],
        historyIndex: 0,
      };
    }

    case "paintOwnership": {
      if (state.current.ownership[action.regionId] === action.countryId) return state;
      return pushDocument(state, {
        ...state.current,
        ownership: {
          ...state.current.ownership,
          [action.regionId]: action.countryId,
        },
      });
    }

    case "addCoreRegion": {
      const existing = state.current.coreRegions[action.countryId] ?? [];
      if (existing.includes(action.regionId)) return state;
      return pushDocument(state, {
        ...state.current,
        coreRegions: {
          ...state.current.coreRegions,
          [action.countryId]: [...existing, action.regionId],
        },
      });
    }

    case "removeCoreRegion": {
      const existing = state.current.coreRegions[action.countryId] ?? [];
      if (!existing.includes(action.regionId)) return state;
      return pushDocument(state, {
        ...state.current,
        coreRegions: {
          ...state.current.coreRegions,
          [action.countryId]: existing.filter((id) => id !== action.regionId),
        },
      });
    }

    case "changeRegionValue": {
      const currentValue = state.current.regionValues[action.regionId] ?? 1;
      const nextValue = Math.max(1, currentValue + action.delta);
      if (nextValue === currentValue) return state;
      return pushDocument(state, {
        ...state.current,
        regionValues: {
          ...state.current.regionValues,
          [action.regionId]: nextValue,
        },
      });
    }

    case "addUnit": {
      const entries = state.current.unitPlacement[action.regionId] ?? [];
      const existing = entries.find(
        (entry) =>
          entry.owner === action.countryId && entry.armyGroupName === action.armyGroupName
      );
      const nextEntries = existing
        ? entries.map((entry) =>
            entry.owner === action.countryId && entry.armyGroupName === action.armyGroupName
              ? { ...entry, count: entry.count + 1 }
              : entry
          )
        : [
            ...entries,
            { owner: action.countryId, armyGroupName: action.armyGroupName, count: 1 },
          ];

      return pushDocument(state, {
        ...state.current,
        unitPlacement: {
          ...state.current.unitPlacement,
          [action.regionId]: nextEntries,
        },
      });
    }

    case "removeUnit": {
      const entries = state.current.unitPlacement[action.regionId];
      if (!entries) return state;
      const nextEntries = entries
        .map((entry) =>
          entry.owner === action.countryId && entry.armyGroupName === action.armyGroupName
            ? { ...entry, count: Math.max(0, entry.count - 1) }
            : entry
        )
        .filter((entry) => entry.count > 0);

      if (JSON.stringify(entries) === JSON.stringify(nextEntries)) return state;

      const unitPlacement = { ...state.current.unitPlacement };
      if (nextEntries.length === 0) {
        delete unitPlacement[action.regionId];
      } else {
        unitPlacement[action.regionId] = nextEntries;
      }

      return pushDocument(state, {
        ...state.current,
        unitPlacement,
      });
    }

    case "addArmyGroup": {
      const name = action.name.trim();
      if (!name) return state;
      const existing = state.current.armyGroupDefs[action.countryId] ?? [];
      if (existing.some((group) => group.name === name)) return state;
      return pushDocument(state, {
        ...state.current,
        armyGroupDefs: {
          ...state.current.armyGroupDefs,
          [action.countryId]: [...existing, { name, color: action.color }],
        },
      });
    }

    case "removeArmyGroup": {
      const existing = state.current.armyGroupDefs[action.countryId] ?? [];
      if (!existing.some((group) => group.name === action.name)) return state;

      const unitPlacement: UnitPlacementData = {};
      for (const [regionId, entries] of Object.entries(state.current.unitPlacement)) {
        const filtered = entries.filter(
          (entry) =>
            !(entry.owner === action.countryId && entry.armyGroupName === action.name)
        );
        if (filtered.length > 0) unitPlacement[regionId] = filtered;
      }

      const nextState = pushDocument(state, {
        ...state.current,
        armyGroupDefs: {
          ...state.current.armyGroupDefs,
          [action.countryId]: existing.filter((group) => group.name !== action.name),
        },
        unitPlacement,
      });

      if (state.unitCountry !== action.countryId || state.selectedArmyGroup !== action.name) {
        return nextState;
      }

      return {
        ...nextState,
        selectedArmyGroup: null,
      };
    }

    case "setSelectedCountry":
      return { ...state, selectedCountry: action.countryId };

    case "setUnitCountry":
      return { ...state, unitCountry: action.countryId };

    case "setSelectedArmyGroup":
      return { ...state, selectedArmyGroup: action.armyGroupName };

    case "setEditMode":
      return { ...state, editMode: action.editMode };

    case "setPaintEnabled":
      return { ...state, isPaintEnabled: action.enabled };

    case "setShowAdjacency":
      return { ...state, showAdjacency: action.show };

    case "undo": {
      if (!selectCanUndo(state)) return state;
      const historyIndex = state.historyIndex - 1;
      return {
        ...state,
        historyIndex,
        current: cloneDocument(state.history[historyIndex]),
      };
    }

    case "redo": {
      if (!selectCanRedo(state)) return state;
      const historyIndex = state.historyIndex + 1;
      return {
        ...state,
        historyIndex,
        current: cloneDocument(state.history[historyIndex]),
      };
    }

    case "markSaved": {
      const savedDocument = action.document
        ? normalizeDocumentForRegionIds(action.document, state.regionIds)
        : state.current;
      const isCurrentSaved = documentsEqual(state.current, savedDocument);
      return {
        ...state,
        baseline: cloneDocument(savedDocument),
        history: isCurrentSaved ? [cloneDocument(savedDocument)] : state.history,
        historyIndex: isCurrentSaved ? 0 : state.historyIndex,
      };
    }

    case "reset": {
      const baseline = cloneDocument(state.baseline);
      return {
        ...state,
        current: baseline,
        history: [cloneDocument(baseline)],
        historyIndex: 0,
      };
    }
  }
}

function pushDocument(
  state: MapToolEditorState,
  document: MapToolDocument
): MapToolEditorState {
  const nextDocument = cloneDocument(document);
  if (documentsEqual(state.current, nextDocument)) return state;
  const history = [
    ...state.history.slice(0, state.historyIndex + 1),
    cloneDocument(nextDocument),
  ];
  return {
    ...state,
    current: nextDocument,
    history,
    historyIndex: history.length - 1,
  };
}

function normalizeDocumentForRegionIds(
  document: MapToolDocument,
  regionIds: string[]
): MapToolDocument {
  const cloned = cloneDocument(document);
  if (regionIds.length === 0) return cloned;

  const ownership: Record<string, CountryId> = {};
  for (const regionId of regionIds) {
    ownership[regionId] = cloned.ownership[regionId] ?? "neutral";
  }

  return {
    ...cloned,
    ownership,
  };
}

function documentsEqual(a: MapToolDocument, b: MapToolDocument): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function cloneCoreRegions(
  coreRegions: Record<CountryId, string[]>
): Record<CountryId, string[]> {
  return Object.fromEntries(
    Object.entries(coreRegions).map(([countryId, regions]) => [countryId, [...regions]])
  ) as Record<CountryId, string[]>;
}

function cloneUnitPlacement(unitPlacement: UnitPlacementData): UnitPlacementData {
  return Object.fromEntries(
    Object.entries(unitPlacement).map(([regionId, entries]) => [
      regionId,
      entries.map((entry) => ({ ...entry })),
    ])
  );
}

function cloneArmyGroupDefs(
  armyGroupDefs: Record<CountryId, ArmyGroupDef[]>
): Record<CountryId, ArmyGroupDef[]> {
  return Object.fromEntries(
    Object.entries(armyGroupDefs).map(([countryId, groups]) => [
      countryId,
      groups.map((group) => ({ ...group })),
    ])
  ) as Record<CountryId, ArmyGroupDef[]>;
}

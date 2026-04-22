"use client";

import { useReducer, useState, useCallback, useEffect, useRef } from "react";
import { CountryId } from "../types/game";
import type { RegionFeatureCollection } from "../../types";
import MapToolCanvas from "./components/MapToolCanvas";
import GeoJSONLoader from "./components/GeoJSONLoader";
import CountryPalette from "./components/CountryPalette";
import MapToolHeader from "./components/MapToolHeader";
import UnitPlacementPanel from "./components/UnitPlacementPanel";
import { useMapToolSave } from "./hooks/useMapToolSave";
import type { ArmyGroupDef, UnitPlacementData } from "../data/map/initialUnitPlacement";
import {
  initialMapToolEditorState,
  mapToolEditorReducer,
  selectCanRedo,
  selectCanUndo,
  selectIsDirty,
} from "./editor/reducer";
import type { EditMode, MapToolDocument } from "./editor/types";

export default function MapToolPage() {
  const [editorState, dispatch] = useReducer(
    mapToolEditorReducer,
    initialMapToolEditorState
  );
  const [geojson, setGeojson] = useState<RegionFeatureCollection | null>(null);
  const [adjacency, setAdjacency] = useState<Record<string, string[]> | null>(null);
  const paintedRegionsInDrag = useRef<Set<string>>(new Set());
  const lastPaintAction = useRef<{ regionId: string; timestamp: number } | null>(null);

  const {
    ownership,
    coreRegions,
    unitPlacement,
    armyGroupDefs,
    regionValues,
  } = editorState.current;
  const {
    selectedCountry,
    unitCountry,
    selectedArmyGroup,
    showAdjacency,
    isPaintEnabled,
    editMode,
  } = editorState;

  const { isSaving, isLoading, handleSave, handleGenerateAdjacency } = useMapToolSave({
    ownership, coreRegions, unitPlacement, armyGroupDefs, regionValues,
    geojson, setAdjacency,
    onSaveSuccess: (document) => {
      dispatch({ type: "markSaved", document: document as MapToolDocument });
    },
  });

  useEffect(() => {
    let cancelled = false;

    const loadMapToolDocument = async () => {
      const [ownershipData, coreRegionData, unitPlacementData] = await Promise.all([
        loadInitialOwnership(),
        loadInitialCoreRegions(),
        loadInitialUnitPlacement(),
      ]);

      if (cancelled) return;
      dispatch({
        type: "loadDocument",
        document: {
          ownership: ownershipData,
          coreRegions: coreRegionData,
          unitPlacement: unitPlacementData.placement,
          armyGroupDefs: unitPlacementData.armyGroupDefs,
          regionValues,
        },
      });
    };

    loadMapToolDocument();

    return () => {
      cancelled = true;
    };
    // regionValues is read only for the initial document seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGeoJSONLoad = useCallback((data: RegionFeatureCollection) => {
    setGeojson(data);
    dispatch({
      type: "loadRegionIds",
      regionIds: data.features
        .map((feature) => feature.id as string | undefined)
        .filter((regionId): regionId is string => Boolean(regionId)),
    });
  }, []);

  const handleRegionPaint = useCallback((regionId: string) => {
    if (editMode === 'units') return;
    const now = Date.now();
    if (lastPaintAction.current &&
        lastPaintAction.current.regionId === regionId &&
        now - lastPaintAction.current.timestamp < 100) return;
    lastPaintAction.current = { regionId, timestamp: now };
    if (!selectedCountry) return;
    if (editMode === 'ownership') {
      dispatch({ type: "paintOwnership", regionId, countryId: selectedCountry });
    } else if (editMode === 'core') {
      if (paintedRegionsInDrag.current.has(regionId)) return;
      paintedRegionsInDrag.current.add(regionId);
      dispatch({ type: "addCoreRegion", regionId, countryId: selectedCountry });
    }
  }, [selectedCountry, editMode]);

  const handleRegionCoreRemove = useCallback((regionId: string) => {
    if (editMode !== 'core' || !selectedCountry) return;
    dispatch({ type: "removeCoreRegion", regionId, countryId: selectedCountry });
  }, [editMode, selectedCountry]);

  const handlePaintEnd = useCallback(() => {
    paintedRegionsInDrag.current.clear();
  }, []);

  const handleRegionValueChange = useCallback((regionId: string, delta: number) => {
    dispatch({ type: "changeRegionValue", regionId, delta });
  }, []);

  const handleRegionUnitAdd = useCallback((regionId: string) => {
    if (!selectedArmyGroup) return;
    dispatch({
      type: "addUnit",
      regionId,
      countryId: unitCountry,
      armyGroupName: selectedArmyGroup,
    });
  }, [selectedArmyGroup, unitCountry]);

  const handleRegionUnitRemove = useCallback((regionId: string) => {
    if (!selectedArmyGroup) return;
    dispatch({
      type: "removeUnit",
      regionId,
      countryId: unitCountry,
      armyGroupName: selectedArmyGroup,
    });
  }, [selectedArmyGroup, unitCountry]);

  const handleAddArmyGroup = useCallback(
    (countryId: CountryId, name: string, color: string) => {
      dispatch({ type: "addArmyGroup", countryId, name, color });
    },
    []
  );

  const handleRemoveArmyGroup = useCallback((countryId: CountryId, name: string) => {
    dispatch({ type: "removeArmyGroup", countryId, name });
  }, []);

  const handleUndo = useCallback(() => {
    dispatch({ type: "undo" });
  }, []);

  const handleRedo = useCallback(() => {
    dispatch({ type: "redo" });
  }, []);

  const handleReset = useCallback(() => {
    if (confirm("Reset all changes to original ownership, core regions, unit placement, and region values?")) {
      dispatch({ type: "reset" });
    }
  }, []);

  const hasChanges = selectIsDirty(editorState);
  const canUndo = selectCanUndo(editorState);
  const canRedo = selectCanRedo(editorState);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); handleRedo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); if (hasChanges) handleSave(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleSave, hasChanges]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-900 text-white">
      <GeoJSONLoader onLoad={handleGeoJSONLoad} isLoading={isLoading} />
      <MapToolHeader
        hasChanges={hasChanges} canUndo={canUndo} canRedo={canRedo}
        onUndo={handleUndo} onRedo={handleRedo}
        geojson={geojson} adjacency={adjacency} showAdjacency={showAdjacency}
        isLoading={isLoading} onGenerateAdjacency={handleGenerateAdjacency}
        onShowAdjacencyChange={(show) => dispatch({ type: "setShowAdjacency", show })}
        editMode={editMode} isPaintEnabled={isPaintEnabled}
        onEditModeChange={(mode) => dispatch({ type: "setEditMode", editMode: mode as EditMode })}
        onPaintToggle={() => dispatch({ type: "setPaintEnabled", enabled: !isPaintEnabled })}
        ownership={ownership} isSaving={isSaving} onSave={handleSave} onReset={handleReset}
      />
      <div className="flex flex-1 overflow-hidden">
        {geojson && (
          <aside className="flex w-80 flex-col overflow-y-auto border-r border-gray-700 bg-gray-800 p-4">
            {editMode === 'units' ? (
              <UnitPlacementPanel
                selectedCountry={unitCountry}
                onSelectCountry={(countryId) => dispatch({ type: "setUnitCountry", countryId })}
                selectedArmyGroup={selectedArmyGroup}
                onSelectArmyGroup={(armyGroupName) => dispatch({ type: "setSelectedArmyGroup", armyGroupName })}
                armyGroups={armyGroupDefs} onAddArmyGroup={handleAddArmyGroup}
                onRemoveArmyGroup={handleRemoveArmyGroup} placement={unitPlacement}
              />
            ) : editMode === 'value' ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-yellow-400">Value Edit Mode</p>
                <p className="text-xs text-gray-400">Left-click a region to increase its value by 1.</p>
                <p className="text-xs text-gray-400">Right-click a region to decrease its value by 1.</p>
                <p className="text-xs text-gray-400">Minimum value is 1.</p>
                <div className="mt-4 space-y-1">
                  <p className="text-xs font-semibold text-gray-300">Color legend</p>
                  {[
                    { v: 1, color: '#1a3a5c', label: '1 (default)' },
                    { v: 2, color: '#2e6da4', label: '2' },
                    { v: 3, color: '#f0a500', label: '3' },
                    { v: 4, color: '#e06000', label: '4' },
                    { v: 5, color: '#c00000', label: '5' },
                  ].map(({ v, color, label }) => (
                    <div key={v} className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded border border-gray-600" style={{ backgroundColor: color }} />
                      <span className="text-xs text-gray-300">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <CountryPalette
                selectedCountry={selectedCountry}
                onSelectCountry={(countryId) => dispatch({ type: "setSelectedCountry", countryId })}
              />
            )}
          </aside>
        )}
        <main className="flex-1">
          {geojson ? (
            <MapToolCanvas
              geojson={geojson} ownership={ownership}
              selectedCountry={editMode === 'units' ? unitCountry : selectedCountry}
              adjacency={adjacency} showAdjacency={showAdjacency}
              isPaintEnabled={editMode !== 'units' && editMode !== 'value' && isPaintEnabled}
              editMode={editMode} coreRegions={coreRegions}
              unitPlacement={unitPlacement} selectedArmyGroup={selectedArmyGroup}
              unitCountry={unitCountry} armyGroupDefs={armyGroupDefs}
              onRegionPaint={handleRegionPaint} onRegionHover={() => {}}
              onCountryPick={(countryId) => dispatch({
                type: editMode === 'units' ? "setUnitCountry" : "setSelectedCountry",
                countryId,
              })}
              onPaintEnd={handlePaintEnd}
              onRegionUnitAdd={handleRegionUnitAdd} onRegionUnitRemove={handleRegionUnitRemove}
              onRegionCoreRemove={handleRegionCoreRemove}
              regionValues={regionValues}
              onRegionValueChange={handleRegionValueChange}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg">No GeoJSON loaded</p>
                <p className="text-sm">Upload a file or fetch from URL to begin</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

async function loadInitialOwnership(): Promise<Record<string, CountryId>> {
  try {
    const response = await fetch('/api/map-tool/load-ownership');
    if (!response.ok) throw new Error('Failed to load ownership data');
    const data = await response.json() as { ownership: Record<string, CountryId> };
    return data.ownership || {};
  } catch (error) {
    console.error('Error loading ownership:', error);
    return {};
  }
}

async function loadInitialCoreRegions(): Promise<Record<CountryId, string[]>> {
  try {
    const response = await fetch('/api/map-tool/load-core-regions');
    if (!response.ok) throw new Error('Failed to load core regions data');
    const data = await response.json() as { coreRegions: Record<CountryId, string[]> };
    return data.coreRegions || {} as Record<CountryId, string[]>;
  } catch (error) {
    console.error('Error loading core regions:', error);
    return {} as Record<CountryId, string[]>;
  }
}

async function loadInitialUnitPlacement(): Promise<{
  placement: UnitPlacementData;
  armyGroupDefs: Record<CountryId, ArmyGroupDef[]>;
}> {
  try {
    const response = await fetch('/api/map-tool/load-unit-placement');
    if (!response.ok) {
      return {
        placement: {},
        armyGroupDefs: {} as Record<CountryId, ArmyGroupDef[]>,
      };
    }
    const data = await response.json() as {
      placement: UnitPlacementData;
      armyGroupDefs: Record<CountryId, ArmyGroupDef[]>;
    };
    return {
      placement: data.placement ?? {},
      armyGroupDefs: data.armyGroupDefs ?? {} as Record<CountryId, ArmyGroupDef[]>,
    };
  } catch {
    return {
      placement: {},
      armyGroupDefs: {} as Record<CountryId, ArmyGroupDef[]>,
    };
  }
}

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CountryId } from "../types/game";
import type { RegionFeatureCollection } from "../../types";
import MapToolCanvas from "./components/MapToolCanvas";
import GeoJSONLoader from "./components/GeoJSONLoader";
import CountryPalette from "./components/CountryPalette";
import MapToolHeader from "./components/MapToolHeader";
import UnitPlacementPanel from "./components/UnitPlacementPanel";
import { useMapToolData } from "./hooks/useMapToolData";
import { useUnitPlacement } from "./hooks/useUnitPlacement";
import { useMapToolSave } from "./hooks/useMapToolSave";

export default function MapToolPage() {
  const [geojson, setGeojson] = useState<RegionFeatureCollection | null>(null);
  const [ownership, setOwnership] = useState<Record<string, CountryId>>({});
  const [originalOwnership, setOriginalOwnership] = useState<Record<string, CountryId>>({});
  const [adjacency, setAdjacency] = useState<Record<string, string[]> | null>(null);
  const { coreRegions, originalCoreRegions, setCoreRegions, setOriginalCoreRegions } = useMapToolData();

  const {
    unitPlacement, originalUnitPlacement,
    armyGroupDefs, originalArmyGroupDefs,
    selectedArmyGroup, setSelectedArmyGroup,
    unitCountry, setUnitCountry,
    handleRegionUnitAdd, handleRegionUnitRemove,
    handleAddArmyGroup, handleRemoveArmyGroup,
    resetUnitPlacement, confirmSave,
    hasChanges: hasUnitPlacementChanges,
  } = useUnitPlacement();

  const { isSaving, isLoading, handleSave, handleGenerateAdjacency } = useMapToolSave({
    ownership, coreRegions, unitPlacement, armyGroupDefs,
    geojson, setAdjacency,
    onSaveSuccess: ({ ownership: o, coreRegions: c, unitPlacement: u, armyGroupDefs: a }) => {
      setOriginalOwnership({ ...o });
      setOriginalCoreRegions({ ...c } as Record<CountryId, string[]>);
      confirmSave(u, a);
      setHistory([o]);
      setHistoryIndex(0);
    },
  });

  const [selectedCountry, setSelectedCountry] = useState<CountryId>("soviet");
  const [showAdjacency, setShowAdjacency] = useState(false);
  const [isPaintEnabled, setIsPaintEnabled] = useState(false);
  const [editMode, setEditMode] = useState<'ownership' | 'core' | 'units'>('ownership');
  const [history, setHistory] = useState<Record<string, CountryId>[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [, setPaintedRegionsInDrag] = useState<Set<string>>(new Set());
  const lastPaintAction = useRef<{ regionId: string; timestamp: number } | null>(null);

  const handleGeoJSONLoad = useCallback((data: RegionFeatureCollection) => {
    setGeojson(data);
    const newOwnership: Record<string, CountryId> = {};
    const win = window as unknown as { __initialRegionOwnership?: Record<string, CountryId> };
    const initialOwnershipData = win.__initialRegionOwnership || {};
    data.features.forEach((feature) => {
      const shapeId = feature.id as string;
      if (shapeId) {
        newOwnership[shapeId] = (initialOwnershipData[shapeId] as CountryId) || "neutral";
      }
    });
    setOwnership(newOwnership);
    setOriginalOwnership({ ...newOwnership });
    setHistory([{ ...newOwnership }]);
    setHistoryIndex(0);
  }, [setGeojson, setOwnership, setOriginalOwnership, setHistory, setHistoryIndex]);

  const handleRegionPaint = useCallback((regionId: string) => {
    if (editMode === 'units') return;
    const now = Date.now();
    if (lastPaintAction.current &&
        lastPaintAction.current.regionId === regionId &&
        now - lastPaintAction.current.timestamp < 100) return;
    lastPaintAction.current = { regionId, timestamp: now };
    if (!selectedCountry) return;
    if (editMode === 'ownership') {
      setOwnership((prev) => {
        const updated = { ...prev, [regionId]: selectedCountry };
        setHistory((h) => [...h.slice(0, historyIndex + 1), updated]);
        setHistoryIndex((i) => i + 1);
        return updated;
      });
    } else if (editMode === 'core') {
      setPaintedRegionsInDrag((prevPainted) => {
        if (prevPainted.has(regionId)) return prevPainted;
        return new Set([...prevPainted, regionId]);
      });
      setCoreRegions((prev) => {
        const updated = { ...prev };
        const countryRegions = updated[selectedCountry] || [];
        if (!countryRegions.includes(regionId)) {
          updated[selectedCountry] = [...countryRegions, regionId];
        }
        return updated;
      });
    }
  }, [selectedCountry, historyIndex, editMode, setCoreRegions, setOwnership, setHistory, setHistoryIndex, setPaintedRegionsInDrag]);

  const handleRegionCoreRemove = useCallback((regionId: string) => {
    if (editMode !== 'core' || !selectedCountry) return;
    setCoreRegions((prev) => {
      const updated = { ...prev };
      const countryRegions = updated[selectedCountry] || [];
      updated[selectedCountry] = countryRegions.filter((id) => id !== regionId);
      return updated;
    });
  }, [editMode, selectedCountry, setCoreRegions]);

  const handlePaintEnd = useCallback(() => setPaintedRegionsInDrag(new Set()), []);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((i) => i - 1);
      setOwnership(history[historyIndex - 1]);
    }
  }, [historyIndex, history, setHistoryIndex, setOwnership]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((i) => i + 1);
      setOwnership(history[historyIndex + 1]);
    }
  }, [historyIndex, history, setHistoryIndex, setOwnership]);

  const handleReset = useCallback(() => {
    if (confirm("Reset all changes to original ownership, core regions, and unit placement?")) {
      setOwnership({ ...originalOwnership });
      setCoreRegions({ ...originalCoreRegions });
      resetUnitPlacement(originalUnitPlacement, originalArmyGroupDefs);
      setHistory([{ ...originalOwnership }]);
      setHistoryIndex(0);
    }
  }, [originalOwnership, originalCoreRegions, originalUnitPlacement, originalArmyGroupDefs, setCoreRegions, resetUnitPlacement, setOwnership, setHistory, setHistoryIndex]);

  const hasChanges =
    JSON.stringify(ownership) !== JSON.stringify(originalOwnership) ||
    JSON.stringify(coreRegions) !== JSON.stringify(originalCoreRegions) ||
    hasUnitPlacementChanges;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

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
        onShowAdjacencyChange={setShowAdjacency}
        editMode={editMode} isPaintEnabled={isPaintEnabled}
        onEditModeChange={setEditMode} onPaintToggle={() => setIsPaintEnabled(!isPaintEnabled)}
        ownership={ownership} isSaving={isSaving} onSave={handleSave} onReset={handleReset}
      />
      <div className="flex flex-1 overflow-hidden">
        {geojson && (
          <aside className="flex w-80 flex-col overflow-y-auto border-r border-gray-700 bg-gray-800 p-4">
            {editMode === 'units' ? (
              <UnitPlacementPanel
                selectedCountry={unitCountry} onSelectCountry={setUnitCountry}
                selectedArmyGroup={selectedArmyGroup} onSelectArmyGroup={setSelectedArmyGroup}
                armyGroups={armyGroupDefs} onAddArmyGroup={handleAddArmyGroup}
                onRemoveArmyGroup={handleRemoveArmyGroup} placement={unitPlacement}
              />
            ) : (
              <CountryPalette selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />
            )}
          </aside>
        )}
        <main className="flex-1">
          {geojson ? (
            <MapToolCanvas
              geojson={geojson} ownership={ownership}
              selectedCountry={editMode === 'units' ? unitCountry : selectedCountry}
              adjacency={adjacency} showAdjacency={showAdjacency}
              isPaintEnabled={editMode !== 'units' && isPaintEnabled}
              editMode={editMode} coreRegions={coreRegions}
              unitPlacement={unitPlacement} selectedArmyGroup={selectedArmyGroup}
              unitCountry={unitCountry} armyGroupDefs={armyGroupDefs}
              onRegionPaint={handleRegionPaint} onRegionHover={() => {}}
              onCountryPick={editMode === 'units' ? setUnitCountry : setSelectedCountry}
              onPaintEnd={handlePaintEnd}
              onRegionUnitAdd={handleRegionUnitAdd} onRegionUnitRemove={handleRegionUnitRemove}
              onRegionCoreRemove={handleRegionCoreRemove}
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

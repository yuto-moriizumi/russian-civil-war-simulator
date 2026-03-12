"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { FeatureCollection } from "geojson";
import { CountryId } from "../types/game";
import MapToolCanvas from "./components/MapToolCanvas";
import GeoJSONLoader from "./components/GeoJSONLoader";
import CountryPalette from "./components/CountryPalette";
import MapToolHeader from "./components/MapToolHeader";
import UnitPlacementPanel from "./components/UnitPlacementPanel";
import { useMapToolData } from "./hooks/useMapToolData";
import { UnitPlacementData } from "../data/map/initialUnitPlacement";

// ─── Army group definition (map-tool local, not game-store) ─────────────────
interface ArmyGroupDef {
  name: string;
  color: string;
}

export default function MapToolPage() {
  // Data state
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [ownership, setOwnership] = useState<Record<string, CountryId>>({});
  const [originalOwnership, setOriginalOwnership] = useState<
    Record<string, CountryId>
  >({});
  const [adjacency, setAdjacency] = useState<Record<string, string[]> | null>(
    null
  );
  const { coreRegions, originalCoreRegions, setCoreRegions, setOriginalCoreRegions } = useMapToolData();

  // ── Unit placement state ───────────────────────────────────────────────────
  const [unitPlacement, setUnitPlacement] = useState<UnitPlacementData>({});
  const [originalUnitPlacement, setOriginalUnitPlacement] = useState<UnitPlacementData>({});
  /** Army groups per country defined in the map-tool session */
  const [armyGroupDefs, setArmyGroupDefs] = useState<Record<CountryId, ArmyGroupDef[]>>(
    {} as Record<CountryId, ArmyGroupDef[]>
  );
  const [originalArmyGroupDefs, setOriginalArmyGroupDefs] = useState<Record<CountryId, ArmyGroupDef[]>>(
    {} as Record<CountryId, ArmyGroupDef[]>
  );
  const [selectedArmyGroup, setSelectedArmyGroup] = useState<string | null>(null);
  // Country selected in units mode (independent from ownership-mode country)
  const [unitCountry, setUnitCountry] = useState<CountryId>("soviet");

  // UI state
  const [selectedCountry, setSelectedCountry] = useState<CountryId>("soviet");
  const [showAdjacency, setShowAdjacency] = useState(false);
  const [isPaintEnabled, setIsPaintEnabled] = useState(false);
  const [editMode, setEditMode] = useState<'ownership' | 'core' | 'units'>('ownership');

  // History state
  const [history, setHistory] = useState<Record<string, CountryId>[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Track painted regions in current drag session to prevent toggle flickering
  const [, setPaintedRegionsInDrag] = useState<Set<string>>(new Set());

  // Prevent double-processing of the same paint action (React strict mode issue)
  const lastPaintAction = useRef<{ regionId: string; timestamp: number } | null>(null);

  // ── Load unit placement from API on mount ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/map-tool/load-unit-placement");
        if (!res.ok) return;
        const data = await res.json() as {
          placement: UnitPlacementData;
          armyGroupDefs: Record<CountryId, ArmyGroupDef[]>;
        };
        setUnitPlacement(data.placement ?? {});
        setOriginalUnitPlacement({ ...(data.placement ?? {}) });
        setArmyGroupDefs(data.armyGroupDefs ?? {} as Record<CountryId, ArmyGroupDef[]>);
        setOriginalArmyGroupDefs({ ...(data.armyGroupDefs ?? {}) } as Record<CountryId, ArmyGroupDef[]>);
      } catch {
        // silently ignore – tool still works without saved placements
      }
    };
    load();
  }, []);

  // Load GeoJSON handler
  const handleGeoJSONLoad = useCallback(
    (data: FeatureCollection) => {
      setGeojson(data);

      // Initialize ownership from features or use dynamically loaded data
      const newOwnership: Record<string, CountryId> = {};
      const win = window as unknown as { __initialRegionOwnership?: Record<string, CountryId> };
      const initialOwnershipData = win.__initialRegionOwnership || {};
      
      data.features.forEach((feature) => {
        const shapeId = feature.properties?.shapeID;
        if (shapeId) {
          // Try to get existing ownership, fallback to neutral
          newOwnership[shapeId] =
            (initialOwnershipData[shapeId] as CountryId) || "neutral";
        }
      });

      setOwnership(newOwnership);
      setOriginalOwnership({ ...newOwnership });
      setHistory([{ ...newOwnership }]);
      setHistoryIndex(0);
    },
    []
  );

  // Paint handler (ownership / core modes)
  const handleRegionPaint = useCallback(
    (regionId: string) => {
      // In units mode, painting is handled separately
      if (editMode === 'units') return;

      // Prevent double-processing within 100ms (React Strict Mode can cause double calls)
      const now = Date.now();
      if (lastPaintAction.current && 
          lastPaintAction.current.regionId === regionId && 
          now - lastPaintAction.current.timestamp < 100) {
        return;
      }
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
          const newPainted = new Set(prevPainted);
          newPainted.add(regionId);
          return newPainted;
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
    },
    [selectedCountry, historyIndex, editMode, setCoreRegions]
  );

  // ── Unit placement handlers ────────────────────────────────────────────────

  /** Add one division to regionId for the selected army group */
  const handleRegionUnitAdd = useCallback(
    (regionId: string) => {
      if (!selectedArmyGroup) return;
      setUnitPlacement((prev) => {
        const entries = prev[regionId] ? [...prev[regionId]] : [];
        const existing = entries.find(
          (e) => e.owner === unitCountry && e.armyGroupName === selectedArmyGroup
        );
        if (existing) {
          return {
            ...prev,
            [regionId]: entries.map((e) =>
              e.owner === unitCountry && e.armyGroupName === selectedArmyGroup
                ? { ...e, count: e.count + 1 }
                : e
            ),
          };
        }
        return {
          ...prev,
          [regionId]: [
            ...entries,
            { owner: unitCountry, armyGroupName: selectedArmyGroup, count: 1 },
          ],
        };
      });
    },
    [selectedArmyGroup, unitCountry]
  );

  /** Remove one division from regionId for the selected army group */
  const handleRegionUnitRemove = useCallback(
    (regionId: string) => {
      if (!selectedArmyGroup) return;
      setUnitPlacement((prev) => {
        const entries = prev[regionId];
        if (!entries) return prev;
        const updated = entries
          .map((e) =>
            e.owner === unitCountry && e.armyGroupName === selectedArmyGroup
              ? { ...e, count: Math.max(0, e.count - 1) }
              : e
          )
          .filter((e) => e.count > 0);
        const next = { ...prev };
        if (updated.length === 0) {
          delete next[regionId];
        } else {
          next[regionId] = updated;
        }
        return next;
      });
    },
    [selectedArmyGroup, unitCountry]
  );

  const handleAddArmyGroup = useCallback(
    (country: CountryId, name: string, color: string) => {
      setArmyGroupDefs((prev) => ({
        ...prev,
        [country]: [...(prev[country] ?? []), { name, color }],
      }));
    },
    []
  );

  const handleRemoveArmyGroup = useCallback(
    (country: CountryId, name: string) => {
      setArmyGroupDefs((prev) => ({
        ...prev,
        [country]: (prev[country] ?? []).filter((g) => g.name !== name),
      }));
      // Also remove placements belonging to this group
      setUnitPlacement((prev) => {
        const next: UnitPlacementData = {};
        for (const [regionId, entries] of Object.entries(prev)) {
          const filtered = entries.filter(
            (e) => !(e.owner === country && e.armyGroupName === name)
          );
          if (filtered.length > 0) next[regionId] = filtered;
        }
        return next;
      });
    },
    []
  );

  // Reset painted regions when drag ends
  const handlePaintEnd = useCallback(() => {
    setPaintedRegionsInDrag(new Set());
  }, []);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((i) => i - 1);
      setOwnership(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((i) => i + 1);
      setOwnership(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);

  // Save handler
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Save ownership
      const ownershipResponse = await fetch("/api/map-tool/save-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownership, format: "typescript" }),
      });

      const ownershipResult = await ownershipResponse.json();
      
      // Save core regions
      const coreRegionsResponse = await fetch("/api/map-tool/save-core-regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coreRegions }),
      });

      const coreRegionsResult = await coreRegionsResponse.json();

      // Save unit placement
      const unitPlacementResponse = await fetch("/api/map-tool/save-unit-placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placement: unitPlacement, armyGroupDefs }),
      });

      const unitPlacementResult = await unitPlacementResponse.json();
      
      if (ownershipResult.success && coreRegionsResult.success && unitPlacementResult.success) {
        alert(`Successfully saved!\nOwnership: ${ownershipResult.message}\nCore Regions: ${coreRegionsResult.message}\nUnit Placement: ${unitPlacementResult.message}`);
        setOriginalOwnership({ ...ownership });
        setOriginalCoreRegions({ ...coreRegions });
        setOriginalUnitPlacement({ ...unitPlacement });
        setOriginalArmyGroupDefs({ ...armyGroupDefs });
        setHistory([ownership]);
        setHistoryIndex(0);
      } else {
        const errors = [];
        if (!ownershipResult.success) errors.push(`Ownership: ${ownershipResult.message}`);
        if (!coreRegionsResult.success) errors.push(`Core Regions: ${coreRegionsResult.message}`);
        if (!unitPlacementResult.success) errors.push(`Unit Placement: ${unitPlacementResult.message}`);
        alert(`Save failed:\n${errors.join('\n')}`);
      }
    } catch (error) {
      alert(
        `Save error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  }, [ownership, coreRegions, unitPlacement, armyGroupDefs, setOriginalCoreRegions]);

  // Reset to original
  const handleReset = useCallback(() => {
    if (confirm("Reset all changes to original ownership, core regions, and unit placement?")) {
      setOwnership({ ...originalOwnership });
      setCoreRegions({ ...originalCoreRegions });
      setUnitPlacement({ ...originalUnitPlacement });
      setArmyGroupDefs({ ...originalArmyGroupDefs });
      setHistory([{ ...originalOwnership }]);
      setHistoryIndex(0);
    }
  }, [originalOwnership, originalCoreRegions, originalUnitPlacement, originalArmyGroupDefs, setCoreRegions]);

  // Generate adjacency
  const handleGenerateAdjacency = useCallback(async () => {
    if (!geojson) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/map-tool/generate-adjacency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geojson,
          options: { bufferKm: 2, detectIsolated: true },
        }),
      });

      const result = await response.json();
      if (result.adjacency) {
        setAdjacency(result.adjacency);
        alert(
          `Adjacency generated!\nRegions: ${result.stats.totalRegions}\nConnections: ${result.stats.totalConnections}\nIsolated: ${result.stats.isolatedRegions.length}`
        );
      }
    } catch (error) {
      alert(
        `Adjacency generation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  }, [geojson]);

  const hasUnitPlacementChanges =
    JSON.stringify(unitPlacement) !== JSON.stringify(originalUnitPlacement) ||
    JSON.stringify(armyGroupDefs) !== JSON.stringify(originalArmyGroupDefs);

  const hasChanges =
    JSON.stringify(ownership) !== JSON.stringify(originalOwnership) ||
    JSON.stringify(coreRegions) !== JSON.stringify(originalCoreRegions) ||
    hasUnitPlacementChanges;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z: Redo
      else if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl/Cmd + S: Save
      else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges) {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleSave, hasChanges]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-900 text-white">
      <GeoJSONLoader onLoad={handleGeoJSONLoad} isLoading={isLoading} />
      
      <MapToolHeader
        hasChanges={hasChanges}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        geojson={geojson}
        adjacency={adjacency}
        showAdjacency={showAdjacency}
        isLoading={isLoading}
        onGenerateAdjacency={handleGenerateAdjacency}
        onShowAdjacencyChange={setShowAdjacency}
        editMode={editMode}
        isPaintEnabled={isPaintEnabled}
        onEditModeChange={setEditMode}
        onPaintToggle={() => setIsPaintEnabled(!isPaintEnabled)}
        ownership={ownership}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={handleReset}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        {geojson && (
          <aside className="flex w-80 flex-col overflow-y-auto border-r border-gray-700 bg-gray-800 p-4">
            {editMode === 'units' ? (
              <UnitPlacementPanel
                selectedCountry={unitCountry}
                onSelectCountry={setUnitCountry}
                selectedArmyGroup={selectedArmyGroup}
                onSelectArmyGroup={setSelectedArmyGroup}
                armyGroups={armyGroupDefs}
                onAddArmyGroup={handleAddArmyGroup}
                onRemoveArmyGroup={handleRemoveArmyGroup}
                placement={unitPlacement}
              />
            ) : (
              <CountryPalette
                selectedCountry={selectedCountry}
                onSelectCountry={setSelectedCountry}
              />
            )}
          </aside>
        )}

        {/* Map canvas */}
        <main className="flex-1">
          {geojson ? (
            <MapToolCanvas
              geojson={geojson}
              ownership={ownership}
              selectedCountry={editMode === 'units' ? unitCountry : selectedCountry}
              adjacency={adjacency}
              showAdjacency={showAdjacency}
              isPaintEnabled={editMode !== 'units' && isPaintEnabled}
              editMode={editMode}
              coreRegions={coreRegions}
              unitPlacement={unitPlacement}
              selectedArmyGroup={selectedArmyGroup}
              unitCountry={unitCountry}
              armyGroupDefs={armyGroupDefs}
              onRegionPaint={handleRegionPaint}
              onRegionHover={() => {}}
              onCountryPick={editMode === 'units' ? setUnitCountry : setSelectedCountry}
              onPaintEnd={handlePaintEnd}
              onRegionUnitAdd={handleRegionUnitAdd}
              onRegionUnitRemove={handleRegionUnitRemove}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg">No GeoJSON loaded</p>
                <p className="text-sm">
                  Upload a file or fetch from URL to begin
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

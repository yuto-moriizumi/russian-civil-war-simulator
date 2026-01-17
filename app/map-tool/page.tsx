"use client";

import { useState, useCallback, useEffect } from "react";
import type { FeatureCollection } from "geojson";
import { CountryId } from "../types/game";
import MapToolCanvas from "./components/MapToolCanvas";
import GeoJSONLoader from "./components/GeoJSONLoader";
import CountryPalette from "./components/CountryPalette";
import ExportPanel from "./components/ExportPanel";

export default function MapToolPage() {
  // Data state
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [geojsonSource, setGeojsonSource] = useState<string>("");
  const [ownership, setOwnership] = useState<Record<string, CountryId>>({});
  const [originalOwnership, setOriginalOwnership] = useState<
    Record<string, CountryId>
  >({});
  const [adjacency, setAdjacency] = useState<Record<string, string[]> | null>(
    null
  );
  const [coreRegions, setCoreRegions] = useState<Record<CountryId, string[]>>({} as Record<CountryId, string[]>);
  const [originalCoreRegions, setOriginalCoreRegions] = useState<Record<CountryId, string[]>>({} as Record<CountryId, string[]>);

  // UI state
  const [selectedCountry, setSelectedCountry] = useState<CountryId>("soviet");
  const [showAdjacency, setShowAdjacency] = useState(false);
  const [isPaintEnabled, setIsPaintEnabled] = useState(false);
  const [editMode, setEditMode] = useState<'ownership' | 'core'>('ownership');

  // History state
  const [history, setHistory] = useState<Record<string, CountryId>[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load initial ownership and core regions data from API (bypasses module caching)
  useEffect(() => {
    const loadInitialOwnership = async () => {
      try {
        const response = await fetch('/api/map-tool/load-ownership');
        if (!response.ok) throw new Error('Failed to load ownership data');
        const data = await response.json() as { ownership: Record<string, CountryId> };
        return data.ownership || {};
      } catch (error) {
        console.error('Error loading ownership:', error);
        return {};
      }
    };

    const loadInitialCoreRegions = async () => {
      try {
        const response = await fetch('/api/map-tool/load-core-regions');
        if (!response.ok) throw new Error('Failed to load core regions data');
        const data = await response.json() as { coreRegions: Record<CountryId, string[]> };
        return data.coreRegions || {} as Record<CountryId, string[]>;
      } catch (error) {
        console.error('Error loading core regions:', error);
        return {} as Record<CountryId, string[]>;
      }
    };

    Promise.all([loadInitialOwnership(), loadInitialCoreRegions()]).then(([initialOwnership, initialCoreRegions]) => {
      // Store for later use in GeoJSON handler
      const win = window as unknown as { 
        __initialRegionOwnership?: Record<string, CountryId>;
        __initialCoreRegions?: Record<CountryId, string[]>;
      };
      win.__initialRegionOwnership = initialOwnership;
      win.__initialCoreRegions = initialCoreRegions;
      
      // Initialize core regions state
      setCoreRegions(initialCoreRegions as Record<CountryId, string[]>);
      setOriginalCoreRegions({ ...initialCoreRegions } as Record<CountryId, string[]>);
    });
  }, []);

  // Load GeoJSON handler
  const handleGeoJSONLoad = useCallback(
    (data: FeatureCollection, source: string) => {
      setGeojson(data);
      setGeojsonSource(source);

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

  // Paint handler
  const handleRegionPaint = useCallback(
    (regionId: string) => {
      if (!selectedCountry) return;

      if (editMode === 'ownership') {
        setOwnership((prev) => {
          const updated = { ...prev, [regionId]: selectedCountry };

          // Add to history
          setHistory((h) => [...h.slice(0, historyIndex + 1), updated]);
          setHistoryIndex((i) => i + 1);

          return updated;
        });
      } else if (editMode === 'core') {
        setCoreRegions((prev) => {
          const updated = { ...prev };
          const countryRegions = updated[selectedCountry] || [];
          
          // Toggle core region
          if (countryRegions.includes(regionId)) {
            // Remove from core regions
            updated[selectedCountry] = countryRegions.filter(r => r !== regionId);
          } else {
            // Add to core regions
            updated[selectedCountry] = [...countryRegions, regionId];
          }
          
          return updated;
        });
      }
    },
    [selectedCountry, historyIndex, editMode]
  );

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
      
      if (ownershipResult.success && coreRegionsResult.success) {
        alert(`Successfully saved!\nOwnership: ${ownershipResult.message}\nCore Regions: ${coreRegionsResult.message}`);
        setOriginalOwnership({ ...ownership });
        setOriginalCoreRegions({ ...coreRegions });
        setHistory([ownership]);
        setHistoryIndex(0);
      } else {
        const errors = [];
        if (!ownershipResult.success) errors.push(`Ownership: ${ownershipResult.message}`);
        if (!coreRegionsResult.success) errors.push(`Core Regions: ${coreRegionsResult.message}`);
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
  }, [ownership, coreRegions]);

  // Reset to original
  const handleReset = useCallback(() => {
    if (confirm("Reset all changes to original ownership and core regions?")) {
      setOwnership({ ...originalOwnership });
      setCoreRegions({ ...originalCoreRegions });
      setHistory([{ ...originalOwnership }]);
      setHistoryIndex(0);
    }
  }, [originalOwnership, originalCoreRegions]);

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

  const hasChanges =
    JSON.stringify(ownership) !== JSON.stringify(originalOwnership) ||
    JSON.stringify(coreRegions) !== JSON.stringify(originalCoreRegions);
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
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Map Tool</h1>
          <p className="text-sm text-gray-400">
            {geojsonSource || "No GeoJSON loaded"}
            {hasChanges && (
              <span className="ml-2 text-yellow-400">• Unsaved changes</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 disabled:opacity-50"
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 disabled:opacity-50"
            title="Redo (Ctrl+Shift+Z)"
          >
            ↷ Redo
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className="flex w-80 flex-col gap-4 overflow-y-auto border-r border-gray-700 bg-gray-800 p-4">
          <GeoJSONLoader onLoad={handleGeoJSONLoad} isLoading={isLoading} />

          {geojson && (
            <>
              <div className="rounded border border-gray-700 bg-gray-900 p-3">
                <h3 className="mb-2 text-sm font-semibold">GeoJSON Info</h3>
                <p className="text-xs text-gray-400">
                  Features: {geojson.features.length}
                </p>
                <button
                  onClick={handleGenerateAdjacency}
                  disabled={isLoading}
                  className="mt-2 w-full rounded bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
                >
                  {isLoading ? "Generating..." : "Generate Adjacency"}
                </button>
                {adjacency && (
                  <label className="mt-2 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={showAdjacency}
                      onChange={(e) => setShowAdjacency(e.target.checked)}
                    />
                    Show adjacency on hover
                  </label>
                )}
              </div>

              <CountryPalette
                selectedCountry={selectedCountry}
                onSelectCountry={setSelectedCountry}
              />

              <div className="rounded border border-gray-700 bg-gray-900 p-3">
                <h3 className="mb-2 text-sm font-semibold">Edit Mode</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEditMode('ownership')}
                    className={`rounded px-3 py-2 text-sm transition-colors ${
                      editMode === 'ownership'
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    }`}
                  >
                    Ownership
                  </button>
                  <button
                    onClick={() => setEditMode('core')}
                    className={`rounded px-3 py-2 text-sm transition-colors ${
                      editMode === 'core'
                        ? "bg-purple-600 text-white"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    }`}
                  >
                    Core States
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  {editMode === 'ownership' 
                    ? "Paint regions to assign ownership" 
                    : "Paint regions to toggle core states"}
                </p>
              </div>

              <div className="rounded border border-gray-700 bg-gray-900 p-3">
                <h3 className="mb-2 text-sm font-semibold">Paint Mode</h3>
                <button
                  onClick={() => setIsPaintEnabled(!isPaintEnabled)}
                  className={`w-full rounded px-3 py-2 text-sm ${
                    isPaintEnabled
                      ? "bg-green-600 hover:bg-green-500"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  {isPaintEnabled ? "✓ Paint Enabled" : "Paint Disabled"}
                </button>
                <p className="mt-2 text-xs text-gray-400">
                  {isPaintEnabled
                    ? "Click regions to paint"
                    : "Toggle on to enable painting"}
                </p>
              </div>

              <ExportPanel
                ownership={ownership}
                hasChanges={hasChanges}
                isSaving={isSaving}
                onSave={handleSave}
                onReset={handleReset}
              />
            </>
          )}
        </aside>

        {/* Map canvas */}
        <main className="flex-1">
          {geojson ? (
            <MapToolCanvas
              geojson={geojson}
              ownership={ownership}
              selectedCountry={selectedCountry}
              adjacency={adjacency}
              showAdjacency={showAdjacency}
              isPaintEnabled={isPaintEnabled}
              editMode={editMode}
              coreRegions={coreRegions}
              onRegionPaint={handleRegionPaint}
              onRegionHover={() => {}}
              onCountryPick={setSelectedCountry}
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

"use client";

import { useState, useCallback, useEffect } from "react";
import type { FeatureCollection } from "geojson";
import { CountryId } from "../types/game";
import MapToolCanvas from "./components/MapToolCanvas";
import GeoJSONLoader from "./components/GeoJSONLoader";
import CountryPalette from "./components/CountryPalette";
import MapToolHeader from "./components/MapToolHeader";
import { useMapToolData } from "./hooks/useMapToolData";

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
  const { coreRegions, originalCoreRegions, setCoreRegions, setOriginalCoreRegions } = useMapToolData();

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
        // Use a timeout to debounce rapid state updates
        setCoreRegions((prev) => {
          const updated = { ...prev };
          const countryRegions = updated[selectedCountry] || [];
          
          // Toggle core region
          if (countryRegions.includes(regionId)) {
            // Remove from core regions
            updated[selectedCountry] = countryRegions.filter(r => r !== regionId);
            console.log(`Removed ${regionId} from ${selectedCountry} core regions. Now:`, updated[selectedCountry]);
          } else {
            // Add to core regions
            updated[selectedCountry] = [...countryRegions, regionId];
            console.log(`Added ${regionId} to ${selectedCountry} core regions. Now:`, updated[selectedCountry]);
          }
          
          return updated;
        });
      }
    },
    [selectedCountry, historyIndex, editMode, setCoreRegions]
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
  }, [ownership, coreRegions, setOriginalCoreRegions]);

  // Reset to original
  const handleReset = useCallback(() => {
    if (confirm("Reset all changes to original ownership and core regions?")) {
      setOwnership({ ...originalOwnership });
      setCoreRegions({ ...originalCoreRegions });
      setHistory([{ ...originalOwnership }]);
      setHistoryIndex(0);
    }
  }, [originalOwnership, originalCoreRegions, setCoreRegions]);

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
        {/* Left sidebar - Only Country Palette */}
        {geojson && (
          <aside className="flex w-80 flex-col overflow-y-auto border-r border-gray-700 bg-gray-800 p-4">
            <CountryPalette
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
            />
          </aside>
        )}

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

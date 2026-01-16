'use client';

import { useState, useCallback, useEffect } from 'react';
import type { FeatureCollection } from 'geojson';
import { CountryId } from '../types/game';
import MapToolCanvas from './components/MapToolCanvas';
import GeoJSONLoader from './components/GeoJSONLoader';
import CountryPalette from './components/CountryPalette';
import ExportPanel from './components/ExportPanel';
import { initialRegionOwnership } from '../data/map/initialOwnership';

export default function MapToolPage() {
  // Data state
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [geojsonSource, setGeojsonSource] = useState<string>('');
  const [ownership, setOwnership] = useState<Record<string, CountryId>>({});
  const [originalOwnership, setOriginalOwnership] = useState<Record<string, CountryId>>({});
  const [adjacency, setAdjacency] = useState<Record<string, string[]> | null>(null);
  
  // UI state
  const [selectedCountry, setSelectedCountry] = useState<CountryId>('soviet');
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [showAdjacency, setShowAdjacency] = useState(false);
  const [isPaintEnabled, setIsPaintEnabled] = useState(false);
  
  // History state
  const [history, setHistory] = useState<Record<string, CountryId>[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load GeoJSON handler
  const handleGeoJSONLoad = useCallback((data: FeatureCollection, source: string) => {
    setGeojson(data);
    setGeojsonSource(source);
    
    // Initialize ownership from features or use default
    const newOwnership: Record<string, CountryId> = {};
    data.features.forEach((feature) => {
      const regionId = feature.properties?.regionId || feature.properties?.shapeISO;
      if (regionId) {
        // Try to get existing ownership, fallback to neutral
        newOwnership[regionId] = (initialRegionOwnership[regionId] as CountryId) || 'neutral';
      }
    });
    
    setOwnership(newOwnership);
    setOriginalOwnership({ ...newOwnership });
    setHistory([{ ...newOwnership }]);
    setHistoryIndex(0);
  }, []);

  // Paint handler
  const handleRegionPaint = useCallback((regionId: string) => {
    if (!selectedCountry) return;
    
    setOwnership((prev) => {
      const updated = { ...prev, [regionId]: selectedCountry };
      
      // Add to history
      setHistory((h) => [...h.slice(0, historyIndex + 1), updated]);
      setHistoryIndex((i) => i + 1);
      
      return updated;
    });
  }, [selectedCountry, historyIndex]);

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
  const handleSave = useCallback(async (format: 'json' | 'typescript') => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/map-tool/save-ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownership, format }),
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`Successfully saved!\n${result.message}`);
        setOriginalOwnership({ ...ownership });
        setHistory([ownership]);
        setHistoryIndex(0);
      } else {
        alert(`Save failed: ${result.message}`);
      }
    } catch (error) {
      alert(`Save error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }, [ownership]);

  // Export JSON to download
  const handleExportJSON = useCallback(() => {
    const dataStr = JSON.stringify(ownership, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ownership-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [ownership]);

  // Reset to original
  const handleReset = useCallback(() => {
    if (confirm('Reset all changes to original ownership?')) {
      setOwnership({ ...originalOwnership });
      setHistory([{ ...originalOwnership }]);
      setHistoryIndex(0);
    }
  }, [originalOwnership]);

  // Generate adjacency
  const handleGenerateAdjacency = useCallback(async () => {
    if (!geojson) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/map-tool/generate-adjacency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geojson, options: { bufferKm: 2, detectIsolated: true } }),
      });
      
      const result = await response.json();
      if (result.adjacency) {
        setAdjacency(result.adjacency);
        alert(`Adjacency generated!\nRegions: ${result.stats.totalRegions}\nConnections: ${result.stats.totalConnections}\nIsolated: ${result.stats.isolatedRegions.length}`);
      }
    } catch (error) {
      alert(`Adjacency generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [geojson]);

  const hasChanges = JSON.stringify(ownership) !== JSON.stringify(originalOwnership);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z: Redo
      else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl/Cmd + S: Save
      else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) {
          handleSave('typescript');
        }
      }
      // Ctrl/Cmd + E: Export JSON
      else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleExportJSON();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleSave, handleExportJSON, hasChanges]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Map Tool</h1>
          <p className="text-sm text-gray-400">
            {geojsonSource || 'No GeoJSON loaded'}
            {hasChanges && <span className="ml-2 text-yellow-400">• Unsaved changes</span>}
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
                  {isLoading ? 'Generating...' : 'Generate Adjacency'}
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
                <h3 className="mb-2 text-sm font-semibold">Paint Mode</h3>
                <button
                  onClick={() => setIsPaintEnabled(!isPaintEnabled)}
                  className={`w-full rounded px-3 py-2 text-sm ${
                    isPaintEnabled ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {isPaintEnabled ? '✓ Paint Enabled' : 'Paint Disabled'}
                </button>
                <p className="mt-2 text-xs text-gray-400">
                  {isPaintEnabled ? 'Click regions to paint' : 'Toggle on to enable painting'}
                </p>
              </div>

              <ExportPanel
                ownership={ownership}
                hasChanges={hasChanges}
                isSaving={isSaving}
                onSave={handleSave}
                onExportJSON={handleExportJSON}
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
              onRegionPaint={handleRegionPaint}
              onRegionHover={setHoveredRegion}
              onCountryPick={setSelectedCountry}
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

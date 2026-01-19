"use client";

import type { FeatureCollection } from "geojson";
import { CountryId } from "../../types/game";

interface MapToolHeaderProps {
  geojsonSource: string;
  hasChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // GeoJSON info props
  geojson: FeatureCollection | null;
  adjacency: Record<string, string[]> | null;
  showAdjacency: boolean;
  isLoading: boolean;
  onGenerateAdjacency: () => void;
  onShowAdjacencyChange: (show: boolean) => void;
  // Edit mode props
  editMode: 'ownership' | 'core';
  isPaintEnabled: boolean;
  onEditModeChange: (mode: 'ownership' | 'core') => void;
  onPaintToggle: () => void;
  // Export props
  ownership: Record<string, CountryId>;
  isSaving: boolean;
  onSave: () => Promise<void>;
  onReset: () => void;
}

export default function MapToolHeader({
  geojsonSource,
  hasChanges,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  geojson,
  adjacency,
  showAdjacency,
  isLoading,
  onGenerateAdjacency,
  onShowAdjacencyChange,
  editMode,
  isPaintEnabled,
  onEditModeChange,
  onPaintToggle,
  ownership,
  isSaving,
  onSave,
  onReset,
}: MapToolHeaderProps) {
  return (
    <header className="border-b border-gray-700 bg-gray-800">
      {/* Top row - Title and undo/redo */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700">
        <div>
          <h1 className="text-xl font-bold">Map Tool</h1>
          <p className="text-xs text-gray-400">
            {geojsonSource || "No GeoJSON loaded"}
            {hasChanges && (
              <span className="ml-2 text-yellow-400">• Unsaved changes</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 disabled:opacity-50"
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 disabled:opacity-50"
            title="Redo (Ctrl+Shift+Z)"
          >
            ↷ Redo
          </button>
        </div>
      </div>

      {/* Bottom row - Tools */}
      {geojson && (
        <div className="flex items-center gap-4 px-6 py-3 overflow-x-auto">
          {/* GeoJSON Info */}
          <div className="flex items-center gap-3 border-r border-gray-700 pr-4">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              Features: {geojson.features.length}
            </span>
            <button
              onClick={onGenerateAdjacency}
              disabled={isLoading}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap"
            >
              {isLoading ? "Generating..." : "Generate Adjacency"}
            </button>
            {adjacency && (
              <label className="flex items-center gap-2 text-xs whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAdjacency}
                  onChange={(e) => onShowAdjacencyChange(e.target.checked)}
                />
                Show adjacency
              </label>
            )}
          </div>

          {/* Edit Mode */}
          <div className="flex items-center gap-2 border-r border-gray-700 pr-4">
            <span className="text-xs text-gray-400 whitespace-nowrap">Edit:</span>
            <button
              onClick={() => onEditModeChange('ownership')}
              className={`rounded px-3 py-1.5 text-xs transition-colors whitespace-nowrap ${
                editMode === 'ownership'
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              Ownership
            </button>
            <button
              onClick={() => onEditModeChange('core')}
              className={`rounded px-3 py-1.5 text-xs transition-colors whitespace-nowrap ${
                editMode === 'core'
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              Core Regions
            </button>
          </div>

          {/* Paint Mode */}
          <div className="flex items-center gap-2 border-r border-gray-700 pr-4">
            <button
              onClick={onPaintToggle}
              className={`rounded px-3 py-1.5 text-xs whitespace-nowrap ${
                isPaintEnabled
                  ? "bg-green-600 hover:bg-green-500"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              {isPaintEnabled ? "✓ Paint Enabled" : "Paint Disabled"}
            </button>
          </div>

          {/* Export & Save */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              Regions: {Object.keys(ownership).length}
            </span>
            <button
              onClick={onSave}
              disabled={!hasChanges || isSaving || Object.keys(ownership).length === 0}
              className="rounded bg-green-600 px-3 py-1.5 text-xs hover:bg-green-500 disabled:opacity-50 whitespace-nowrap"
            >
              {isSaving ? 'Saving...' : '💾 Save'}
            </button>
            <button
              onClick={onReset}
              disabled={!hasChanges}
              className="rounded border border-red-600 bg-transparent px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30 disabled:opacity-50 whitespace-nowrap"
            >
              ↺ Reset
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

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
      <div className="flex items-center gap-3 px-4 py-1.5 overflow-x-auto">
        {/* Title */}
        <div className="flex items-center gap-2 border-r border-gray-700 pr-3">
          <h1 className="text-sm font-bold whitespace-nowrap">Map Tool</h1>
          {hasChanges && (
            <span className="text-[11px] text-yellow-400">•</span>
          )}
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-1.5 border-r border-gray-700 pr-3">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded bg-gray-700 px-2 py-0.5 text-xs hover:bg-gray-600 disabled:opacity-50"
            title="Undo (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded bg-gray-700 px-2 py-0.5 text-xs hover:bg-gray-600 disabled:opacity-50"
            title="Redo (Ctrl+Shift+Z)"
          >
            ↷
          </button>
        </div>

        {/* Tools - only shown when GeoJSON is loaded */}
        {geojson && (
          <>
            {/* GeoJSON Info */}
            <div className="flex items-center gap-2 border-r border-gray-700 pr-3">
              <span className="text-[11px] text-gray-400 whitespace-nowrap">
                {geojson.features.length}
              </span>
              <button
                onClick={onGenerateAdjacency}
                disabled={isLoading}
                className="rounded bg-blue-600 px-2 py-0.5 text-[11px] hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap"
              >
                {isLoading ? "Gen..." : "Adjacency"}
              </button>
              {adjacency && (
                <label className="flex items-center gap-1.5 text-[11px] whitespace-nowrap cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAdjacency}
                    onChange={(e) => onShowAdjacencyChange(e.target.checked)}
                    className="scale-75"
                  />
                  Show
                </label>
              )}
            </div>

            {/* Edit Mode */}
            <div className="flex items-center gap-1.5 border-r border-gray-700 pr-3">
              <button
                onClick={() => onEditModeChange('ownership')}
                className={`rounded px-2 py-0.5 text-[11px] transition-colors whitespace-nowrap ${
                  editMode === 'ownership'
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                }`}
              >
                Ownership
              </button>
              <button
                onClick={() => onEditModeChange('core')}
                className={`rounded px-2 py-0.5 text-[11px] transition-colors whitespace-nowrap ${
                  editMode === 'core'
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                }`}
              >
                Core
              </button>
            </div>

            {/* Paint Mode */}
            <div className="flex items-center gap-2 border-r border-gray-700 pr-3">
              <button
                onClick={onPaintToggle}
                className={`rounded px-2 py-0.5 text-[11px] whitespace-nowrap ${
                  isPaintEnabled
                    ? "bg-green-600 hover:bg-green-500"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {isPaintEnabled ? "✓ Paint" : "Paint"}
              </button>
            </div>

            {/* Save & Reset */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[11px] text-gray-400 whitespace-nowrap">
                {Object.keys(ownership).length}
              </span>
              <button
                onClick={onSave}
                disabled={!hasChanges || isSaving || Object.keys(ownership).length === 0}
                className="rounded bg-green-600 px-2 py-0.5 text-[11px] hover:bg-green-500 disabled:opacity-50 whitespace-nowrap"
              >
                {isSaving ? 'Saving...' : '💾'}
              </button>
              <button
                onClick={onReset}
                disabled={!hasChanges}
                className="rounded border border-red-600 bg-transparent px-2 py-0.5 text-[11px] text-red-400 hover:bg-red-900/30 disabled:opacity-50 whitespace-nowrap"
                title="Reset"
              >
                ↺
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

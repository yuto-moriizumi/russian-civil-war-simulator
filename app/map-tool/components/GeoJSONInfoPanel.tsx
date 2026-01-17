"use client";

import type { FeatureCollection } from "geojson";

interface GeoJSONInfoPanelProps {
  geojson: FeatureCollection;
  adjacency: Record<string, string[]> | null;
  showAdjacency: boolean;
  isLoading: boolean;
  onGenerateAdjacency: () => void;
  onShowAdjacencyChange: (show: boolean) => void;
}

export default function GeoJSONInfoPanel({
  geojson,
  adjacency,
  showAdjacency,
  isLoading,
  onGenerateAdjacency,
  onShowAdjacencyChange,
}: GeoJSONInfoPanelProps) {
  return (
    <div className="rounded border border-gray-700 bg-gray-900 p-3">
      <h3 className="mb-2 text-sm font-semibold">GeoJSON Info</h3>
      <p className="text-xs text-gray-400">
        Features: {geojson.features.length}
      </p>
      <button
        onClick={onGenerateAdjacency}
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
            onChange={(e) => onShowAdjacencyChange(e.target.checked)}
          />
          Show adjacency on hover
        </label>
      )}
    </div>
  );
}

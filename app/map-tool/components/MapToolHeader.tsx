"use client";

interface MapToolHeaderProps {
  geojsonSource: string;
  hasChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export default function MapToolHeader({
  geojsonSource,
  hasChanges,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: MapToolHeaderProps) {
  return (
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
    </header>
  );
}

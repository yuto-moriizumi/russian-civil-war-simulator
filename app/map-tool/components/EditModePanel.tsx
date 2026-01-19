"use client";

interface EditModePanelProps {
  editMode: 'ownership' | 'core';
  isPaintEnabled: boolean;
  onEditModeChange: (mode: 'ownership' | 'core') => void;
  onPaintToggle: () => void;
}

export default function EditModePanel({
  editMode,
  isPaintEnabled,
  onEditModeChange,
  onPaintToggle,
}: EditModePanelProps) {
  return (
    <>
      <div className="rounded border border-gray-700 bg-gray-900 p-3">
        <h3 className="mb-2 text-sm font-semibold">Edit Mode</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onEditModeChange('ownership')}
            className={`rounded px-3 py-2 text-sm transition-colors ${
              editMode === 'ownership'
                ? "bg-blue-600 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
            }`}
          >
            Ownership
          </button>
          <button
            onClick={() => onEditModeChange('core')}
            className={`rounded px-3 py-2 text-sm transition-colors ${
              editMode === 'core'
                ? "bg-purple-600 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
            }`}
          >
            Core Regions
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {editMode === 'ownership' 
            ? "Paint regions to assign ownership" 
            : "Paint regions to toggle core regions"}
        </p>
      </div>

      <div className="rounded border border-gray-700 bg-gray-900 p-3">
        <h3 className="mb-2 text-sm font-semibold">Paint Mode</h3>
        <button
          onClick={onPaintToggle}
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
    </>
  );
}

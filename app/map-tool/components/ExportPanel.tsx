'use client';

import { CountryId } from '../../types/game';

interface ExportPanelProps {
  ownership: Record<string, CountryId>;
  hasChanges: boolean;
  isSaving: boolean;
  onSave: (format: 'json' | 'typescript') => Promise<void>;
  onExportJSON: () => void;
  onReset: () => void;
}

export default function ExportPanel({
  ownership,
  hasChanges,
  isSaving,
  onSave,
  onExportJSON,
  onReset,
}: ExportPanelProps) {
  return (
    <div className="rounded border border-gray-700 bg-gray-900 p-3">
      <h3 className="mb-3 text-sm font-semibold">Export & Save</h3>

      {/* Stats */}
      <div className="mb-3 space-y-1 text-xs text-gray-400">
        <div>Total regions: {Object.keys(ownership).length}</div>
        {hasChanges && (
          <div className="text-yellow-400">• Unsaved changes</div>
        )}
      </div>

      {/* Export JSON (download) */}
      <button
        onClick={onExportJSON}
        disabled={Object.keys(ownership).length === 0}
        className="mb-2 w-full rounded bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600 disabled:opacity-50"
      >
        📥 Export JSON
      </button>

      {/* Save to TypeScript files (dev only) */}
      <button
        onClick={() => onSave('typescript')}
        disabled={!hasChanges || isSaving || Object.keys(ownership).length === 0}
        className="mb-2 w-full rounded bg-green-600 px-3 py-2 text-sm hover:bg-green-500 disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : '💾 Save to TypeScript Files'}
      </button>

      {/* Save as JSON file (dev only) */}
      <button
        onClick={() => onSave('json')}
        disabled={!hasChanges || isSaving || Object.keys(ownership).length === 0}
        className="mb-3 w-full rounded bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : '💾 Save as JSON'}
      </button>

      {/* Reset */}
      <button
        onClick={onReset}
        disabled={!hasChanges}
        className="w-full rounded border border-red-600 bg-transparent px-3 py-2 text-sm text-red-400 hover:bg-red-900/30 disabled:opacity-50"
      >
        ↺ Reset Changes
      </button>

      {/* Info */}
      <div className="mt-3 rounded bg-gray-800 p-2 text-[10px] text-gray-500">
        <div className="font-semibold text-gray-400">Dev mode only:</div>
        <div>• TypeScript: Writes to app/data/map/ownership/</div>
        <div>• JSON: Downloads file for manual integration</div>
      </div>
    </div>
  );
}

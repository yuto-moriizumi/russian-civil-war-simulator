'use client';

import { useState } from 'react';
import { ArmyGroup, RegionState, FactionId, Movement } from '../types/game';
import { getArmyGroupUnitCount } from '../utils/pathfinding';

interface ArmyGroupsPanelProps {
  armyGroups: ArmyGroup[];
  regions: RegionState;
  playerFaction: FactionId;
  selectedGroupId: string | null;
  isExpanded: boolean;
  movingUnits: Movement[];
  onToggleExpanded: () => void;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onSelectGroup: (groupId: string | null) => void;
  onAdvanceGroup: (groupId: string) => void;
  onDefendGroup: (groupId: string) => void;
  onSetGroupMode: (groupId: string, mode: 'none' | 'advance' | 'defend') => void;
}

export default function ArmyGroupsPanel({
  armyGroups,
  regions,
  playerFaction,
  selectedGroupId,
  isExpanded,
  movingUnits,
  onToggleExpanded,
  onDeleteGroup,
  onRenameGroup,
  onSelectGroup,
  onAdvanceGroup,
  onDefendGroup,
  onSetGroupMode,
}: ArmyGroupsPanelProps) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartRename = (group: ArmyGroup) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
  };

  const handleFinishRename = () => {
    if (editingGroupId && editingName.trim()) {
      onRenameGroup(editingGroupId, editingName.trim());
    }
    setEditingGroupId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishRename();
    } else if (e.key === 'Escape') {
      setEditingGroupId(null);
      setEditingName('');
    }
  };

  return (
    <div className="border-t border-stone-700 bg-stone-900/95">
      {/* Header - always visible */}
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-2 hover:bg-stone-800/50"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-wider text-stone-400">
            ARMY GROUPS
          </span>
          <span className="rounded bg-stone-700 px-2 py-0.5 text-xs text-stone-300">
            {armyGroups.length}
          </span>
        </div>
        <span className="text-stone-400">
          {isExpanded ? '▼' : '▲'}
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-stone-700 px-4 py-3">
          {/* Army groups list */}
          {armyGroups.length === 0 ? (
            <div className="py-4 text-center text-sm text-stone-500">
              No army groups yet. Use the Theater panel to create groups from frontline regions.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {armyGroups.map((group) => {
                const unitCount = getArmyGroupUnitCount(group.regionIds, regions, playerFaction, group.id, movingUnits);
                const isSelected = selectedGroupId === group.id;

                return (
                  <div
                    key={group.id}
                    className={`flex items-center gap-2 rounded border p-2 transition-colors ${
                      isSelected
                        ? 'border-white bg-stone-700'
                        : 'border-stone-600 bg-stone-800 hover:border-stone-500'
                    }`}
                    onClick={() => onSelectGroup(isSelected ? null : group.id)}
                  >
                    {/* Color indicator */}
                    <div
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: group.color }}
                    />

                    {/* Group name (editable on double-click) */}
                    {editingGroupId === group.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleFinishRename}
                        autoFocus
                        className="w-24 rounded border border-stone-500 bg-stone-700 px-1 py-0.5 text-sm text-white focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="cursor-pointer text-sm font-semibold text-white"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(group);
                        }}
                        title="Double-click to rename"
                      >
                        {group.name}
                      </span>
                    )}

                    {/* Advance Mode Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle between 'advance' and 'none'
                        const newMode = group.mode === 'advance' ? 'none' : 'advance';
                        onSetGroupMode(group.id, newMode);
                      }}
                      disabled={unitCount === 0}
                      className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        group.mode === 'advance'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-green-900/30 text-green-400 hover:bg-green-800/50'
                      }`}
                      title={group.mode === 'advance' 
                        ? 'Auto-advance mode active (click to disable)' 
                        : 'Enable auto-advance mode (continuously advance toward enemy)'}
                    >
                      {group.mode === 'advance' ? '✓ Advance' : 'Advance'}
                    </button>

                    {/* Defend Mode Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle between 'defend' and 'none'
                        const newMode = group.mode === 'defend' ? 'none' : 'defend';
                        onSetGroupMode(group.id, newMode);
                      }}
                      disabled={unitCount === 0}
                      className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        group.mode === 'defend'
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-orange-900/30 text-orange-400 hover:bg-orange-800/50'
                      }`}
                      title={group.mode === 'defend' 
                        ? 'Auto-defend mode active (click to disable)' 
                        : 'Enable auto-defend mode (continuously position units at borders)'}
                    >
                      {group.mode === 'defend' ? '✓ Defend' : 'Defend'}
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteGroup(group.id);
                      }}
                      className="rounded bg-red-900/50 px-1.5 py-0.5 text-xs text-red-400 transition-colors hover:bg-red-800 hover:text-red-300"
                      title="Delete group"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Help text */}
          <div className="mt-3 text-xs text-stone-500">
            Toggle <strong>Advance</strong> mode to automatically move units toward enemies every game tick.
            Toggle <strong>Defend</strong> mode to automatically position units at border regions.
            Modes are mutually exclusive. <strong>Double-click</strong> a group name to rename it.
          </div>
        </div>
      )}
    </div>
  );
}

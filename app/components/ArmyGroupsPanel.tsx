'use client';

import { useState } from 'react';
import { ArmyGroup, RegionState, FactionId } from '../types/game';
import { getArmyGroupUnitCount } from '../utils/pathfinding';

interface ArmyGroupsPanelProps {
  armyGroups: ArmyGroup[];
  regions: RegionState;
  playerFaction: FactionId;
  multiSelectedRegions: string[];
  selectedGroupId: string | null;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onCreateGroup: (name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onSelectGroup: (groupId: string | null) => void;
  onAdvanceGroup: (groupId: string) => void;
  onClearMultiSelection: () => void;
}

export default function ArmyGroupsPanel({
  armyGroups,
  regions,
  playerFaction,
  multiSelectedRegions,
  selectedGroupId,
  isExpanded,
  onToggleExpanded,
  onCreateGroup,
  onDeleteGroup,
  onRenameGroup,
  onSelectGroup,
  onAdvanceGroup,
  onClearMultiSelection,
}: ArmyGroupsPanelProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreateGroup = () => {
    if (newGroupName.trim() && multiSelectedRegions.length > 0) {
      onCreateGroup(newGroupName.trim());
      setNewGroupName('');
    }
  };

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
      if (editingGroupId) {
        handleFinishRename();
      } else {
        handleCreateGroup();
      }
    } else if (e.key === 'Escape') {
      setEditingGroupId(null);
      setEditingName('');
    }
  };

  // Count valid regions (still owned by player)
  const getValidRegionCount = (regionIds: string[]) => {
    return regionIds.filter(id => {
      const region = regions[id];
      return region && region.owner === playerFaction;
    }).length;
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
          {multiSelectedRegions.length > 0 && (
            <span className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white">
              {multiSelectedRegions.length} regions selected (Shift+click)
            </span>
          )}
        </div>
        <span className="text-stone-400">
          {isExpanded ? '▼' : '▲'}
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-stone-700 px-4 py-3">
          {/* Create new group section */}
          {multiSelectedRegions.length > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded border border-blue-600/50 bg-blue-900/20 p-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter group name..."
                className="flex-1 rounded border border-stone-600 bg-stone-800 px-2 py-1 text-sm text-white placeholder-stone-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
                className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create Group
              </button>
              <button
                onClick={onClearMultiSelection}
                className="rounded bg-stone-700 px-2 py-1 text-sm text-stone-300 transition-colors hover:bg-stone-600"
                title="Clear selection"
              >
                ✕
              </button>
            </div>
          )}

          {/* Army groups list */}
          {armyGroups.length === 0 ? (
            <div className="py-4 text-center text-sm text-stone-500">
              No army groups yet. Shift+click regions to select, then create a group.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {armyGroups.map((group) => {
                const unitCount = getArmyGroupUnitCount(group.regionIds, regions, playerFaction);
                const validRegions = getValidRegionCount(group.regionIds);
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

                    {/* Stats */}
                    <div className="flex items-center gap-1 text-xs text-stone-400">
                      <span title="Regions">{validRegions}R</span>
                      <span>|</span>
                      <span title="Divisions">{unitCount}D</span>
                    </div>

                    {/* Advance button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdvanceGroup(group.id);
                      }}
                      disabled={unitCount === 0}
                      className="rounded bg-green-700 px-2 py-0.5 text-xs font-semibold text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Advance all units toward enemy"
                    >
                      Advance
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
            <strong>Shift+click</strong> regions to select them, then create a group.
            Click <strong>Advance</strong> to move all units toward the nearest enemy.
          </div>
        </div>
      )}
    </div>
  );
}

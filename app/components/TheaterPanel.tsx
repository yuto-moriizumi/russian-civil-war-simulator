'use client';

import { useState } from 'react';
import { Theater, ArmyGroup, RegionState, FactionId } from '../types/game';
import { getArmyGroupUnitCount } from '../utils/pathfinding';

interface TheaterPanelProps {
  theaters: Theater[];
  armyGroups: ArmyGroup[];
  regions: RegionState;
  playerFaction: FactionId;
  selectedTheaterId: string | null;
  selectedGroupId: string | null;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onSelectTheater: (theaterId: string | null) => void;
  onCreateGroup: (name: string, regionIds: string[], theaterId: string | null) => void;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onSelectGroup: (groupId: string | null) => void;
  onAdvanceGroup: (groupId: string) => void;
  onDeployToGroup: (groupId: string) => void;
}

export default function TheaterPanel({
  theaters,
  armyGroups,
  regions,
  playerFaction,
  selectedTheaterId,
  selectedGroupId,
  isExpanded,
  onToggleExpanded,
  onSelectTheater,
  onCreateGroup,
  onDeleteGroup,
  onRenameGroup,
  onSelectGroup,
  onAdvanceGroup,
  onDeployToGroup,
}: TheaterPanelProps) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const theaterGroups = selectedTheaterId 
    ? armyGroups.filter(g => g.theaterId === selectedTheaterId)
    : armyGroups.filter(g => g.theaterId === null);

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

  const handleCreateGroupForTheater = (theater: Theater) => {
    // Select the theater first
    onSelectTheater(theater.id);
    // Get all valid frontline regions in this theater
    const validRegions: string[] = [];
    theater.frontlineRegions.forEach(regionId => {
      const region = regions[regionId];
      if (region && region.owner === playerFaction) {
        validRegions.push(regionId);
      }
    });
    // Create the group if we have valid regions
    if (validRegions.length > 0) {
      onCreateGroup('', validRegions, theater.id);
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
            THEATERS OF OPERATION
          </span>
          <span className="rounded bg-stone-700 px-2 py-0.5 text-xs text-stone-300">
            {theaters.length} {theaters.length === 1 ? 'Theater' : 'Theaters'}
          </span>
        </div>
        <span className="text-stone-400">
          {isExpanded ? '▼' : '▲'}
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-stone-700 px-4 py-3">
          {/* Theaters list */}
          {theaters.length === 0 ? (
            <div className="py-4 text-center text-sm text-stone-500">
              No active theaters detected. Deploy units near enemy borders to establish theaters of operation.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {theaters.map((theater) => {
                const isSelected = selectedTheaterId === theater.id;
                const groups = armyGroups.filter(g => g.theaterId === theater.id);

                return (
                  <div
                    key={theater.id}
                    className={`rounded border transition-colors ${
                      isSelected
                        ? 'border-amber-500 bg-stone-800'
                        : 'border-stone-600 bg-stone-800/50 hover:border-stone-500'
                    }`}
                  >
                    {/* Theater header */}
                    <div
                      className="flex cursor-pointer items-center justify-between p-3"
                      onClick={() => onSelectTheater(isSelected ? null : theater.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-lg">🎖️</div>
                        <div>
                          <div className="font-semibold text-white">{theater.name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateGroupForTheater(theater);
                          }}
                          className="rounded bg-green-700 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-green-600"
                          title="Create new army group in this theater"
                        >
                          + Create Group
                        </button>
                        {groups.length > 0 && (
                          <span className="rounded bg-green-700 px-2 py-0.5 text-xs text-white">
                            {groups.length} {groups.length === 1 ? 'Group' : 'Groups'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Army groups in this theater */}
                    {isSelected && groups.length > 0 && (
                      <div className="border-t border-stone-700 p-3">
                        <div className="mb-2 text-xs font-semibold text-stone-400">Army Groups:</div>
                        <div className="flex flex-wrap gap-2">
                          {groups.map((group) => {
                            const unitCount = getArmyGroupUnitCount(group.regionIds, regions, playerFaction);
                            const validRegions = group.regionIds.filter(id => {
                              const region = regions[id];
                              return region && region.owner === playerFaction;
                            }).length;
                            const isGroupSelected = selectedGroupId === group.id;

                            return (
                              <div
                                key={group.id}
                                className={`flex items-center gap-2 rounded border p-2 transition-colors ${
                                  isGroupSelected
                                    ? 'border-white bg-stone-700'
                                    : 'border-stone-600 bg-stone-800 hover:border-stone-500'
                                }`}
                                onClick={() => onSelectGroup(isGroupSelected ? null : group.id)}
                              >
                                {/* Color indicator */}
                                <div
                                  className="h-4 w-4 rounded"
                                  style={{ backgroundColor: group.color }}
                                />

                                {/* Group name */}
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

                                {/* Deploy button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeployToGroup(group.id);
                                  }}
                                  className="rounded bg-blue-700 px-2 py-0.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600"
                                  title="Create and deploy unit to this group ($10)"
                                >
                                  Deploy
                                </button>

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
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unassigned army groups */}
              {theaterGroups.length > 0 && selectedTheaterId === null && (
                <div className="rounded border border-stone-600 bg-stone-800/50 p-3">
                  <div className="mb-2 text-xs font-semibold text-stone-400">Unassigned Army Groups:</div>
                  <div className="flex flex-wrap gap-2">
                    {theaterGroups.map((group) => {
                      const unitCount = getArmyGroupUnitCount(group.regionIds, regions, playerFaction);
                      const validRegions = group.regionIds.filter(id => {
                        const region = regions[id];
                        return region && region.owner === playerFaction;
                      }).length;
                      const isGroupSelected = selectedGroupId === group.id;

                      return (
                        <div
                          key={group.id}
                          className={`flex items-center gap-2 rounded border p-2 ${
                            isGroupSelected
                              ? 'border-white bg-stone-700'
                              : 'border-stone-600 bg-stone-800'
                          }`}
                        >
                          <div className="h-4 w-4 rounded" style={{ backgroundColor: group.color }} />
                          <span className="text-sm font-semibold text-white">{group.name}</span>
                          <div className="flex items-center gap-1 text-xs text-stone-400">
                            <span>{validRegions}R</span>
                            <span>|</span>
                            <span>{unitCount}D</span>
                          </div>
                          <button
                            onClick={() => onDeployToGroup(group.id)}
                            className="rounded bg-blue-700 px-2 py-0.5 text-xs font-semibold text-white hover:bg-blue-600"
                            title="Create and deploy unit to this group ($10)"
                          >
                            Deploy
                          </button>
                          <button
                            onClick={() => onAdvanceGroup(group.id)}
                            disabled={unitCount === 0}
                            className="rounded bg-green-700 px-2 py-0.5 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50"
                          >
                            Advance
                          </button>
                          <button
                            onClick={() => onDeleteGroup(group.id)}
                            className="rounded bg-red-900/50 px-1.5 py-0.5 text-xs text-red-400 hover:bg-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Help text */}
          <div className="mt-3 text-xs text-stone-500">
            <strong>Theaters</strong> are auto-detected frontline regions facing enemies.
            Click <strong>&quot;+ Create Group&quot;</strong> on a theater to instantly create an army group with an auto-generated name.
            <strong>Double-click</strong> a group name to rename it.
            <br />
            <strong>Tip:</strong> New units are automatically deployed to the selected army group or region.
          </div>
        </div>
      )}
    </div>
  );
}

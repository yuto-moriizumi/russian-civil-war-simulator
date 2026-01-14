'use client';

import { useState } from 'react';
import { Theater, ArmyGroup, RegionState, FactionId, Movement } from '../types/game';
import { getArmyGroupUnitCount } from '../utils/pathfinding';

interface TheaterPanelProps {
  theaters: Theater[];
  armyGroups: ArmyGroup[];
  regions: RegionState;
  playerFaction: FactionId;
  selectedTheaterId: string | null;
  selectedGroupId: string | null;
  movingUnits: Movement[];
  onSelectTheater: (theaterId: string | null) => void;
  onCreateGroup: (name: string, regionIds: string[], theaterId: string | null) => void;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onSelectGroup: (groupId: string | null) => void;
  onSetGroupMode: (groupId: string, mode: 'none' | 'advance' | 'defend') => void;
  onDeployToGroup: (groupId: string) => void;
  onAssignTheater: (groupId: string, theaterId: string | null) => void;
}

export default function TheaterPanel({
  theaters,
  armyGroups,
  regions,
  playerFaction,
  selectedTheaterId,
  selectedGroupId,
  movingUnits,
  onSelectTheater,
  onCreateGroup,
  onDeleteGroup,
  onRenameGroup,
  onSelectGroup,
  onSetGroupMode,
  onDeployToGroup,
  onAssignTheater,
}: TheaterPanelProps) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Get all player's army groups
  const playerGroups = armyGroups.filter(g => g.owner === playerFaction);

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
    <div className="flex items-end gap-1 overflow-x-auto pb-4 px-4 scrollbar-hide select-none">
      {/* Group cards by theater if desired, but for now we'll just list them horizontally */}
      {playerGroups.map((group) => {
        const unitCount = getArmyGroupUnitCount(group.regionIds, regions, playerFaction, group.id, movingUnits);
        const validRegions = group.regionIds.filter(id => {
          const region = regions[id];
          return region && region.owner === playerFaction;
        }).length;
        const isGroupSelected = selectedGroupId === group.id;

        return (
          <div
            key={group.id}
            className={`group relative flex w-36 flex-col border shadow-2xl transition-all duration-200 cursor-pointer overflow-hidden ${
              isGroupSelected
                ? 'border-amber-500 bg-stone-800 ring-2 ring-amber-500/30'
                : 'border-stone-700 bg-stone-900/90 hover:border-stone-500 hover:bg-stone-800'
            }`}
            onClick={() => {
              onSelectGroup(isGroupSelected ? null : group.id);
              if (!isGroupSelected) {
                onSelectTheater(group.theaterId);
              }
            }}
          >
            {/* Color stripe at top */}
            <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: group.color }} />

            {/* Header: Name & Delete */}
            <div className="flex h-7 items-center justify-between border-b border-stone-800 bg-stone-950/60 px-2 shrink-0">
              {editingGroupId === group.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleFinishRename}
                  autoFocus
                  className="w-full bg-stone-950 text-[10px] text-white outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="truncate text-[11px] font-bold text-stone-300 uppercase tracking-tighter"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartRename(group);
                  }}
                  title="Double-click to rename"
                >
                  {group.name}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGroup(group.id);
                }}
                className="text-stone-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
              >
                <span className="text-[10px]">✕</span>
              </button>
            </div>

            {/* Theater selection */}
            <div className="border-b border-stone-800 px-1 py-0.5 shrink-0">
              <select
                value={group.theaterId || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  const theaterId = e.target.value || null;
                  onAssignTheater(group.id, theaterId);
                  onSelectTheater(theaterId);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-transparent text-[10px] text-center font-bold text-stone-500 uppercase tracking-tighter outline-none cursor-pointer appearance-none hover:text-stone-300"
              >
                <option value="" className="bg-stone-900 text-stone-300">No Theater</option>
                {theaters.map((theater) => (
                  <option key={theater.id} value={theater.id} className="bg-stone-900 text-stone-300">
                    {theater.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Main Action Area: Attack & Defend (Large) */}
            <div className="flex h-16 divide-x divide-stone-800 border-b border-stone-800 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newMode = group.mode === 'advance' ? 'none' : 'advance';
                  onSetGroupMode(group.id, newMode);
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
                  group.mode === 'advance' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-stone-900/40 text-stone-600 hover:bg-green-900/20 hover:text-green-500'
                }`}
                title="Advance Mode"
              >
                <span className="text-xl">➔</span>
                <span className="text-[10px] font-black">ATTACK</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newMode = group.mode === 'defend' ? 'none' : 'defend';
                  onSetGroupMode(group.id, newMode);
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
                  group.mode === 'defend' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-stone-900/40 text-stone-600 hover:bg-orange-900/20 hover:text-orange-500'
                }`}
                title="Defend Mode"
              >
                <span className="text-xl">🛡️</span>
                <span className="text-[10px] font-black">DEFEND</span>
              </button>
            </div>

            {/* Division Count Area */}
            <div className="flex h-8 items-center justify-center bg-stone-950/40 shrink-0">
              <div className="text-[10px] font-black tracking-tight text-white">
                <span className={unitCount > 0 ? 'text-amber-400' : 'text-stone-500'}>
                  {unitCount}
                </span>
                <span className="text-[10px] opacity-30 ml-1">DIVISIONS</span>
              </div>
            </div>

            {/* Deploy button at bottom */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeployToGroup(group.id);
              }}
              className="w-full bg-blue-700 py-2 text-[10px] font-black text-white hover:bg-blue-600 transition-colors shrink-0"
            >
              DEPLOY
            </button>
          </div>
        );
      })}

      {/* Add New Group Button - Large Plus */}
      <button
        onClick={() => {
          onCreateGroup('', [], theaters[0]?.id || null);
        }}
        className="flex h-44 w-36 flex-col items-center justify-center border-2 border-dashed border-stone-700 bg-stone-900/40 text-stone-600 transition-all hover:border-stone-500 hover:bg-stone-800/60 hover:text-stone-400"
        title="Create New Army Group"
      >
        <span className="text-4xl font-light">+</span>
        <span className="text-[10px] font-bold uppercase tracking-widest mt-2">New Group</span>
      </button>

      </div>
  );
}

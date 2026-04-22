'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { getCountryFlag } from '../data/countries';
import { getArmyGroupUnitCount } from '../utils/mapUtils';
import { canProduceDivision } from '../utils/commandPower';

export default function TheaterPanel() {
  // Store selectors
  const allTheaters = useGameStore(state => state.theaters);
  const armyGroups = useGameStore(state => state.armyGroups);
  const regions = useGameStore(state => state.regions);
  const divisions = useGameStore(state => state.divisions);
  const playerCountry = useGameStore(state => state.selectedCountry?.id);
  const selectedGroupId = useGameStore(state => state.selectedGroupId);
  const movingUnits = useGameStore(state => state.movingUnits);
  const activeCombats = useGameStore(state => state.activeCombats);
  const productionQueue = useGameStore(state => state.productionQueues);
  const countryBonuses = useGameStore(state => state.countryBonuses);
  const coreRegions = useGameStore(state => state.selectedCountry?.coreRegions);
  
  // Actions
  const createArmyGroup = useGameStore(state => state.createArmyGroup);
  const deleteArmyGroup = useGameStore(state => state.deleteArmyGroup);
  const renameArmyGroup = useGameStore(state => state.renameArmyGroup);
  const selectArmyGroup = useGameStore(state => state.selectArmyGroup);
  const setArmyGroupMode = useGameStore(state => state.setArmyGroupMode);
  const deployToArmyGroup = useGameStore(state => state.deployToArmyGroup);
  const assignTheaterToGroup = useGameStore(state => state.assignTheaterToGroup);
  const selectDivisionsInArmyGroup = useGameStore(state => state.selectDivisionsInArmyGroup);
  const addDivisionsToArmyGroup = useGameStore(state => state.addDivisionsToArmyGroup);
  const selectedDivisionIds = useGameStore(state => state.selectedDivisionIds);
  
  // Local state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [openTheaterMenuGroupId, setOpenTheaterMenuGroupId] = useState<string | null>(null);

  // Get all player's army groups
  const playerGroups = useMemo(() => 
    playerCountry ? armyGroups.filter(g => g.owner === playerCountry) : [],
    [armyGroups, playerCountry]
  );

  // Only show theaters owned by the current player (guards against stale persisted state)
  const theaters = useMemo(() =>
    playerCountry ? allTheaters.filter(t => t.owner === playerCountry) : [],
    [allTheaters, playerCountry]
  );

  useEffect(() => {
    const handlePointerDown = () => setOpenTheaterMenuGroupId(null);

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleStartRename = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
    setEditingName(currentName);
  };

  const handleFinishRename = () => {
    if (editingGroupId && editingName.trim()) {
      renameArmyGroup(editingGroupId, editingName.trim());
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
  
  if (!playerCountry) return null;

  return (
    <div className="flex items-end gap-1 overflow-x-auto pb-4 px-4 scrollbar-hide select-none">
      {/* Group cards by theater if desired, but for now we'll just list them horizontally */}
      {playerGroups.map((group) => {
        const unitCount = getArmyGroupUnitCount(group.regionIds, regions, playerCountry, group.id, movingUnits, activeCombats, divisions);
        const queueCount = (productionQueue[playerCountry] || []).filter(p => p.armyGroupId === group.id).length;
        const isGroupSelected = selectedGroupId === group.id;
        const canProduce = canProduceDivision(playerCountry, divisions, regions, movingUnits, productionQueue, countryBonuses[playerCountry], coreRegions);
        const assignedTheater = group.theaterId ? theaters.find(theater => theater.id === group.theaterId) : null;
        const theaterFlag = assignedTheater ? getCountryFlag(assignedTheater.enemyCountry) : '';

        return (
          <div
            key={group.id}
            className={`group relative flex w-36 flex-col border shadow-2xl transition-all duration-200 cursor-pointer overflow-visible ${
              isGroupSelected
                ? 'border-amber-500 bg-stone-800 ring-2 ring-amber-500/30'
                : 'border-stone-700 bg-stone-900/90 hover:border-stone-500 hover:bg-stone-800'
            }`}
            onClick={() => {
              const newSelected = isGroupSelected ? null : group.id;
              selectArmyGroup(newSelected);
              if (newSelected) {
                selectDivisionsInArmyGroup(newSelected);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (selectedDivisionIds.length > 0) {
                addDivisionsToArmyGroup(group.id, selectedDivisionIds);
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
                    handleStartRename(group.id, group.name);
                  }}
                  title="Double-click to rename"
                >
                  {group.name}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteArmyGroup(group.id);
                }}
                className="text-stone-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
              >
                <span className="text-[10px]">✕</span>
              </button>
            </div>

            {/* Theater selection */}
            <div className="relative border-b border-stone-800 px-1 py-0.5 shrink-0">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenTheaterMenuGroupId(current => current === group.id ? null : group.id);
                }}
                className="flex w-full items-center gap-1 rounded px-0.5 py-0.5 text-left text-[10px] font-bold uppercase tracking-tighter text-stone-500 transition-colors hover:bg-stone-800/70 hover:text-stone-300"
                title="Assign theater"
              >
                {theaterFlag ? (
                  <Image
                    src={theaterFlag}
                    alt={`${assignedTheater?.enemyCountry} flag`}
                    width={16}
                    height={12}
                    className="h-3 w-4 shrink-0 rounded-[2px] border border-stone-700 object-cover"
                  />
                ) : (
                  <span className="flex h-3 w-4 shrink-0 items-center justify-center rounded-[2px] border border-dashed border-stone-700 text-[7px] text-stone-500">
                    -
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">
                  {assignedTheater?.name || 'No Theater'}
                </span>
                <span className="text-[9px] text-stone-500">
                  {openTheaterMenuGroupId === group.id ? '▲' : '▼'}
                </span>
              </button>

              {openTheaterMenuGroupId === group.id && (
                <div
                  className="absolute inset-x-1 top-full z-20 mt-1 rounded border border-stone-700 bg-stone-950 shadow-2xl"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      assignTheaterToGroup(group.id, null);
                      setOpenTheaterMenuGroupId(null);
                    }}
                    className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-tighter transition-colors ${
                      !group.theaterId
                        ? 'bg-stone-800 text-white'
                        : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                    }`}
                  >
                    <span className="flex h-3 w-4 shrink-0 items-center justify-center rounded-[2px] border border-dashed border-stone-700 text-[7px] text-stone-500">
                      -
                    </span>
                    <span className="truncate">No Theater</span>
                  </button>
                  {theaters.map((theater) => {
                    const optionFlag = getCountryFlag(theater.enemyCountry);
                    const isSelectedTheater = theater.id === group.theaterId;

                    return (
                      <button
                        key={theater.id}
                        type="button"
                        onClick={() => {
                          assignTheaterToGroup(group.id, theater.id);
                          setOpenTheaterMenuGroupId(null);
                        }}
                        className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-tighter transition-colors ${
                          isSelectedTheater
                            ? 'bg-stone-800 text-white'
                            : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                        }`}
                      >
                        {optionFlag ? (
                          <Image
                            src={optionFlag}
                            alt={`${theater.enemyCountry} flag`}
                            width={16}
                            height={12}
                            className="h-3 w-4 shrink-0 rounded-[2px] border border-stone-700 object-cover"
                          />
                        ) : (
                          <span className="flex h-3 w-4 shrink-0 items-center justify-center rounded-[2px] border border-dashed border-stone-700 text-[7px] text-stone-500">
                            -
                          </span>
                        )}
                        <span className="truncate">{theater.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Main Action Area: Attack & Defend (Large) */}
            <div className="flex h-16 divide-x divide-stone-800 border-b border-stone-800 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newMode = group.mode === 'advance' ? 'none' : 'advance';
                  setArmyGroupMode(group.id, newMode);
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
                  setArmyGroupMode(group.id, newMode);
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
                {queueCount > 0 && (
                  <span className="text-blue-400 ml-1">
                    +{queueCount}
                  </span>
                )}
              </div>
            </div>

            {/* Deploy buttons at bottom - split into +1, +5, +10 with cap enforcement */}
            <div className="flex divide-x divide-blue-900 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (canProduce) {
                    deployToArmyGroup(group.id, 1);
                  }
                }}
                disabled={!canProduce}
                className={`flex-1 py-2 text-[10px] font-black text-white transition-colors ${
                  canProduce
                    ? 'bg-blue-700 hover:bg-blue-600 cursor-pointer'
                    : 'bg-stone-700 cursor-not-allowed opacity-50'
                }`}
                title={canProduce ? 'Deploy 1 division' : 'Command power cap reached! Capture more states to increase cap.'}
              >
                +1
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (canProduce) {
                    deployToArmyGroup(group.id, 5);
                  }
                }}
                disabled={!canProduce}
                className={`flex-1 py-2 text-[10px] font-black text-white transition-colors ${
                  canProduce
                    ? 'bg-blue-700 hover:bg-blue-600 cursor-pointer'
                    : 'bg-stone-700 cursor-not-allowed opacity-50'
                }`}
                title={canProduce ? 'Deploy 5 divisions' : 'Command power cap reached! Capture more states to increase cap.'}
              >
                +5
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (canProduce) {
                    deployToArmyGroup(group.id, 10);
                  }
                }}
                disabled={!canProduce}
                className={`flex-1 py-2 text-[10px] font-black text-white transition-colors ${
                  canProduce
                    ? 'bg-blue-700 hover:bg-blue-600 cursor-pointer'
                    : 'bg-stone-700 cursor-not-allowed opacity-50'
                }`}
                title={canProduce ? 'Deploy 10 divisions' : 'Command power cap reached! Capture more states to increase cap.'}
              >
                +10
              </button>
            </div>
          </div>
        );
      })}

      {/* Add New Group Button - Large Plus */}
      <button
        onClick={() => {
          createArmyGroup('', [], theaters[0]?.id || null);
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

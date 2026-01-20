'use client';

import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import SidebarPanel from './SidebarPanel';

interface ProductionQueuePanelProps {
  viewOnly?: boolean; // Hide the "Add Production" section
}

export default function ProductionQueuePanel({
  viewOnly = false,
}: ProductionQueuePanelProps) {
  // Store selectors
  const isOpen = useGameStore(state => state.isProductionModalOpen);
  const productionQueue = useGameStore(state => state.productionQueues);
  const regions = useGameStore(state => state.regions);
  const armyGroups = useGameStore(state => state.armyGroups);
  const playerCountry = useGameStore(state => state.selectedCountry?.id);
  const currentDateTime = useGameStore(state => state.dateTime);
  
  // Actions
  const setIsProductionModalOpen = useGameStore(state => state.setIsProductionModalOpen);
  const cancelProduction = useGameStore(state => state.cancelProduction);
  
  // Local state
  const [divisionName, setDivisionName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  if (!playerCountry) return null;

  const onClose = () => setIsProductionModalOpen(false);
  
  // Filter queue to show only player's productions
  const playerProductions = productionQueue[playerCountry] || [];

  // Get player-owned regions for deployment
  const ownedRegions = Object.values(regions).filter(r => r.owner === playerCountry);

  const handleAddProduction = () => {
    if (!divisionName.trim()) {
      alert('Please enter a division name');
      return;
    }

    // Note: This would need an onAddProduction action in the store
    // For now, keeping it disabled as per the original viewOnly usage
    setDivisionName('');
    setSelectedRegion('');
  };

  const formatTimeRemaining = (completionTime: Date) => {
    const diff = completionTime.getTime() - currentDateTime.getTime();
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    
    if (hours <= 0) return 'Completing...';
    if (hours === 1) return '1 hour';
    return `${hours} hours`;
  };

  const getProgressPercentage = (startTime: Date, completionTime: Date) => {
    const total = completionTime.getTime() - startTime.getTime();
    const elapsed = currentDateTime.getTime() - startTime.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  return (
    <SidebarPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Production Queue"
      subtitle="Manage your military production"
      side="left"
    >
      <div className="space-y-6">
        {/* Add New Production - Hidden in view-only mode */}
        {!viewOnly && (
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-300">
              Start New Production
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-stone-400">Division Name</label>
                <input
                  type="text"
                  value={divisionName}
                  onChange={(e) => setDivisionName(e.target.value)}
                  placeholder="e.g., 1st Infantry Division"
                  className="w-full rounded border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-400">Deploy To (Optional)</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full rounded border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Select region (or leave empty)</option>
                  {ownedRegions.map(region => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-stone-400">
                  Time: <span className="font-semibold text-stone-300">24h</span>
                </div>
                <button
                  onClick={handleAddProduction}
                  disabled={!divisionName.trim()}
                  className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-stone-900 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-stone-600 disabled:text-stone-400"
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info for view-only mode */}
        {viewOnly && (
          <div className="rounded-lg border border-blue-900/50 bg-blue-950/30 p-3">
            <p className="text-xs text-blue-300">
              <strong>Tip:</strong> Click the <strong>Deploy</strong> button on any army group to add a division to the production queue.
            </p>
          </div>
        )}

        {/* Current Production Queue */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-300">
            Active Productions ({playerProductions.length})
          </h3>
          
          {playerProductions.length === 0 ? (
            <div className="rounded-lg border border-stone-700 bg-stone-900/30 p-6 text-center">
              <p className="text-stone-400 text-sm">No active productions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {playerProductions.map((production, index) => {
                const progress = getProgressPercentage(production.startTime, production.completionTime);
                const targetRegionName = production.targetRegionId 
                  ? regions[production.targetRegionId]?.name || 'Unknown'
                  : 'First Available Region';
                const armyGroup = armyGroups.find(g => g.id === production.armyGroupId);
                const armyGroupName = armyGroup?.name || 'Unknown Army Group';
                const isActive = index === 0; // First in queue is actively producing

                return (
                  <div
                    key={production.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      isActive 
                        ? 'border-amber-600/50 bg-amber-950/20 hover:bg-amber-950/30'
                        : 'border-stone-700 bg-stone-900/50 hover:bg-stone-800/70'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-stone-200 text-sm truncate">
                            {production.divisionName}
                          </h4>
                          {isActive && (
                            <span className="shrink-0 rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-stone-900 uppercase">
                              PRODUCING
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 truncate">
                          Army Group: <span className="text-stone-300">{armyGroupName}</span>
                        </p>
                        <p className="text-[11px] text-stone-400 truncate">
                          Deploying to: <span className="text-stone-300">{targetRegionName}</span>
                        </p>
                        {isActive && (
                          <div className="mt-2">
                            <div className="mb-1 flex items-center justify-between text-[10px]">
                              <span className="text-stone-400">
                                {formatTimeRemaining(production.completionTime)} remaining
                              </span>
                              <span className="text-stone-300">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-stone-700">
                              <div
                                className="h-full bg-amber-500 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {!isActive && (
                          <p className="mt-1 text-[10px] text-stone-500 italic">
                            Waiting in queue #{index + 1}...
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Cancel production of ${production.divisionName}? You will get $5 refunded.`)) {
                            cancelProduction(production.id);
                          }
                        }}
                        className="ml-2 shrink-0 rounded bg-red-900/30 p-1.5 text-red-400 transition-colors hover:bg-red-900/50"
                        title="Cancel production"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-3">
          <p className="text-[11px] text-blue-300">
            <strong>Note:</strong> Each division takes 24 game hours to produce. 
            Completed divisions deploy automatically to their assigned army group.
          </p>
        </div>
      </div>
    </SidebarPanel>
  );
}

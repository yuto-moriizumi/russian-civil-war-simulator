'use client';

import { useState } from 'react';
import Modal from './Modal';
import { ProductionQueueItem, RegionState, FactionId } from '../types/game';

interface ProductionQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionQueue: ProductionQueueItem[];
  regions: RegionState;
  playerFaction: FactionId;
  currentDateTime: Date;
  money: number;
  onAddProduction: (divisionName: string, targetRegionId?: string | null) => void;
  onCancelProduction: (productionId: string) => void;
}

const DIVISION_COST = 10;

export default function ProductionQueueModal({
  isOpen,
  onClose,
  productionQueue,
  regions,
  playerFaction,
  currentDateTime,
  money,
  onAddProduction,
  onCancelProduction,
}: ProductionQueueModalProps) {
  const [divisionName, setDivisionName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  // Filter queue to show only player's productions
  const playerProductions = productionQueue.filter(p => p.owner === playerFaction);

  // Get player-owned regions for deployment
  const ownedRegions = Object.values(regions).filter(r => r.owner === playerFaction);

  const handleAddProduction = () => {
    if (!divisionName.trim()) {
      alert('Please enter a division name');
      return;
    }

    if (money < DIVISION_COST) {
      alert(`Not enough money. Need $${DIVISION_COST}, have $${money}`);
      return;
    }

    onAddProduction(divisionName.trim(), selectedRegion || null);
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

  const getProgressPercentage = (production: ProductionQueueItem) => {
    const total = production.completionTime.getTime() - production.startTime.getTime();
    const elapsed = currentDateTime.getTime() - production.startTime.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Production Queue" size="lg">
      <div className="space-y-6">
        {/* Add New Production */}
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
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
                Cost: <span className="font-semibold text-amber-500">${DIVISION_COST}</span>
                {' • '}
                Time: <span className="font-semibold text-stone-300">24 hours</span>
              </div>
              <button
                onClick={handleAddProduction}
                disabled={money < DIVISION_COST || !divisionName.trim()}
                className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-stone-900 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-stone-600 disabled:text-stone-400"
              >
                Start Production
              </button>
            </div>
          </div>
        </div>

        {/* Current Production Queue */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-300">
            Active Productions ({playerProductions.length})
          </h3>
          
          {playerProductions.length === 0 ? (
            <div className="rounded-lg border border-stone-700 bg-stone-800/30 p-6 text-center">
              <p className="text-stone-400">No active productions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {playerProductions.map(production => {
                const progress = getProgressPercentage(production);
                const targetRegionName = production.targetRegionId 
                  ? regions[production.targetRegionId]?.name || 'Unknown'
                  : 'First Available Region';

                return (
                  <div
                    key={production.id}
                    className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 transition-colors hover:bg-stone-800/70"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-stone-200">
                          {production.divisionName}
                        </h4>
                        <p className="text-xs text-stone-400">
                          Deploying to: {targetRegionName}
                        </p>
                        <div className="mt-2">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-stone-400">
                              {formatTimeRemaining(production.completionTime)} remaining
                            </span>
                            <span className="text-stone-300">{Math.round(progress)}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-stone-700">
                            <div
                              className="h-full bg-amber-500 transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Cancel production of ${production.divisionName}? You will get $5 refunded.`)) {
                            onCancelProduction(production.id);
                          }
                        }}
                        className="ml-4 rounded bg-red-900/50 px-3 py-1 text-xs text-red-300 transition-colors hover:bg-red-900"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="rounded-lg border border-blue-900/50 bg-blue-950/30 p-3">
          <p className="text-xs text-blue-300">
            <strong>Note:</strong> Each division costs ${DIVISION_COST} and takes 24 game hours to produce. 
            You can cancel production for a 50% refund. Completed divisions will automatically deploy to the selected region.
          </p>
        </div>
      </div>
    </Modal>
  );
}

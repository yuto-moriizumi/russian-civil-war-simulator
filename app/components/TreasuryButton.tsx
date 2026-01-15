'use client';

import { useRef, useState, useEffect } from 'react';

interface TreasuryButtonProps {
  money: number;
  income: number;
  grossIncome: number;
  maintenanceCost: number;
  unitCount: number;
  divisionCap?: number;
  controlledStates?: number;
  inProduction?: number;
}

export default function TreasuryButton({
  money,
  income,
  grossIncome,
  maintenanceCost,
  unitCount,
  divisionCap,
  controlledStates,
  inProduction,
}: TreasuryButtonProps) {
  const [showTreasuryDetails, setShowTreasuryDetails] = useState(false);
  const treasuryRef = useRef<HTMLDivElement>(null);

  // Close treasury details when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (treasuryRef.current && !treasuryRef.current.contains(event.target as Node)) {
        setShowTreasuryDetails(false);
      }
    };

    if (showTreasuryDetails) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTreasuryDetails]);

  return (
    <div className="relative" ref={treasuryRef}>
      <button
        onClick={() => setShowTreasuryDetails(!showTreasuryDetails)}
        className="rounded-lg border border-amber-600/50 bg-stone-800/80 px-4 py-2 transition-colors hover:bg-stone-800"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-amber-400">${money}</span>
          <span className={`text-xs ${income >= 0 ? "text-green-400" : "text-red-400"}`}>
            {income >= 0 ? '+' : ''}${income}/h
          </span>
        </div>
      </button>

      {/* Treasury Details Tooltip */}
      {showTreasuryDetails && (
        <div className="absolute left-0 top-full mt-2 z-20 w-64 rounded-lg border border-amber-600/50 bg-stone-900/95 p-3 shadow-xl">
          <div className="text-xs text-stone-400 mb-2">Treasury Details</div>
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-300">Current Balance:</span>
              <span className="font-bold text-amber-400">${money}</span>
            </div>
            <div className="border-t border-stone-700 my-1"></div>
            <div className="flex items-center justify-between">
              <span className="text-green-400">Gross Income:</span>
              <span className="text-green-400">+${grossIncome}/h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-red-400">Maintenance:</span>
              <span className="text-red-400">-${maintenanceCost}/h ({unitCount} units)</span>
            </div>
            <div className="border-t border-stone-700 my-1"></div>
            <div className="flex items-center justify-between">
              <span className={income >= 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                Net Income:
              </span>
              <span className={income >= 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                {income >= 0 ? '+' : ''}${income}/h
              </span>
            </div>
            
            {/* Command Power Info */}
            {divisionCap !== undefined && controlledStates !== undefined && (
              <>
                <div className="border-t border-stone-700 my-1"></div>
                <div className="text-xs text-stone-400 mb-1">Command Power</div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">Active Units:</span>
                  <span className="text-blue-400 font-semibold">{unitCount} / {divisionCap}</span>
                </div>
                {inProduction !== undefined && inProduction > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-300">In Production:</span>
                    <span className="text-emerald-400">+{inProduction}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">States Controlled:</span>
                  <span className="text-stone-400">{controlledStates}</span>
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  +1 per state, +2-3 for major cities
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

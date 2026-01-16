'use client';

import { ActiveCombat, Division, CountryId } from '../types/game';
import { getCountryCombatName } from '../data/countries';

interface CombatPopupProps {
  combat: ActiveCombat;
  onClose: () => void;
}

/**
 * Detailed combat popup showing battle progress
 * Similar to Hearts of Iron battle interface
 */
export default function CombatPopup({ combat, onClose }: CombatPopupProps) {
  const attackerHp = combat.attackerDivisions.reduce((sum, d) => sum + d.hp, 0);
  const defenderHp = combat.defenderDivisions.reduce((sum, d) => sum + d.hp, 0);
  
  // Calculate progress bars
  const attackerHpProgress = Math.min(100, combat.initialAttackerHp > 0 
    ? (attackerHp / combat.initialAttackerHp) * 100 
    : 0);
  const defenderHpProgress = Math.min(100, combat.initialDefenderHp > 0 
    ? (defenderHp / combat.initialDefenderHp) * 100 
    : 0);

  const getFactionFlag = (faction: CountryId) => {
    switch (faction) {
      case 'soviet': return '☭';
      case 'white': return '🦅';
      default: return '🏴';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div 
        className="bg-[#1a1a1a] border-2 border-stone-600 rounded-lg shadow-2xl w-[600px] text-stone-200 overflow-hidden font-serif"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Battle Header */}
        <div className="relative h-32 bg-stone-800 border-b border-stone-700 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          <div className="relative z-10 flex items-center gap-12">
            {/* Attacker Portrait Placeholder */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full border-2 border-stone-500 bg-stone-700 flex items-center justify-center overflow-hidden shadow-lg mb-2">
                <span className="text-4xl">👤</span>
              </div>
              <div className="bg-black/60 px-2 py-0.5 rounded text-[10px] flex gap-1">
                <span className="text-yellow-500">★★</span>
              </div>
            </div>

            <div className="flex flex-col items-center">
               <div className="text-amber-400 text-lg font-bold uppercase tracking-widest mb-1 drop-shadow-md">
                 Battle of {combat.regionName}
               </div>
               <div className="flex items-center gap-2">
                 <div className="h-0.5 w-12 bg-stone-600"></div>
                 <div className="w-12 h-12 rounded-full bg-stone-900 border-2 border-amber-900 flex items-center justify-center shadow-inner">
                    <span className="text-2xl">⚔️</span>
                 </div>
                 <div className="h-0.5 w-12 bg-stone-600"></div>
               </div>
            </div>

            {/* Defender Portrait Placeholder */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full border-2 border-stone-500 bg-stone-700 flex items-center justify-center overflow-hidden shadow-lg mb-2">
                <span className="text-4xl">👤</span>
              </div>
              <div className="bg-black/60 px-2 py-0.5 rounded text-[10px] flex gap-1">
                <span className="text-yellow-500">★★</span>
              </div>
            </div>
          </div>
        </div>

        {/* Combat Stats Interface */}
        <div className="p-4 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a]">
          <div className="flex items-center justify-between mb-4">
            {/* Attacker Info */}
            <div className="flex items-center gap-4">
               <div className="w-16 h-10 border border-stone-600 bg-stone-800 flex items-center justify-center text-2xl shadow-md">
                 {getFactionFlag(combat.attackerCountry)}
               </div>
               <div className="text-right">
                 <div className="text-xl font-bold text-white">{attackerHp.toLocaleString()}</div>
                 <div className="w-32 h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-700">
                    <div 
                      className="h-full bg-red-700 transition-all duration-500"
                      style={{ width: `${attackerHpProgress}%` }}
                    ></div>
                 </div>
               </div>
            </div>

            {/* Central Combat Icon */}
            <div className="w-16 h-16 rounded-full border-4 border-[#3a2a1a] bg-[#1a0a00] flex items-center justify-center shadow-xl transform -translate-y-2">
              <div className="relative w-full h-full flex items-center justify-center">
                 <span className="text-3xl filter drop-shadow-md">⚔️</span>
                 {/* Combat Progress Circle (SVG) */}
                 <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle 
                      cx="32" cy="32" r="28" 
                      fill="transparent" 
                      stroke="#422" 
                      strokeWidth="4"
                    />
                    <circle 
                      cx="32" cy="32" r="28" 
                      fill="transparent" 
                      stroke="#822" 
                      strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset="0"
                      className="transition-all duration-1000"
                    />
                 </svg>
              </div>
            </div>

            {/* Defender Info */}
            <div className="flex items-center gap-4">
               <div className="text-left">
                 <div className="text-xl font-bold text-white">{defenderHp.toLocaleString()}</div>
                 <div className="w-32 h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-700">
                    <div 
                      className="h-full bg-green-700 transition-all duration-500"
                      style={{ width: `${defenderHpProgress}%` }}
                    ></div>
                 </div>
               </div>
               <div className="w-16 h-10 border border-stone-600 bg-stone-800 flex items-center justify-center text-2xl shadow-md">
                 {getFactionFlag(combat.defenderCountry)}
               </div>
            </div>
          </div>

          {/* Division Details and Round Info */}
          <div className="grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between border-b border-stone-700 pb-1 text-stone-400 uppercase tracking-tighter">
                <span>Attacker Divisions</span>
                <span>{combat.attackerDivisions.length}</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {combat.attackerDivisions.map(div => (
                  <DivisionRow key={div.id} division={div} faction={combat.attackerCountry} />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between border-b border-stone-700 pb-1 text-stone-400 uppercase tracking-tighter">
                <span>Defender Divisions</span>
                <span>{combat.defenderDivisions.length}</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {combat.defenderDivisions.map(div => (
                  <DivisionRow key={div.id} division={div} faction={combat.defenderCountry} />
                ))}
              </div>
            </div>
          </div>

           <div className="mt-6 flex items-center justify-center gap-4">
              <div className="text-[10px] text-stone-500 uppercase tracking-widest">
                Round {combat.currentRound}
              </div>
             {combat.isComplete && (
               <div className={`px-4 py-1 rounded border font-bold uppercase tracking-widest animate-pulse ${
                 combat.victor === combat.attackerCountry ? 'bg-red-900/40 border-red-700 text-red-400' :
                 combat.victor === combat.defenderCountry ? 'bg-green-900/40 border-green-700 text-green-400' :
                 'bg-stone-800 border-stone-600 text-stone-400'
               }`}>
                  {combat.victor ? `${getCountryCombatName(combat.victor)} Victory` : 'Stalemate'}
               </div>
             )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#111] border-t border-stone-700 flex justify-between items-center">
          <div className="text-[10px] text-stone-600">
            Combat Resolution v1.0 • {new Date(combat.startTime).toLocaleDateString()}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-600 rounded text-sm transition-colors uppercase tracking-widest"
          >
            Dismiss
          </button>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

// Helper component for division rows
function DivisionRow({ division }: { division: Division; faction: CountryId }) {
  const hpPercent = (division.hp / division.maxHp) * 100;
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500';
  
  return (
    <div className="bg-stone-700/50 rounded px-2 py-1">
      <div className="text-xs text-stone-300 truncate" title={division.name}>
        {division.name.length > 20 ? division.name.substring(0, 20) + '...' : division.name}
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <div className="flex-1 h-1 bg-stone-600 rounded overflow-hidden">
          <div className={`h-full ${hpColor}`} style={{ width: `${hpPercent}%` }} />
        </div>
        <span className="text-[10px] text-stone-400">{division.hp}/{division.maxHp}</span>
      </div>
    </div>
  );
}

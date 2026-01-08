'use client';

import { ActiveCombat, Division, FactionId } from '../types/game';
import { FACTION_COLORS } from '../utils/mapUtils';

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
  const attackerAttack = combat.attackerDivisions.reduce((sum, d) => sum + d.attack, 0);
  const defenderAttack = combat.defenderDivisions.reduce((sum, d) => sum + d.attack, 0);
  const attackerDefence = combat.attackerDivisions.reduce((sum, d) => sum + d.defence, 0);
  const defenderDefence = combat.defenderDivisions.reduce((sum, d) => sum + d.defence, 0);
  
  // Calculate progress bars
  const attackerHpProgress = combat.initialAttackerHp > 0 
    ? (attackerHp / combat.initialAttackerHp) * 100 
    : 0;
  const defenderHpProgress = combat.initialDefenderHp > 0 
    ? (defenderHp / combat.initialDefenderHp) * 100 
    : 0;

  const attackerLosses = combat.initialAttackerCount - combat.attackerDivisions.length;
  const defenderLosses = combat.initialDefenderCount - combat.defenderDivisions.length;

  const attackerColor = FACTION_COLORS[combat.attackerFaction];
  const defenderColor = FACTION_COLORS[combat.defenderFaction];

  const getFactionName = (faction: FactionId) => {
    switch (faction) {
      case 'soviet': return 'Red Army';
      case 'white': return 'White Army';
      case 'neutral': return 'Neutral Forces';
      case 'foreign': return 'Foreign Forces';
      default: return faction;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div 
        className="bg-stone-900 border-2 border-stone-600 rounded-lg shadow-2xl min-w-[400px] max-w-[500px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-800 px-4 py-2 rounded-t-lg border-b border-stone-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#9876;</span>
            <span className="font-bold text-amber-400">Battle for {combat.regionName}</span>
          </div>
          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-white text-xl leading-none px-2"
          >
            &times;
          </button>
        </div>

        {/* Combat status */}
        <div className="px-4 py-2 bg-stone-850 border-b border-stone-700 flex items-center justify-center gap-4 text-sm">
          <span className="text-stone-400">
            Round {combat.currentRound} / {combat.maxRounds}
          </span>
          {combat.isComplete ? (
            <span className={`font-bold ${
              combat.victor === combat.attackerFaction ? 'text-green-400' : 
              combat.victor === combat.defenderFaction ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {combat.victor ? `${getFactionName(combat.victor)} Victory!` : 'Stalemate'}
            </span>
          ) : (
            <span className="text-cyan-400 animate-pulse">Combat in Progress</span>
          )}
        </div>

        {/* Main battle display */}
        <div className="p-4">
          <div className="flex items-stretch gap-4">
            {/* Attacker side */}
            <div className="flex-1 rounded-lg overflow-hidden" style={{ border: `2px solid ${attackerColor}` }}>
              <div 
                className="px-3 py-2 text-center font-bold"
                style={{ 
                  backgroundColor: attackerColor,
                  color: combat.attackerFaction === 'white' ? '#000' : '#fff',
                }}
              >
                {getFactionName(combat.attackerFaction)}
                <div className="text-xs font-normal opacity-80">Attacker</div>
              </div>
              <div className="bg-stone-800 p-3 space-y-2">
                {/* Division count */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-400">Divisions:</span>
                  <span className="font-bold text-white">
                    {combat.attackerDivisions.length}
                    {attackerLosses > 0 && (
                      <span className="text-red-400 ml-1">(-{attackerLosses})</span>
                    )}
                  </span>
                </div>
                
                {/* HP bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-red-400">HP</span>
                    <span className="text-stone-300">{attackerHp} / {combat.initialAttackerHp}</span>
                  </div>
                  <div className="h-3 bg-stone-700 rounded overflow-hidden">
                    <div 
                      className="h-full transition-all duration-500"
                      style={{ 
                        width: `${attackerHpProgress}%`,
                        backgroundColor: '#ef4444',
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-stone-700">
                  <div className="flex items-center gap-1">
                    <span className="text-orange-400">&#9876;</span>
                    <span className="text-stone-400">Attack:</span>
                    <span className="text-white font-bold">{attackerAttack}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">&#128737;</span>
                    <span className="text-stone-400">Defence:</span>
                    <span className="text-white font-bold">{attackerDefence}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* VS divider */}
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-stone-700 flex items-center justify-center border-2 border-stone-500">
                <span className="text-amber-400 font-bold text-sm">VS</span>
              </div>
            </div>

            {/* Defender side */}
            <div className="flex-1 rounded-lg overflow-hidden" style={{ border: `2px solid ${defenderColor}` }}>
              <div 
                className="px-3 py-2 text-center font-bold"
                style={{ 
                  backgroundColor: defenderColor,
                  color: combat.defenderFaction === 'white' ? '#000' : '#fff',
                }}
              >
                {getFactionName(combat.defenderFaction)}
                <div className="text-xs font-normal opacity-80">Defender</div>
              </div>
              <div className="bg-stone-800 p-3 space-y-2">
                {/* Division count */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-400">Divisions:</span>
                  <span className="font-bold text-white">
                    {combat.defenderDivisions.length}
                    {defenderLosses > 0 && (
                      <span className="text-red-400 ml-1">(-{defenderLosses})</span>
                    )}
                  </span>
                </div>
                
                {/* HP bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-red-400">HP</span>
                    <span className="text-stone-300">{defenderHp} / {combat.initialDefenderHp}</span>
                  </div>
                  <div className="h-3 bg-stone-700 rounded overflow-hidden">
                    <div 
                      className="h-full transition-all duration-500"
                      style={{ 
                        width: `${defenderHpProgress}%`,
                        backgroundColor: '#ef4444',
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-stone-700">
                  <div className="flex items-center gap-1">
                    <span className="text-orange-400">&#9876;</span>
                    <span className="text-stone-400">Attack:</span>
                    <span className="text-white font-bold">{defenderAttack}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">&#128737;</span>
                    <span className="text-stone-400">Defence:</span>
                    <span className="text-white font-bold">{defenderDefence}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Division list (collapsible) */}
          <details className="mt-4">
            <summary className="text-sm text-stone-400 cursor-pointer hover:text-white">
              View Division Details
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-4 max-h-40 overflow-y-auto">
              {/* Attacker divisions */}
              <div className="space-y-1">
                {combat.attackerDivisions.map((div) => (
                  <DivisionRow key={div.id} division={div} faction={combat.attackerFaction} />
                ))}
                {combat.attackerDivisions.length === 0 && (
                  <div className="text-xs text-red-400 italic">All divisions destroyed</div>
                )}
              </div>
              {/* Defender divisions */}
              <div className="space-y-1">
                {combat.defenderDivisions.map((div) => (
                  <DivisionRow key={div.id} division={div} faction={combat.defenderFaction} />
                ))}
                {combat.defenderDivisions.length === 0 && (
                  <div className="text-xs text-red-400 italic">All divisions destroyed</div>
                )}
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-stone-800 rounded-b-lg border-t border-stone-600 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-stone-600 hover:bg-stone-500 text-white rounded text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper component for division rows
function DivisionRow({ division, faction }: { division: Division; faction: FactionId }) {
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

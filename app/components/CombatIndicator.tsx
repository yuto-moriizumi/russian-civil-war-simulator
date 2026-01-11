'use client';

import { ActiveCombat } from '../types/game';
import { FACTION_COLORS } from '../utils/mapUtils';

interface CombatIndicatorProps {
  combat: ActiveCombat;
  onClick: () => void;
  isSelected?: boolean;
}

/**
 * Combat indicator shown on the map during active battles
 * Displays attacker/defender strength bars similar to Hearts of Iron
 */
export default function CombatIndicator({ combat, onClick, isSelected }: CombatIndicatorProps) {
  const attackerHp = combat.attackerDivisions.reduce((sum, d) => sum + d.hp, 0);
  const defenderHp = combat.defenderDivisions.reduce((sum, d) => sum + d.hp, 0);
  
  // Calculate progress bars based on HP relative to initial
  const attackerProgress = combat.initialAttackerHp > 0 
    ? (attackerHp / combat.initialAttackerHp) * 100 
    : 0;
  const defenderProgress = combat.initialDefenderHp > 0 
    ? (defenderHp / combat.initialDefenderHp) * 100 
    : 0;

  const attackerColor = FACTION_COLORS[combat.attackerFaction];
  const defenderColor = FACTION_COLORS[combat.defenderFaction];

  return (
    <div 
      className={`combat-indicator cursor-pointer transition-all duration-200 ${
        isSelected ? 'scale-110 z-50' : 'hover:scale-105'
      }`}
      onClick={onClick}
      style={{
        pointerEvents: 'auto',
      }}
    >
      {/* Battle icon in center */}
      <div className="relative flex items-center">
        {/* Attacker side (left) */}
        <div className="flex flex-col items-end mr-1">
          <div 
            className="h-5 flex items-center justify-end rounded-l px-1 min-w-[40px]"
            style={{ 
              backgroundColor: attackerColor,
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            <span className={`text-[10px] font-bold ${
              combat.attackerFaction === 'white' ? 'text-black' : 'text-white'
            }`}>
              {combat.attackerDivisions.length}
            </span>
          </div>
          {/* HP bar below */}
          <div className="h-1 w-full bg-black/50 rounded-l overflow-hidden mt-0.5">
            <div 
              className="h-full transition-all duration-300"
              style={{ 
                width: `${attackerProgress}%`,
                backgroundColor: attackerColor,
              }}
            />
          </div>
        </div>

        {/* Combat icon (crossed swords) */}
        <div 
          className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
            isSelected ? 'ring-2 ring-yellow-400' : ''
          }`}
          style={{
            background: 'radial-gradient(circle, #4a4a4a 0%, #2a2a2a 100%)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
            border: '2px solid #666',
          }}
        >
          <span className="text-[10px]" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}>
            &#9876;
          </span>
        </div>

        {/* Defender side (right) */}
        <div className="flex flex-col items-start ml-1">
          <div 
            className="h-5 flex items-center justify-start rounded-r px-1 min-w-[40px]"
            style={{ 
              backgroundColor: defenderColor,
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            <span className={`text-[10px] font-bold ${
              combat.defenderFaction === 'white' ? 'text-black' : 'text-white'
            }`}>
              {combat.defenderDivisions.length}
            </span>
          </div>
          {/* HP bar below */}
          <div className="h-1 w-full bg-black/50 rounded-r overflow-hidden mt-0.5">
            <div 
              className="h-full transition-all duration-300"
              style={{ 
                width: `${defenderProgress}%`,
                backgroundColor: defenderColor,
              }}
            />
          </div>
        </div>
      </div>

      {/* Pulsing animation for active combat */}
      <style jsx>{`
        .combat-indicator {
          animation: combat-pulse 2s ease-in-out infinite;
        }
        @keyframes combat-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }
      `}</style>
    </div>
  );
}

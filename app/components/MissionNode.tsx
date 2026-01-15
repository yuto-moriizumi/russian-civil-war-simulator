'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Mission } from '../types/game';
import { formatCondition } from '../utils/missionUtils';

type MissionNodeData = {
  mission: Mission;
  canClaim: boolean;
  isUnlocked: boolean;
  onClaim: (id: string) => void;
  [key: string]: unknown;
};

export type MissionNodeType = Node<MissionNodeData, 'missionNode'>;

function MissionNode({ data }: NodeProps<MissionNodeType>) {
  const { mission, canClaim, isUnlocked, onClaim } = data;

  return (
    <>
      {/* Target handle (top) - only show if has prerequisites */}
      {mission.prerequisites.length > 0 && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-stone-600 !w-3 !h-3"
        />
      )}

      <div
        className={`
          w-60 rounded-lg border-2 p-4 text-left transition-all duration-300
          ${
            mission.claimed
              ? 'border-green-600 bg-green-900/50'
              : canClaim
                ? 'border-amber-500 bg-amber-900/50'
                : isUnlocked
                  ? 'border-stone-500 bg-stone-800/80'
                  : 'border-stone-700 bg-stone-900/80 opacity-60'
          }
        `}
      >
        {/* Status indicator */}
        <div
          className={`
          absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs
          ${
            mission.claimed
              ? 'bg-green-600 text-white'
              : canClaim
                ? 'bg-amber-500 text-black animate-pulse'
                : isUnlocked
                  ? 'bg-stone-600 text-stone-300'
                  : 'bg-stone-800 text-stone-500'
          }
        `}
        >
          {mission.claimed ? '✓' : canClaim ? '!' : isUnlocked ? '○' : '🔒'}
        </div>

        {/* Mission content */}
        <h3
          className={`font-bold ${mission.claimed ? 'text-green-300' : 'text-white'}`}
        >
          {mission.name}
        </h3>
        <p className="mt-1 text-xs text-stone-400 line-clamp-2">
          {mission.description}
        </p>

        {/* Conditions */}
        {mission.available && mission.available.length > 0 && !mission.claimed && (
          <div className="mt-3 space-y-1 border-t border-stone-700/50 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Requirements:
            </p>
            {mission.available.map((condition, idx) => (
              <p
                key={idx}
                className={`text-[11px] leading-tight ${
                  mission.completed ? 'text-green-500/70 line-through' : 'text-stone-300'
                }`}
              >
                • {formatCondition(condition)}
              </p>
            ))}
          </div>
        )}

        {/* Reward */}
        <div
          className={`mt-3 rounded px-2 py-1.5 text-xs ${
            mission.claimed ? 'bg-green-900/50' : 'bg-stone-900/50'
          }`}
        >
          <p className="text-stone-400 mb-1">Rewards:</p>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {mission.rewards.attackBonus && (
              <span className={mission.claimed ? 'text-green-400 line-through' : 'text-red-400'}>
                ⚔️ +{mission.rewards.attackBonus} Atk
              </span>
            )}
            {mission.rewards.defenceBonus && (
              <span className={mission.claimed ? 'text-green-400 line-through' : 'text-blue-400'}>
                🛡️ +{mission.rewards.defenceBonus} Def
              </span>
            )}
            {mission.rewards.hpBonus && (
              <span className={mission.claimed ? 'text-green-400 line-through' : 'text-pink-400'}>
                ❤️ +{mission.rewards.hpBonus} HP
              </span>
            )}
            {mission.rewards.divisionCapBonus && (
              <span className={mission.claimed ? 'text-green-400 line-through' : 'text-purple-400'}>
                👥 +{mission.rewards.divisionCapBonus} Cap
              </span>
            )}
            {mission.rewards.productionSpeedBonus && (
              <span className={mission.claimed ? 'text-green-400 line-through' : 'text-yellow-400'}>
                ⚡ {mission.rewards.productionSpeedBonus * 100}% Speed
              </span>
            )}
            {mission.rewards.gameVictory && (
              <span className={mission.claimed ? 'text-green-400 line-through' : 'text-amber-400'}>
                👑 Victory!
              </span>
            )}
          </div>
        </div>

        {/* Claim button */}
        {canClaim && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClaim(mission.id);
            }}
            className="nodrag nopan mt-3 w-full rounded bg-amber-600 py-2 text-center text-sm font-bold text-white transition-colors hover:bg-amber-500 cursor-pointer"
          >
            CLAIM REWARD
          </button>
        )}
      </div>

      {/* Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-stone-600 !w-3 !h-3"
      />
    </>
  );
}

export default memo(MissionNode);

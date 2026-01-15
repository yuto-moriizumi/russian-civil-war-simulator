'use client';

import { Mission } from '../types/game';

interface MissionPanelProps {
  missions: Mission[];
  onOpenMissions: () => void;
  onClaimMission: (missionId: string) => void;
}

export default function MissionPanel({
  missions,
  onOpenMissions,
  onClaimMission,
}: MissionPanelProps) {
  const completedMissions = missions.filter(m => m.completed && !m.claimed);

  return (
    <div className="absolute right-4 top-24 z-10 w-72 rounded-lg border border-stone-600 bg-stone-900/90 p-4">
      <div className="mb-4 flex items-center justify-between border-b border-stone-700 pb-2">
        <h2 className="text-sm font-bold tracking-wider text-stone-300">MISSIONS</h2>
        <button
          onClick={onOpenMissions}
          className="rounded bg-stone-700 px-3 py-1 text-xs text-stone-300 transition-colors hover:bg-stone-600"
        >
          View All
        </button>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {missions.slice(0, 4).map((mission) => (
          <div
            key={mission.id}
            className={`rounded border p-3 transition-colors ${
              mission.claimed
                ? 'border-stone-700 bg-stone-800/50 opacity-50'
                : mission.completed
                ? 'border-green-600 bg-green-900/30 cursor-pointer hover:bg-green-900/50'
                : 'border-stone-600 bg-stone-800'
            }`}
            onClick={() => mission.completed && !mission.claimed && onClaimMission(mission.id)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{mission.name}</span>
              {mission.claimed && <span className="text-green-400">✓</span>}
              {mission.completed && !mission.claimed && (
                <span className="rounded bg-green-600 px-2 py-0.5 text-xs text-white">Claim</span>
              )}
            </div>
            <p className="mt-1 text-xs text-stone-400">{mission.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
              {mission.rewards.attackBonus && (
                <span className="text-red-400">⚔️+{mission.rewards.attackBonus}</span>
              )}
              {mission.rewards.defenceBonus && (
                <span className="text-blue-400">🛡️+{mission.rewards.defenceBonus}</span>
              )}
              {mission.rewards.hpBonus && (
                <span className="text-pink-400">❤️+{mission.rewards.hpBonus}</span>
              )}
              {mission.rewards.divisionCapBonus && (
                <span className="text-purple-400">👥+{mission.rewards.divisionCapBonus}</span>
              )}
              {mission.rewards.productionSpeedBonus && (
                <span className="text-yellow-400">⚡{mission.rewards.productionSpeedBonus * 100}%</span>
              )}
              {mission.rewards.gameVictory && (
                <span className="text-amber-400">👑Win</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {completedMissions.length > 0 && (
        <div className="mt-3 rounded bg-green-900/30 p-2 text-center text-sm text-green-400">
          {completedMissions.length} mission(s) ready to claim!
        </div>
      )}
    </div>
  );
}

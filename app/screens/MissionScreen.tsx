'use client';

import { Mission } from '../types/game';

interface MissionScreenProps {
  missions: Mission[];
  onBack: () => void;
  onClaimMission: (missionId: string) => void;
}

export default function MissionScreen({ missions, onBack, onClaimMission }: MissionScreenProps) {
  // Check if prerequisites are met
  const canClaimMission = (mission: Mission) => {
    if (!mission.completed || mission.claimed) return false;
    return true;
  };

  // Check if mission is unlocked (prerequisites completed)
  const isMissionUnlocked = (mission: Mission) => {
    return mission.prerequisites.every(prereqId => {
      const prereq = missions.find(m => m.id === prereqId);
      return prereq?.claimed;
    });
  };

  // Draw connection lines between missions
  const getConnections = () => {
    const connections: { from: Mission; to: Mission }[] = [];
    missions.forEach(mission => {
      mission.prerequisites.forEach(prereqId => {
        const prereq = missions.find(m => m.id === prereqId);
        if (prereq) {
          connections.push({ from: prereq, to: mission });
        }
      });
    });
    return connections;
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900">
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between border-b border-stone-700 bg-stone-900/95 px-6 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded bg-stone-700 px-4 py-2 text-stone-300 transition-colors hover:bg-stone-600 hover:text-white"
        >
          <span>&larr;</span>
          <span>Back to Game</span>
        </button>
        <h1 className="text-2xl font-bold tracking-wider text-stone-200">MISSION TREE</h1>
        <div className="w-32" />
      </div>

      {/* Mission Tree Container */}
      <div className="relative z-10 min-h-[calc(100vh-80px)] overflow-auto p-8">
        {/* SVG for connection lines */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none" style={{ minHeight: '600px' }}>
          {getConnections().map(({ from, to }, index) => {
            const fromX = from.position.x;
            const fromY = from.position.y + 5;
            const toX = to.position.x;
            const toY = to.position.y - 5;
            
            const isCompleted = missions.find(m => m.id === from.id)?.claimed;
            
            return (
              <line
                key={index}
                x1={`${fromX}%`}
                y1={`${fromY}%`}
                x2={`${toX}%`}
                y2={`${toY}%`}
                stroke={isCompleted ? '#22c55e' : '#57534e'}
                strokeWidth="3"
                strokeDasharray={isCompleted ? 'none' : '8,4'}
              />
            );
          })}
        </svg>

        {/* Mission Nodes */}
        <div className="relative" style={{ minHeight: '600px' }}>
          {missions.map((mission) => {
            const unlocked = isMissionUnlocked(mission);
            const canClaim = canClaimMission(mission);
            
            return (
              <div
                key={mission.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ 
                  left: `${mission.position.x}%`, 
                  top: `${mission.position.y}%`,
                }}
              >
                <button
                  onClick={() => canClaim && onClaimMission(mission.id)}
                  disabled={!canClaim}
                  className={`
                    group relative w-56 rounded-lg border-2 p-4 text-left transition-all duration-300
                    ${mission.claimed 
                      ? 'border-green-600 bg-green-900/50 cursor-default' 
                      : canClaim
                      ? 'border-amber-500 bg-amber-900/50 cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20'
                      : unlocked
                      ? 'border-stone-500 bg-stone-800/80 cursor-default'
                      : 'border-stone-700 bg-stone-900/80 cursor-default opacity-60'
                    }
                  `}
                >
                  {/* Status indicator */}
                  <div className={`
                    absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs
                    ${mission.claimed 
                      ? 'bg-green-600 text-white' 
                      : canClaim 
                      ? 'bg-amber-500 text-black animate-pulse'
                      : unlocked
                      ? 'bg-stone-600 text-stone-300'
                      : 'bg-stone-800 text-stone-500'
                    }
                  `}>
                    {mission.claimed ? '✓' : canClaim ? '!' : unlocked ? '○' : '🔒'}
                  </div>

                  {/* Mission content */}
                  <h3 className={`font-bold ${mission.claimed ? 'text-green-300' : 'text-white'}`}>
                    {mission.name}
                  </h3>
                  <p className="mt-1 text-xs text-stone-400 line-clamp-2">
                    {mission.description}
                  </p>
                  
                  {/* Reward */}
                  <div className={`mt-3 flex items-center justify-between rounded px-2 py-1 text-xs ${
                    mission.claimed ? 'bg-green-900/50' : 'bg-stone-900/50'
                  }`}>
                    <span className="text-stone-400">Reward:</span>
                    <span className={mission.claimed ? 'text-green-400 line-through' : 'text-amber-400'}>
                      ${mission.rewards.money}
                    </span>
                  </div>

                  {/* Claim button overlay */}
                  {canClaim && (
                    <div className="mt-3 rounded bg-amber-600 py-2 text-center text-sm font-bold text-white transition-colors hover:bg-amber-500">
                      CLAIM REWARD
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 rounded-lg border border-stone-700 bg-stone-900/95 p-4">
        <h3 className="mb-3 text-xs font-bold tracking-wider text-stone-400">LEGEND</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-green-600 bg-green-900/50" />
            <span className="text-stone-300">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-amber-500 bg-amber-900/50" />
            <span className="text-stone-300">Ready to Claim</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-stone-500 bg-stone-800/80" />
            <span className="text-stone-300">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-stone-700 bg-stone-900/80 opacity-60" />
            <span className="text-stone-300">Locked</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 right-4 z-20 rounded-lg border border-stone-700 bg-stone-900/95 p-4">
        <div className="text-xs text-stone-400">
          <div>Completed: {missions.filter(m => m.claimed).length} / {missions.length}</div>
          <div className="mt-1">Ready to claim: {missions.filter(m => m.completed && !m.claimed).length}</div>
        </div>
      </div>
    </div>
  );
}

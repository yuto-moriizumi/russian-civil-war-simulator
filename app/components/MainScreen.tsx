'use client';

import { Country, GameSpeed, Mission } from '../types/game';

interface MainScreenProps {
  country: Country;
  dateTime: Date;
  isPlaying: boolean;
  gameSpeed: GameSpeed;
  money: number;
  income: number;
  infantryUnits: number;
  missions: Mission[];
  onTogglePlay: () => void;
  onChangeSpeed: (speed: GameSpeed) => void;
  onCreateInfantry: () => void;
  onOpenMissions: () => void;
  onClaimMission: (missionId: string) => void;
}

export default function MainScreen({
  country,
  dateTime,
  isPlaying,
  gameSpeed,
  money,
  income,
  infantryUnits,
  missions,
  onTogglePlay,
  onChangeSpeed,
  onCreateInfantry,
  onOpenMissions,
  onClaimMission,
}: MainScreenProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const completedMissions = missions.filter(m => m.completed && !m.claimed);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Map Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundColor: '#2d3a2d',
          backgroundImage: `
            radial-gradient(circle at 30% 40%, rgba(60,80,60,0.8) 0%, transparent 50%),
            radial-gradient(circle at 70% 60%, rgba(80,100,80,0.6) 0%, transparent 40%),
            radial-gradient(circle at 50% 30%, rgba(40,60,40,0.7) 0%, transparent 60%),
            linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5))
          `,
        }}
      >
        {/* Map grid overlay */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
        
        {/* Decorative map elements */}
        <div className="absolute left-[20%] top-[30%] text-stone-600 text-opacity-50 text-sm">Moscow</div>
        <div className="absolute left-[60%] top-[20%] text-stone-600 text-opacity-50 text-sm">Petrograd</div>
        <div className="absolute left-[40%] top-[60%] text-stone-600 text-opacity-50 text-sm">Kiev</div>
      </div>

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-stone-700 bg-stone-900/90 px-4 py-3">
        {/* Country Info */}
        <div className="flex items-center gap-4">
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-lg border-2 text-2xl"
            style={{ borderColor: country.color, backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            {country.flag}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{country.name}</h1>
            <p className="text-xs text-stone-400">The struggle continues...</p>
          </div>
        </div>

        {/* Date/Time Controls */}
        <div className="flex items-center gap-4 rounded-lg border border-stone-600 bg-stone-800/80 px-4 py-2">
          <div className="text-right">
            <div className="text-sm font-semibold text-white">{formatDate(dateTime)}</div>
            <div className="text-xs text-stone-400">{formatTime(dateTime)}</div>
          </div>
          
          <div className="h-8 w-px bg-stone-600" />
          
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
              isPlaying 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          {/* Speed Controls */}
          <div className="flex gap-1">
            {([1, 2, 3, 4, 5] as GameSpeed[]).map((speed) => (
              <button
                key={speed}
                onClick={() => onChangeSpeed(speed)}
                className={`h-8 w-8 rounded text-xs font-bold transition-colors ${
                  gameSpeed === speed
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div className="flex items-center gap-4">
          <div className="rounded-lg border border-amber-600/50 bg-stone-800/80 px-4 py-2">
            <div className="text-xs text-stone-400">Treasury</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-amber-400">${money}</span>
              <span className="text-sm text-green-400">+${income}/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel - Units */}
      <div className="absolute left-4 top-24 z-10 w-64 rounded-lg border border-stone-600 bg-stone-900/90 p-4">
        <h2 className="mb-4 border-b border-stone-700 pb-2 text-sm font-bold tracking-wider text-stone-300">
          MILITARY FORCES
        </h2>
        
        <div className="mb-4 flex items-center justify-between rounded bg-stone-800 p-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎖️</span>
            <div>
              <div className="text-sm font-semibold text-white">Infantry</div>
              <div className="text-xs text-stone-400">Ground forces</div>
            </div>
          </div>
          <div className="text-xl font-bold text-white">{infantryUnits}</div>
        </div>

        <button
          onClick={onCreateInfantry}
          className="w-full rounded border border-stone-500 bg-stone-800 py-3 text-sm font-semibold text-stone-300 transition-colors hover:border-green-500 hover:bg-stone-700 hover:text-white"
        >
          + Create Infantry Unit
        </button>
      </div>

      {/* Mission Window */}
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
              <div className="mt-2 text-xs text-amber-400">Reward: ${mission.rewards.money}</div>
            </div>
          ))}
        </div>

        {completedMissions.length > 0 && (
          <div className="mt-3 rounded bg-green-900/30 p-2 text-center text-sm text-green-400">
            {completedMissions.length} mission(s) ready to claim!
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-stone-700 bg-stone-900/90 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>Status: {isPlaying ? 'Time advancing...' : 'Paused'}</span>
          <span>Infantry Units: {infantryUnits}</span>
          <span>Active Missions: {missions.filter(m => !m.claimed).length}</span>
        </div>
      </div>
    </div>
  );
}

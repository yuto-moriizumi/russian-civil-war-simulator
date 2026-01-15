'use client';

import { GameSpeed } from '../types/game';

interface SpeedControlProps {
  isPlaying: boolean;
  gameSpeed: GameSpeed;
  onTogglePlay: () => void;
  onChangeSpeed: (speed: GameSpeed) => void;
}

export default function SpeedControl({
  isPlaying,
  gameSpeed,
  onTogglePlay,
  onChangeSpeed,
}: SpeedControlProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-stone-600 bg-stone-800/80 px-3 py-2">
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

      <div className="h-8 w-px bg-stone-600" />

      {/* Speed Buttons */}
      <div className="flex gap-1">
        {([1, 2, 8, 32, 128] as GameSpeed[]).map((speed) => (
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
  );
}

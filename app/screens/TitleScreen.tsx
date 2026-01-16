'use client';

interface TitleScreenProps {
  onStartGame: () => void;
  onContinue?: () => void;
  hasSave?: boolean;
  saveInfo?: { savedAt: Date; gameDate: Date } | null;
}

export default function TitleScreen({ 
  onStartGame, 
  onContinue, 
  hasSave, 
  saveInfo 
}: TitleScreenProps) {
  const formatSaveInfo = () => {
    if (!saveInfo) return '';
    const gameDate = saveInfo.gameDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return `Game: ${gameDate}`;
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 50px,
            rgba(255,255,255,0.1) 50px,
            rgba(255,255,255,0.1) 51px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 50px,
            rgba(255,255,255,0.1) 50px,
            rgba(255,255,255,0.1) 51px
          )`
        }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        {/* Title */}
        <div className="mb-4 text-center">
          <h1 className="mb-2 text-6xl font-bold tracking-wider text-red-600 drop-shadow-lg md:text-8xl"
              style={{ fontFamily: 'Georgia, serif', textShadow: '4px 4px 8px rgba(0,0,0,0.5)' }}>
            RUSSIAN
          </h1>
          <h2 className="text-4xl font-semibold tracking-widest text-stone-300 md:text-6xl"
              style={{ fontFamily: 'Georgia, serif' }}>
            CIVIL WAR
          </h2>
          <div className="mt-4 text-xl tracking-[0.3em] text-stone-500 md:text-2xl">
            1917 - 1922
          </div>
        </div>

        {/* Decorative elements */}
        <div className="my-8 flex items-center gap-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-stone-500 md:w-32" />
          <div className="text-4xl text-red-700">☭</div>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-stone-500 md:w-32" />
        </div>

        {/* Start button */}
        <button
          onClick={onStartGame}
          className="group relative mt-8 overflow-hidden rounded border-2 border-stone-600 bg-stone-800 px-12 py-4 text-xl font-semibold tracking-wider text-stone-200 transition-all duration-300 hover:border-red-600 hover:bg-stone-700 hover:text-white md:px-16 md:py-5 md:text-2xl"
        >
          <span className="relative z-10">NEW GAME</span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-red-900/50 to-transparent transition-transform duration-300 group-hover:translate-x-0" />
        </button>

        {/* Continue button - only shown if save exists */}
        {hasSave && onContinue && (
          <button
            onClick={onContinue}
            className="group relative mt-4 overflow-hidden rounded border-2 border-amber-700 bg-stone-800 px-12 py-4 text-xl font-semibold tracking-wider text-stone-200 transition-all duration-300 hover:border-amber-500 hover:bg-stone-700 hover:text-white md:px-16 md:py-5 md:text-2xl"
          >
            <span className="relative z-10">CONTINUE</span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-amber-900/50 to-transparent transition-transform duration-300 group-hover:translate-x-0" />
          </button>
        )}

        {/* Save info */}
        {hasSave && saveInfo && (
          <p className="mt-2 text-sm text-amber-400/70">
            {formatSaveInfo()}
          </p>
        )}

        {/* Subtitle */}
        <p className="mt-12 max-w-md text-center text-sm text-stone-500 md:text-base">
          Lead your country through the chaos of revolution. 
          Will you forge a new Soviet state or restore the Republic?
        </p>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-800 to-transparent" />
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
'use client';

import { Country } from '../types/game';
import { countries } from '../data/gameData';

interface CountrySelectScreenProps {
  onSelectCountry: (country: Country) => void;
  onBack: () => void;
}

export default function CountrySelectScreen({ onSelectCountry, onBack }: CountrySelectScreenProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900">
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-stone-700 bg-stone-900/80 px-6 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-stone-400 transition-colors hover:text-white"
        >
          <span className="text-xl">&larr;</span>
          <span>Back</span>
        </button>
        <h1 className="text-2xl font-bold tracking-wider text-stone-200">SELECT YOUR FACTION</h1>
        <div className="w-20" />
      </div>

      {/* Country selection */}
      <div className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col items-center justify-center gap-8 px-4 md:flex-row md:gap-16">
        {countries.map((country) => (
          <button
            key={country.id}
            onClick={() => onSelectCountry(country)}
            className="group relative w-full max-w-sm overflow-hidden rounded-lg border-2 border-stone-600 bg-stone-800/80 p-8 transition-all duration-300 hover:border-stone-400 hover:bg-stone-700/80 md:w-80"
          >
            {/* Flag background glow */}
            <div 
              className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-20"
              style={{ backgroundColor: country.color }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center">
              {/* Flag */}
              <div 
                className="mb-6 flex h-32 w-48 items-center justify-center overflow-hidden rounded border-4 transition-transform duration-300 group-hover:scale-110"
                style={{ 
                  borderColor: country.color,
                  backgroundColor: country.id === 'soviet' ? '#1a0000' : '#f5f5f5'
                }}
              >
                <img 
                  src={country.flag} 
                  alt={`${country.name} flag`}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Country name */}
              <h2 className="mb-4 text-2xl font-bold tracking-wide text-stone-100">
                {country.name}
              </h2>

              {/* Description */}
              <p className="text-center text-sm text-stone-400">
                {country.id === 'soviet' 
                  ? 'Lead the Bolshevik revolution and establish the world\'s first socialist state.'
                  : 'Defend the provisional government and fight for a democratic Russia.'
                }
              </p>

              {/* Select indicator */}
              <div className="mt-6 rounded border border-stone-500 px-6 py-2 text-sm font-semibold tracking-wider text-stone-400 transition-all duration-300 group-hover:border-white group-hover:bg-white group-hover:text-stone-900">
                SELECT
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

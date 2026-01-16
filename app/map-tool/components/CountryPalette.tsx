'use client';

import { useMemo } from 'react';
import { COUNTRY_METADATA } from '../../data/countries';
import { CountryId } from '../../types/game';

interface CountryPaletteProps {
  selectedCountry: CountryId;
  onSelectCountry: (country: CountryId) => void;
}

export default function CountryPalette({ selectedCountry, onSelectCountry }: CountryPaletteProps) {
  // Get paintable countries (filter out neutral/foreign or include all based on preference)
  const countries = useMemo(() => {
    return Object.values(COUNTRY_METADATA).filter(
      (country) => country.selectable !== false || country.id === 'neutral' || country.id === 'foreign'
    );
  }, []);

  return (
    <div className="rounded border border-gray-700 bg-gray-900 p-3">
      <h3 className="mb-3 text-sm font-semibold">Country Palette</h3>
      
      <div className="grid grid-cols-2 gap-2">
        {countries.map((country) => (
          <button
            key={country.id}
            onClick={() => onSelectCountry(country.id)}
            className={`flex items-center gap-2 rounded border px-2 py-2 text-left text-xs transition-colors ${
              selectedCountry === country.id
                ? 'border-blue-500 bg-blue-900/50'
                : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800'
            }`}
            title={country.name}
          >
            {/* Color swatch */}
            <div
              className="h-4 w-4 flex-shrink-0 rounded border border-gray-500"
              style={{ backgroundColor: country.color }}
            />
            
            {/* Country info */}
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{country.id}</div>
              <div className="truncate text-[10px] text-gray-400">{country.name}</div>
            </div>

            {/* Flag if available */}
            {country.flag && (
              <div className="h-4 w-6 flex-shrink-0 overflow-hidden rounded border border-gray-600">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={country.flag}
                  alt={country.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Quick access shortcuts hint */}
      <div className="mt-3 rounded bg-gray-800 p-2 text-[10px] text-gray-500">
        <div>• Left-click: Paint region</div>
        <div>• Right-click: Pick country (eyedropper)</div>
        <div>• Shift+Drag: Paint multiple</div>
      </div>
    </div>
  );
}

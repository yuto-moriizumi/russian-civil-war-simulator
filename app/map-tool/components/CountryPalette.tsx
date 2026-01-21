'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { COUNTRY_METADATA, getAllCountryIds } from '../../data/countryMetadata';
import { CountryId } from '../../types/game';

interface CountryPaletteProps {
  selectedCountry: CountryId;
  onSelectCountry: (country: CountryId) => void;
}

export default function CountryPalette({ selectedCountry, onSelectCountry }: CountryPaletteProps) {
  // Get paintable countries (include all countries for map tool)
  const countries = useMemo(() => {
    return getAllCountryIds().map(id => {
      const meta = COUNTRY_METADATA[id];
      return {
        id,
        name: meta.name,
        color: meta.color,
        flag: meta.flag,
        adjective: meta.adjective
      };
    });
  }, []);

  // Combo-box state
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const comboBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtered countries based on search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countries;
    const query = searchQuery.toLowerCase();
    return countries.filter(
      (country) =>
        country.id.toLowerCase().includes(query) ||
        country.name.toLowerCase().includes(query) ||
        country.adjective.toLowerCase().includes(query)
    );
  }, [countries, searchQuery]);

  // Ensure highlighted index is in bounds
  const validatedHighlightedIndex = Math.min(highlightedIndex, Math.max(0, filteredCountries.length - 1));

  // Get the currently selected country's name for display
  const selectedCountryName = useMemo(() => {
    const country = COUNTRY_METADATA[selectedCountry];
    return country ? `${country.id} - ${country.name}` : selectedCountry;
  }, [selectedCountry]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboBoxRef.current && !comboBoxRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsDropdownOpen(true);
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredCountries.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isDropdownOpen && filteredCountries[validatedHighlightedIndex]) {
        onSelectCountry(filteredCountries[validatedHighlightedIndex].id);
        setSearchQuery('');
        setIsDropdownOpen(false);
        setHighlightedIndex(0);
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      setIsDropdownOpen(false);
      setHighlightedIndex(0);
      inputRef.current?.blur();
    }
  };

  // Handle option selection
  const handleSelectOption = (countryId: CountryId) => {
    onSelectCountry(countryId);
    setSearchQuery('');
    setIsDropdownOpen(false);
    setHighlightedIndex(0);
    inputRef.current?.blur();
  };

  return (
    <div className="rounded border border-gray-700 bg-gray-900 p-3">
      <h3 className="mb-3 text-sm font-semibold">Country Palette</h3>
      
      {/* Combo-box with filtering */}
      <div ref={comboBoxRef} className="relative mb-3">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsDropdownOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedCountryName}
          className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400 hover:border-gray-500 focus:border-blue-500 focus:outline-none"
          aria-label="Search countries"
          aria-autocomplete="list"
          aria-controls="country-listbox"
          aria-expanded={isDropdownOpen}
        />
        
        {/* Dropdown list */}
        {isDropdownOpen && (
          <div
            id="country-listbox"
            role="listbox"
            className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded border border-gray-600 bg-gray-800 shadow-lg"
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country, index) => (
                <div
                  key={country.id}
                  role="option"
                  aria-selected={country.id === selectedCountry}
                  onClick={() => handleSelectOption(country.id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex cursor-pointer items-center gap-2 border-b border-gray-700 px-3 py-2 text-sm last:border-b-0 ${
                    index === validatedHighlightedIndex
                      ? 'bg-blue-600/50'
                      : country.id === selectedCountry
                      ? 'bg-blue-900/30'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  {/* Color swatch */}
                  <div
                    className="h-4 w-4 flex-shrink-0 rounded border border-gray-500"
                    style={{ backgroundColor: country.color }}
                  />
                  
                  {/* Country info */}
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold">{country.id}</span>
                    <span className="text-gray-400"> - {country.name}</span>
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
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-400">No countries found</div>
            )}
          </div>
        )}
      </div>
      
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

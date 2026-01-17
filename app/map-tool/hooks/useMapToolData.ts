"use client";

import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { CountryId } from "../../types/game";

interface UseMapToolDataReturn {
  coreRegions: Record<CountryId, string[]>;
  originalCoreRegions: Record<CountryId, string[]>;
  setCoreRegions: Dispatch<SetStateAction<Record<CountryId, string[]>>>;
  setOriginalCoreRegions: Dispatch<SetStateAction<Record<CountryId, string[]>>>;
}

export function useMapToolData(): UseMapToolDataReturn {
  const [coreRegions, setCoreRegions] = useState<Record<CountryId, string[]>>({} as Record<CountryId, string[]>);
  const [originalCoreRegions, setOriginalCoreRegions] = useState<Record<CountryId, string[]>>({} as Record<CountryId, string[]>);

  // Load initial ownership and core regions data from API (bypasses module caching)
  useEffect(() => {
    const loadInitialOwnership = async () => {
      try {
        const response = await fetch('/api/map-tool/load-ownership');
        if (!response.ok) throw new Error('Failed to load ownership data');
        const data = await response.json() as { ownership: Record<string, CountryId> };
        return data.ownership || {};
      } catch (error) {
        console.error('Error loading ownership:', error);
        return {};
      }
    };

    const loadInitialCoreRegions = async () => {
      try {
        const response = await fetch('/api/map-tool/load-core-regions');
        if (!response.ok) throw new Error('Failed to load core regions data');
        const data = await response.json() as { coreRegions: Record<CountryId, string[]> };
        return data.coreRegions || {} as Record<CountryId, string[]>;
      } catch (error) {
        console.error('Error loading core regions:', error);
        return {} as Record<CountryId, string[]>;
      }
    };

    Promise.all([loadInitialOwnership(), loadInitialCoreRegions()]).then(([initialOwnership, initialCoreRegions]) => {
      // Store for later use in GeoJSON handler
      const win = window as unknown as { 
        __initialRegionOwnership?: Record<string, CountryId>;
        __initialCoreRegions?: Record<CountryId, string[]>;
      };
      win.__initialRegionOwnership = initialOwnership;
      win.__initialCoreRegions = initialCoreRegions;
      
      // Initialize core regions state
      setCoreRegions(initialCoreRegions as Record<CountryId, string[]>);
      setOriginalCoreRegions({ ...initialCoreRegions } as Record<CountryId, string[]>);
    });
  }, []);

  return {
    coreRegions,
    originalCoreRegions,
    setCoreRegions,
    setOriginalCoreRegions,
  };
}

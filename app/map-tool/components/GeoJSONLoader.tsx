'use client';

import { useState, useCallback, useEffect } from 'react';
import type { FeatureCollection } from 'geojson';

interface GeoJSONLoaderProps {
  onLoad: (geojson: FeatureCollection, source: string) => void;
  isLoading: boolean;
}

export default function GeoJSONLoader({ onLoad }: GeoJSONLoaderProps) {
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load current project GeoJSON
  const handleLoadCurrent = useCallback(async () => {
    setLoadError(null);
    try {
      // Add cache-busting query parameter to force fresh GeoJSON
      const timestamp = Date.now();
      const response = await fetch(`/map/regions.geojson?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch GeoJSON');
      const data = await response.json();
      onLoad(data, 'Current project (regions.geojson)');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [onLoad]);

  // Auto-load on mount
  useEffect(() => {
    handleLoadCurrent();
  }, [handleLoadCurrent]);

  // Show error if loading failed
  if (loadError) {
    console.error('Failed to load GeoJSON:', loadError);
  }

  return null;
}

'use client';

import { useCallback } from 'react';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import {
  handleMapRegionClick,
  handleMapRegionContextMenu,
} from '../../application/gameController';

/**
 * MapLibre event adapter for the application layer.
 * The controller owns cross-store coordination; this hook only translates
 * map events into region IDs.
 */
export function useMapEventHandlers() {
  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    const regionId = e.features?.[0]?.id as string | undefined;
    if (regionId) {
      handleMapRegionClick(regionId);
    }
  }, []);

  const handleContextMenu = useCallback((e: MapLayerMouseEvent) => {
    e.preventDefault();
    const regionId = e.features?.[0]?.id as string | undefined;
    if (regionId) {
      handleMapRegionContextMenu(regionId);
    }
  }, []);

  return { handleMapClick, handleContextMenu };
}

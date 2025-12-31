'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RegionState, Adjacency } from '../types/game';
import { FACTION_COLORS, getAdjacentRegions } from '../utils/mapUtils';

interface GameMapProps {
  regions: RegionState;
  adjacency: Adjacency;
  selectedRegion: string | null;
  onRegionSelect: (regionId: string | null) => void;
  onRegionHover?: (regionId: string | null) => void;
}

export default function GameMap({
  regions,
  adjacency,
  selectedRegion,
  onRegionSelect,
  onRegionHover,
}: GameMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const hoveredRegionRef = useRef<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#1a2e1a',
            },
          },
        ],
      },
      center: [50, 55], // Center on Russia
      zoom: 3,
      minZoom: 2,
      maxZoom: 8,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add regions GeoJSON source
      map.current.addSource('regions', {
        type: 'geojson',
        data: '/map/regions.geojson',
        promoteId: 'shapeISO',
      });

      // Add fill layer for regions
      map.current.addLayer({
        id: 'regions-fill',
        type: 'fill',
        source: 'regions',
        paint: {
          'fill-color': '#808080',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.9,
            ['boolean', ['feature-state', 'hover'], false],
            0.8,
            ['boolean', ['feature-state', 'adjacent'], false],
            0.7,
            0.6,
          ],
        },
      });

      // Add border layer
      map.current.addLayer({
        id: 'regions-border',
        type: 'line',
        source: 'regions',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#FFD700',
            ['boolean', ['feature-state', 'hover'], false],
            '#FFFFFF',
            '#333333',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            3,
            ['boolean', ['feature-state', 'hover'], false],
            2,
            1,
          ],
        },
      });

      setMapLoaded(true);
    });

    // Click handler
    map.current.on('click', 'regions-fill', (e) => {
      if (e.features && e.features.length > 0) {
        const regionId = e.features[0].properties?.shapeISO;
        if (regionId) {
          onRegionSelect(regionId === selectedRegion ? null : regionId);
        }
      }
    });

    // Hover handlers
    map.current.on('mousemove', 'regions-fill', (e) => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = 'pointer';

      if (e.features && e.features.length > 0) {
        const regionId = e.features[0].properties?.shapeISO;
        if (regionId && regionId !== hoveredRegionRef.current) {
          // Clear previous hover
          if (hoveredRegionRef.current) {
            map.current.setFeatureState(
              { source: 'regions', id: hoveredRegionRef.current },
              { hover: false }
            );
          }
          // Set new hover
          map.current.setFeatureState(
            { source: 'regions', id: regionId },
            { hover: true }
          );
          hoveredRegionRef.current = regionId;
          setHoveredRegion(regionId);
          onRegionHover?.(regionId);
        }
      }
    });

    map.current.on('mouseleave', 'regions-fill', () => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = '';

      if (hoveredRegionRef.current) {
        map.current.setFeatureState(
          { source: 'regions', id: hoveredRegionRef.current },
          { hover: false }
        );
        hoveredRegionRef.current = null;
        setHoveredRegion(null);
        onRegionHover?.(null);
      }
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update region colors based on ownership
  const updateRegionColors = useCallback(() => {
    if (!map.current || !mapLoaded) return;

    // Build color expression from regions state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colorExpression: any[] = ['match', ['get', 'shapeISO']];
    
    for (const [id, region] of Object.entries(regions)) {
      colorExpression.push(id, FACTION_COLORS[region.owner]);
    }
    
    // Default color for unmatched regions
    colorExpression.push(FACTION_COLORS.neutral);

    map.current.setPaintProperty('regions-fill', 'fill-color', colorExpression);
  }, [regions, mapLoaded]);

  useEffect(() => {
    updateRegionColors();
  }, [updateRegionColors]);

  // Update selected region state
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear all feature states first
    map.current.removeFeatureState({ source: 'regions' });

    if (selectedRegion) {
      // Set selected state
      map.current.setFeatureState(
        { source: 'regions', id: selectedRegion },
        { selected: true }
      );

      // Highlight adjacent regions
      const adjacent = getAdjacentRegions(adjacency, selectedRegion);
      for (const adjId of adjacent) {
        map.current.setFeatureState(
          { source: 'regions', id: adjId },
          { adjacent: true }
        );
      }
    }
  }, [selectedRegion, adjacency, mapLoaded]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      
      {/* Region info tooltip - only show when no region is selected */}
      {!selectedRegion && hoveredRegion && regions[hoveredRegion] && (
        <div className="absolute left-4 bottom-16 z-10 rounded-lg border border-stone-600 bg-stone-900/90 p-3">
          <div className="text-sm font-bold text-white">
            {regions[hoveredRegion].name}
          </div>
          <div className="text-xs text-stone-400">
            ID: {hoveredRegion}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: FACTION_COLORS[regions[hoveredRegion].owner] }}
            />
            <span className="text-xs capitalize text-stone-300">
              {regions[hoveredRegion].owner}
            </span>
          </div>
          {regions[hoveredRegion].units > 0 && (
            <div className="mt-1 text-xs text-amber-400">
              Units: {regions[hoveredRegion].units}
            </div>
          )}
        </div>
      )}

      {/* Selected region info - bottom left */}
      {selectedRegion && regions[selectedRegion] && (
        <div className="absolute left-4 bottom-16 z-10 rounded-lg border-2 border-amber-500 bg-stone-900/95 p-4">
          <div className="mb-2 text-lg font-bold text-amber-400">
            {regions[selectedRegion].name}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-stone-400">Control:</span>
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: FACTION_COLORS[regions[selectedRegion].owner] }}
              />
              <span className="capitalize text-white">
                {regions[selectedRegion].owner}
              </span>
            </div>
            <div className="text-stone-400">
              Country: {regions[selectedRegion].countryIso3}
            </div>
            <div className="text-stone-400">
              Units: {regions[selectedRegion].units}
            </div>
            <div className="text-stone-400">
              Adjacent: {getAdjacentRegions(adjacency, selectedRegion).length} regions
            </div>
          </div>
          <button
            onClick={() => onRegionSelect(null)}
            className="mt-3 w-full rounded bg-stone-700 py-1 text-xs text-stone-300 hover:bg-stone-600"
          >
            Deselect
          </button>
        </div>
      )}
    </div>
  );
}

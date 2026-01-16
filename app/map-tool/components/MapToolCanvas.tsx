'use client';

import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import Map, { MapRef, Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CountryId } from '../../types/game';
import { getCountryColor } from '../../data/countries';

interface MapToolCanvasProps {
  geojson: FeatureCollection;
  ownership: Record<string, CountryId>;
  selectedCountry: CountryId;
  adjacency: Record<string, string[]> | null;
  showAdjacency: boolean;
  isPaintEnabled: boolean;
  onRegionPaint: (regionId: string) => void;
  onRegionHover: (regionId: string | null) => void;
  onCountryPick: (country: CountryId) => void;
}

export default function MapToolCanvas({
  geojson,
  ownership,
  selectedCountry,
  adjacency,
  showAdjacency,
  isPaintEnabled,
  onRegionPaint,
  onRegionHover,
  onCountryPick,
}: MapToolCanvasProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Create fill color expression based on ownership
  const fillColorExpression = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expression: any[] = ['match', ['get', 'regionId']];
    
    // Add all region colors
    for (const [regionId, owner] of Object.entries(ownership)) {
      expression.push(regionId, getCountryColor(owner));
    }
    
    // Default color for unmatched regions
    expression.push('#808080');
    
    return expression;
  }, [ownership]);

  // Line color expression for highlighting
  const lineColorExpression = useMemo(() => {
    return [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      '#FFFFFF',
      ['boolean', ['feature-state', 'adjacent'], false],
      '#FFFF00',
      '#333333'
    ];
  }, []);

  // Line width expression
  const lineWidthExpression = useMemo(() => {
    return [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      3,
      ['boolean', ['feature-state', 'adjacent'], false],
      2,
      1
    ];
  }, []);

  // Handle map load
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  // Handle click
  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const features = e.features;
      if (features && features.length > 0) {
        const regionId = features[0].properties?.regionId || features[0].properties?.shapeISO;
        if (regionId && isPaintEnabled) {
          onRegionPaint(regionId);
        }
      }
    },
    [onRegionPaint, isPaintEnabled]
  );

  // Handle right-click (eyedropper)
  const handleContextMenu = useCallback(
    (e: MapLayerMouseEvent) => {
      e.preventDefault();
      const features = e.features;
      if (features && features.length > 0) {
        const regionId = features[0].properties?.regionId || features[0].properties?.shapeISO;
        if (regionId && ownership[regionId]) {
          onCountryPick(ownership[regionId]);
        }
      }
    },
    [ownership, onCountryPick]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      const features = e.features;
      if (features && features.length > 0) {
        const regionId = features[0].properties?.regionId || features[0].properties?.shapeISO;
        
        if (regionId !== hoveredRegion) {
          setHoveredRegion(regionId);
          onRegionHover(regionId);
        }
      } else {
        setHoveredRegion(null);
        onRegionHover(null);
      }
    },
    [hoveredRegion, onRegionHover]
  );

  // Update feature-state for hover and adjacency highlighting
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const map = mapRef.current.getMap();
    
    // Clear all feature states
    if (map.getSource('regions')) {
      map.removeFeatureState({ source: 'regions' });
    }

    // Set hover state
    if (hoveredRegion) {
      map.setFeatureState(
        { source: 'regions', id: hoveredRegion },
        { hover: true }
      );

      // Set adjacent states if enabled
      if (showAdjacency && adjacency && adjacency[hoveredRegion]) {
        for (const adjRegion of adjacency[hoveredRegion]) {
          map.setFeatureState(
            { source: 'regions', id: adjRegion },
            { adjacent: true }
          );
        }
      }
    }
  }, [mapLoaded, hoveredRegion, showAdjacency, adjacency]);

  const mapStyle = useMemo(() => ({
    version: 8 as const,
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background' as const,
        paint: {
          'background-color': '#1a1a1a',
        },
      },
    ],
  }), []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fillPaint: any = {
    'fill-color': fillColorExpression,
    'fill-opacity': 0.8,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linePaint: any = {
    'line-color': lineColorExpression,
    'line-width': lineWidthExpression,
  };

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 50,
          latitude: 55,
          zoom: 3,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        minZoom={2}
        maxZoom={8}
        interactiveLayerIds={['regions-fill']}
        onClick={handleMapClick}
        onContextMenu={handleContextMenu}
        onMouseMove={handleMouseMove}
        onLoad={handleMapLoad}
        cursor={isPaintEnabled ? 'crosshair' : 'pointer'}
      >
        <Source
          id="regions"
          type="geojson"
          data={geojson}
          promoteId="regionId"
        >
          <Layer id="regions-fill" type="fill" paint={fillPaint} />
          <Layer id="regions-border" type="line" paint={linePaint} />
        </Source>

        <NavigationControl position="bottom-right" />
      </Map>

      {/* Tooltip */}
      {hoveredRegion && ownership[hoveredRegion] && (
        <div className="pointer-events-none absolute left-4 top-4 rounded border border-gray-600 bg-gray-800/95 px-3 py-2 text-sm shadow-lg">
          <div className="font-semibold">{hoveredRegion}</div>
          <div className="text-xs text-gray-400">
            Owner: {ownership[hoveredRegion]}
          </div>
          {showAdjacency && adjacency && adjacency[hoveredRegion] && (
            <div className="mt-1 text-xs text-gray-400">
              Adjacent: {adjacency[hoveredRegion].length}
            </div>
          )}
        </div>
      )}

      {/* Current brush indicator */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded border border-gray-600 bg-gray-800/95 px-3 py-2 text-sm shadow-lg">
        <div
          className="h-4 w-4 rounded border border-gray-500"
          style={{ backgroundColor: getCountryColor(selectedCountry) }}
        />
        <span className="font-semibold">{selectedCountry}</span>
        <span className="text-xs text-gray-400">
          ({isPaintEnabled ? 'Click to paint' : 'Paint disabled'})
        </span>
      </div>
    </div>
  );
}

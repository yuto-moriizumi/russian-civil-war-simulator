"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import Map, {
  MapRef,
  Source,
  Layer,
  NavigationControl,
} from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { CountryId } from "../../types/game";
import { getCountryColor } from "../../data/countries";

interface MapToolCanvasProps {
  geojson: FeatureCollection;
  ownership: Record<string, CountryId>;
  selectedCountry: CountryId;
  adjacency: Record<string, string[]> | null;
  showAdjacency: boolean;
  isPaintEnabled: boolean;
  editMode: 'ownership' | 'core';
  coreRegions: Record<CountryId, string[]>;
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
  editMode,
  coreRegions,
  onRegionPaint,
  onRegionHover,
  onCountryPick,
}: MapToolCanvasProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [hoveredRegionName, setHoveredRegionName] = useState<string | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(
    null
  );

  // Create a map of shapeID to region name for quick lookup
  const regionNames = useMemo(() => {
    const names: Record<string, string> = {};
    geojson.features.forEach((feature) => {
      const shapeId = feature.properties?.shapeID;
      const name =
        feature.properties?.shapeName ||
        feature.properties?.SHAPENAME ||
        feature.properties?.name ||
        feature.properties?.NAME;
      if (shapeId && name) {
        names[shapeId] = name;
      }
    });
    return names;
  }, [geojson]);

  // Create fill color expression based on ownership or core regions
  const fillColorExpression = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expression: any[] = ["match", ["get", "shapeID"]];

    if (editMode === 'ownership') {
      // Add all region colors
      for (const [regionId, owner] of Object.entries(ownership)) {
        expression.push(regionId, getCountryColor(owner));
      }
    } else {
      // In core regions mode, show the selected country's color for its core regions
      const selectedCountryCoreRegions = coreRegions[selectedCountry] || [];
      for (const [regionId, owner] of Object.entries(ownership)) {
        if (selectedCountryCoreRegions.includes(regionId)) {
          // Core region - show bright color
          expression.push(regionId, getCountryColor(selectedCountry));
        } else {
          // Non-core region - show dimmed color
          expression.push(regionId, "#404040");
        }
      }
    }

    // Default color for unmatched regions
    expression.push("#808080");

    return expression;
  }, [ownership, editMode, coreRegions, selectedCountry]);

  // Line color expression for highlighting
  const lineColorExpression = useMemo(() => {
    return [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      "#FFFFFF",
      ["boolean", ["feature-state", "adjacent"], false],
      "#FFFF00",
      "#333333",
    ];
  }, []);

  // Line width expression
  const lineWidthExpression = useMemo(() => {
    return [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      3,
      ["boolean", ["feature-state", "adjacent"], false],
      2,
      1,
    ];
  }, []);

  // Handle map load
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  // Handle click
  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      // Don't process clicks that were part of a drag
      if (isDragging) return;

      const features = e.features;
      if (features && features.length > 0) {
        const shapeId = features[0].properties?.shapeID;
        if (shapeId && isPaintEnabled) {
          onRegionPaint(shapeId);
        }
      }
    },
    [onRegionPaint, isPaintEnabled, isDragging]
  );

  // Handle right-click (eyedropper)
  const handleContextMenu = useCallback(
    (e: MapLayerMouseEvent) => {
      e.preventDefault();

      // In paint mode, right-click is used for panning, not eyedropper
      if (isPaintEnabled) return;

      const features = e.features;
      if (features && features.length > 0) {
        const shapeId = features[0].properties?.shapeID;
        if (shapeId && ownership[shapeId]) {
          onCountryPick(ownership[shapeId]);
        }
      }
    },
    [ownership, onCountryPick, isPaintEnabled]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      // Handle panning with right mouse button in paint mode
      if (isPanning && panStart && mapRef.current) {
        const dx = e.originalEvent.clientX - panStart.x;
        const dy = e.originalEvent.clientY - panStart.y;

        const map = mapRef.current.getMap();
        const center = map.getCenter();
        const zoom = map.getZoom();

        // Calculate movement in map coordinates
        const scale = 360 / (512 * Math.pow(2, zoom));
        const newLng = center.lng - dx * scale;
        const newLat =
          center.lat + dy * scale * Math.cos((center.lat * Math.PI) / 180);

        map.setCenter([newLng, newLat]);
        setPanStart({ x: e.originalEvent.clientX, y: e.originalEvent.clientY });
        return;
      }

      const features = e.features;
      if (features && features.length > 0) {
        const shapeId = features[0].properties?.shapeID;

        if (shapeId !== hoveredRegion) {
          setHoveredRegion(shapeId);
          setHoveredRegionName(regionNames[shapeId] || null);
          onRegionHover(shapeId);
        }

        // Paint while dragging in paint mode
        if (isPainting && isPaintEnabled && shapeId) {
          onRegionPaint(shapeId);
        }
      } else {
        setHoveredRegion(null);
        setHoveredRegionName(null);
        onRegionHover(null);
      }
    },
    [
      hoveredRegion,
      onRegionHover,
      isPainting,
      isPaintEnabled,
      onRegionPaint,
      isPanning,
      panStart,
      regionNames,
    ]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: MapLayerMouseEvent) => {
      if (isPaintEnabled) {
        if (e.originalEvent.button === 0) {
          // Left mouse button in paint mode - start painting
          setIsPainting(true);
          const features = e.features;
          if (features && features.length > 0) {
            const shapeId = features[0].properties?.shapeID;
            if (shapeId) {
              onRegionPaint(shapeId);
            }
          }
        } else if (e.originalEvent.button === 2) {
          // Right mouse button in paint mode - start panning
          setIsPanning(true);
          setPanStart({
            x: e.originalEvent.clientX,
            y: e.originalEvent.clientY,
          });
        }
      }
      setIsDragging(false);
    },
    [isPaintEnabled, onRegionPaint]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsPainting(false);
    setIsPanning(false);
    setPanStart(null);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setIsPainting(false);
  }, []);

  // Update feature-state for hover and adjacency highlighting
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const map = mapRef.current.getMap();

    // Clear all feature states
    if (map.getSource("regions")) {
      map.removeFeatureState({ source: "regions" });
    }

    // Set hover state
    if (hoveredRegion) {
      map.setFeatureState(
        { source: "regions", id: hoveredRegion },
        { hover: true }
      );

      // Set adjacent states if enabled
      if (showAdjacency && adjacency && adjacency[hoveredRegion]) {
        for (const adjRegion of adjacency[hoveredRegion]) {
          map.setFeatureState(
            { source: "regions", id: adjRegion },
            { adjacent: true }
          );
        }
      }
    }
  }, [mapLoaded, hoveredRegion, showAdjacency, adjacency]);

  const mapStyle = useMemo(
    () => ({
      version: 8 as const,
      sources: {},
      layers: [
        {
          id: "background",
          type: "background" as const,
          paint: {
            "background-color": "#1a1a1a",
          },
        },
      ],
    }),
    []
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fillPaint: any = {
    "fill-color": fillColorExpression,
    "fill-opacity": 0.8,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linePaint: any = {
    "line-color": lineColorExpression,
    "line-width": lineWidthExpression,
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
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        minZoom={2}
        maxZoom={8}
        interactiveLayerIds={["regions-fill"]}
        onClick={handleMapClick}
        onContextMenu={handleContextMenu}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onDragStart={handleDragStart}
        onLoad={handleMapLoad}
        cursor={isPaintEnabled ? "crosshair" : "pointer"}
        dragPan={isPaintEnabled ? false : true}
        dragRotate={false}
        touchZoomRotate={false}
        touchPitch={false}
      >
        <Source id="regions" type="geojson" data={geojson} promoteId="shapeID">
          <Layer id="regions-fill" type="fill" paint={fillPaint} />
          <Layer id="regions-border" type="line" paint={linePaint} />
        </Source>

        <NavigationControl position="bottom-right" />
      </Map>

      {/* Tooltip */}
      {hoveredRegion && ownership[hoveredRegion] && (
        <div className="pointer-events-none absolute left-4 top-4 rounded border border-gray-600 bg-gray-800/95 px-3 py-2 text-sm shadow-lg">
          {hoveredRegionName && (
            <div className="font-semibold text-white">{hoveredRegionName}</div>
          )}
          <div
            className={
              hoveredRegionName ? "text-xs text-gray-500" : "font-semibold"
            }
          >
            {hoveredRegion}
          </div>
          <div className="text-xs text-gray-400">
            Owner: {ownership[hoveredRegion]}
          </div>
          {editMode === 'core' && (
            <div className="mt-1 text-xs text-gray-400">
              Core of: {
                Object.entries(coreRegions)
                  .filter(([_, regions]) => regions.includes(hoveredRegion))
                  .map(([countryId]) => countryId)
                  .join(', ') || 'none'
              }
            </div>
          )}
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
          ({editMode === 'ownership' ? 'Ownership' : 'Core States'} | {isPaintEnabled ? "Left: Paint | Right: Pan" : "Paint disabled"})
        </span>
      </div>
    </div>
  );
}

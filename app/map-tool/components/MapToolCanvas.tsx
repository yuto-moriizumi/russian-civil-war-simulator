/* eslint-disable max-lines */
"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import Map, {
  MapRef,
  Marker,
  Source,
  Layer,
  NavigationControl,
} from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { CountryId } from "../../types/game";
import { getCountryColor, COUNTRY_FLAGS } from "../../data/countries";
import { UnitPlacementData } from "../../data/map/initialUnitPlacement";
import * as turf from "@turf/turf";

interface ArmyGroupDef {
  name: string;
  color: string;
}

interface MapToolCanvasProps {
  geojson: FeatureCollection;
  ownership: Record<string, CountryId>;
  selectedCountry: CountryId;
  adjacency: Record<string, string[]> | null;
  showAdjacency: boolean;
  isPaintEnabled: boolean;
  editMode: 'ownership' | 'core' | 'units';
  coreRegions: Record<CountryId, string[]>;
  // Unit placement props
  unitPlacement: UnitPlacementData;
  selectedArmyGroup: string | null;
  unitCountry: CountryId;
  armyGroupDefs: Record<CountryId, ArmyGroupDef[]>;
  onRegionPaint: (regionId: string) => void;
  onRegionHover: (regionId: string | null) => void;
  onCountryPick: (country: CountryId) => void;
  onPaintEnd: () => void;
  onRegionUnitAdd: (regionId: string) => void;
  onRegionUnitRemove: (regionId: string) => void;
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
  unitPlacement,
  selectedArmyGroup,
  unitCountry,
  armyGroupDefs,
  onRegionPaint,
  onRegionHover,
  onCountryPick,
  onPaintEnd,
  onRegionUnitAdd,
  onRegionUnitRemove,
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

  // Create a map of feature id to region name for quick lookup
  const regionNames = useMemo(() => {
    const names: Record<string, string> = {};
    geojson.features.forEach((feature) => {
      const shapeId = feature.id as string;
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

  // ── Unit placement helpers ─────────────────────────────────────────────────

  /** Total divisions in a region (across all countries) */
  const regionUnitTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const [regionId, entries] of Object.entries(unitPlacement)) {
      totals[regionId] = entries.reduce((s, e) => s + e.count, 0);
    }
    return totals;
  }, [unitPlacement]);

  /** Dominant owner per region (country with most divisions placed there) */
  const regionDominantOwner = useMemo(() => {
    const result: Record<string, CountryId> = {};
    for (const [regionId, entries] of Object.entries(unitPlacement)) {
      const countsByOwner: Partial<Record<CountryId, number>> = {};
      for (const e of entries) {
        countsByOwner[e.owner] = (countsByOwner[e.owner] ?? 0) + e.count;
      }
      const dominant = (Object.entries(countsByOwner) as [CountryId, number][])
        .sort(([, a], [, b]) => b - a)[0]?.[0];
      if (dominant) result[regionId] = dominant;
    }
    return result;
  }, [unitPlacement]);

  /** Region centroids derived from GeoJSON, keyed by canonical region ID (feature.id) */
  const regionCentroids = useMemo(() => {
    const centroids: Record<string, [number, number]> = {};
    for (const feature of geojson.features) {
      const props = feature.properties;
      if (!props) continue;
      const regionId = (feature.id as string) || props.regionId;
      if (!regionId) continue;
      try {
        const center = turf.centroid(feature as Feature<Geometry>);
        const [lng, lat] = center.geometry.coordinates;
        centroids[regionId] = [lng, lat];
      } catch {
        // skip features where centroid can't be computed
      }
    }
    return centroids;
  }, [geojson]);

  /** Army group color lookup by (country, name) */
  const armyGroupColor = useCallback(
    (country: CountryId, name: string): string => {
      const group = (armyGroupDefs[country] ?? []).find((g) => g.name === name);
      return group?.color ?? "#888888";
    },
    [armyGroupDefs]
  );

  // ── Fill color expression ──────────────────────────────────────────────────
  const fillColorExpression = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expression: any[] = ["match", ["id"]];

    if (editMode === 'ownership') {
      for (const [regionId, owner] of Object.entries(ownership)) {
        expression.push(regionId, getCountryColor(owner));
      }
    } else if (editMode === 'core') {
      const selectedCountryCoreRegions = coreRegions[selectedCountry] || [];
      for (const regionId of Object.keys(ownership)) {
        if (selectedCountryCoreRegions.includes(regionId)) {
          expression.push(regionId, getCountryColor(selectedCountry));
        } else {
          expression.push(regionId, "#404040");
        }
      }
    } else {
      // units mode – color by owner, same as ownership mode
      for (const [regionId, owner] of Object.entries(ownership)) {
        expression.push(regionId, getCountryColor(owner));
      }
    }

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
      if (isDragging) return;

      const features = e.features;
      if (!features || features.length === 0) return;
      const props = features[0].properties;

      if (editMode === 'units') {
        // Units mode uses feature.id as the canonical key
        const regionId = (props?.id as string) || (features[0].id as string) || props?.regionId;
        if (!regionId) return;
        // Left click = add division
        onRegionUnitAdd(regionId);
        return;
      }

      // Ownership/core mode uses feature.id as the canonical key
      const regionId = (features[0].id as string) || props?.regionId;
      if (!regionId) return;

      // Don't process clicks in paint mode - handled by mouseDown instead
      if (isPaintEnabled) return;

      onRegionPaint(regionId);
    },
    [onRegionPaint, onRegionUnitAdd, isDragging, isPaintEnabled, editMode]
  );

  // Handle right-click
  const handleContextMenu = useCallback(
    (e: MapLayerMouseEvent) => {
      e.preventDefault();

      const features = e.features;
      if (!features || features.length === 0) return;
      const props = features[0].properties;

      if (editMode === 'units') {
        // Right click = remove division
        const regionId = (features[0].id as string) || props?.regionId;
        if (!regionId) return;
        onRegionUnitRemove(regionId);
        return;
      }

      // In paint mode, right-click is used for panning, not eyedropper
      if (isPaintEnabled) return;

      // Ownership/core mode uses feature.id as the canonical key
      const regionId = (features[0].id as string) || props?.regionId;
      if (!regionId) return;

      if (ownership[regionId]) {
        onCountryPick(ownership[regionId]);
      }
    },
    [ownership, onCountryPick, isPaintEnabled, editMode, onRegionUnitRemove]
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
        const props = features[0].properties;
            const regionId = (features[0].id as string) || props?.regionId;

        if (regionId !== hoveredRegion) {
          setHoveredRegion(regionId);
          setHoveredRegionName(regionNames[regionId] || null);
          onRegionHover(regionId);
        }

        // Paint while dragging in paint mode (ownership/core only)
        if (isPainting && isPaintEnabled && regionId && editMode !== 'units') {
          onRegionPaint(regionId);
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
      editMode,
    ]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: MapLayerMouseEvent) => {
      if (editMode === 'units') {
        // Units mode: no drag-paint, just track for panning
        if (e.originalEvent.button === 2) {
          setIsPanning(true);
          setPanStart({
            x: e.originalEvent.clientX,
            y: e.originalEvent.clientY,
          });
        }
        setIsDragging(false);
        return;
      }

      if (isPaintEnabled) {
        if (e.originalEvent.button === 0) {
          setIsPainting(true);
          const features = e.features;
          if (features && features.length > 0) {
            const regionId = features[0].id as string;
            if (regionId) {
              onRegionPaint(regionId);
            }
          }
        } else if (e.originalEvent.button === 2) {
          setIsPanning(true);
          setPanStart({
            x: e.originalEvent.clientX,
            y: e.originalEvent.clientY,
          });
        }
      }
      setIsDragging(false);
    },
    [isPaintEnabled, onRegionPaint, editMode]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsPainting(false);
    setIsPanning(false);
    setPanStart(null);
    onPaintEnd();
  }, [onPaintEnd]);

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setIsPainting(false);
  }, []);

  // Update feature-state for hover and adjacency highlighting
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const map = mapRef.current.getMap();

    if (map.getSource("regions")) {
      map.removeFeatureState({ source: "regions" });
    }

    if (hoveredRegion) {
      map.setFeatureState(
        { source: "regions", id: hoveredRegion },
        { hover: true }
      );

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

  // Force update paint property when expressions change
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map.getLayer("regions-fill")) return;
    map.setPaintProperty("regions-fill", "fill-color", fillColorExpression);
  }, [mapLoaded, fillColorExpression]);


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
  const fillPaint: any = useMemo(() => ({
    "fill-color": fillColorExpression,
    "fill-opacity": 0.8,
  }), [fillColorExpression]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linePaint: any = useMemo(() => ({
    "line-color": lineColorExpression,
    "line-width": lineWidthExpression,
  }), [lineColorExpression, lineWidthExpression]);

  // Unit summary for the hovered region
  const hoveredUnitSummary = useMemo(() => {
    if (!hoveredRegion || editMode !== 'units') return null;
    const entries = unitPlacement[hoveredRegion];
    if (!entries || entries.length === 0) return null;
    return entries;
  }, [hoveredRegion, unitPlacement, editMode]);

  // Active army group color for brush indicator
  const activeBrushColor = useMemo(() => {
    if (editMode !== 'units' || !selectedArmyGroup) return getCountryColor(selectedCountry);
    return armyGroupColor(unitCountry, selectedArmyGroup);
  }, [editMode, selectedArmyGroup, selectedCountry, unitCountry, armyGroupColor]);

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
        cursor={
          editMode === 'units'
            ? (selectedArmyGroup ? "crosshair" : "not-allowed")
            : isPaintEnabled
            ? "crosshair"
            : "pointer"
        }
        dragPan={editMode !== 'units' && isPaintEnabled ? false : true}
        dragRotate={false}
        touchZoomRotate={false}
        touchPitch={false}
      >
        <Source id="regions" type="geojson" data={geojson} promoteId="id">
          <Layer 
            id="regions-fill" 
            type="fill" 
            paint={fillPaint}
          />
          <Layer 
            id="regions-border" 
            type="line" 
            paint={linePaint}
          />
        </Source>

        <NavigationControl position="bottom-right" />

        {/* Unit markers (units mode only) */}
        {editMode === 'units' && Object.entries(regionUnitTotals).map(([regionId, total]) => {
          const coords = regionCentroids[regionId];
          if (!coords) return null;
          const owner = regionDominantOwner[regionId] ?? ownership[regionId];
          const bgColor = owner ? getCountryColor(owner) : '#888888';
          const textColor = owner === 'white' ? '#000000' : '#ffffff';
          const textShadow = owner === 'white' ? 'none' : '1px 1px 1px rgba(0,0,0,0.5)';
          const flagUrl = owner ? COUNTRY_FLAGS[owner] : undefined;
          return (
            <Marker key={regionId} longitude={coords[0]} latitude={coords[1]} anchor="center">
              <div
                style={{
                  backgroundColor: bgColor,
                  border: '1px solid rgba(0,0,0,0.5)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  cursor: 'default',
                  pointerEvents: 'none',
                }}
              >
                {flagUrl ? (
                  <img
                    src={flagUrl}
                    alt={owner}
                    style={{ width: '16px', height: '11px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.3)', flexShrink: 0 }}
                  />
                ) : (
                  <span style={{ fontSize: '10px', lineHeight: '11px' }}>■</span>
                )}
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: textColor, textShadow }}>
                  {total}
                </span>
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* Tooltip */}
      {hoveredRegion && (
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
          {ownership[hoveredRegion] && (
            <div className="text-xs text-gray-400">
              Owner: {ownership[hoveredRegion]}
            </div>
          )}
          {editMode === 'core' && (
            <div className="mt-1 text-xs text-gray-400">
              Core of: {
                Object.entries(coreRegions)
                  .filter(([, regions]) => regions.includes(hoveredRegion))
                  .map(([countryId]) => countryId)
                  .join(', ') || 'none'
              }
            </div>
          )}
          {editMode === 'units' && hoveredUnitSummary && (
            <div className="mt-1 space-y-0.5">
              {hoveredUnitSummary.map((e, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="h-2 w-2 rounded-full border border-gray-500"
                    style={{ backgroundColor: armyGroupColor(e.owner, e.armyGroupName) }}
                  />
                  <span className="text-gray-300">
                    {e.owner} / {e.armyGroupName}:
                  </span>
                  <span className="font-semibold text-white">{e.count}</span>
                </div>
              ))}
              <div className="border-t border-gray-600 pt-0.5 text-[10px] text-gray-500">
                Total: {hoveredUnitSummary.reduce((s, e) => s + e.count, 0)}
              </div>
            </div>
          )}
          {editMode === 'units' && !hoveredUnitSummary && (
            <div className="mt-1 text-xs text-gray-500">No units placed</div>
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
          style={{ backgroundColor: activeBrushColor }}
        />
        {editMode === 'units' ? (
          <>
            <span className="font-semibold">{unitCountry}</span>
            <span className="text-xs text-gray-400">
              {selectedArmyGroup
                ? `| ${selectedArmyGroup} | Left: +div | Right: -div`
                : "| select army group in panel"}
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold">{selectedCountry}</span>
            <span className="text-xs text-gray-400">
              ({editMode === 'ownership' ? 'Ownership' : 'Core Regions'} | {isPaintEnabled ? "Left: Paint | Right: Pan" : "Paint disabled"})
            </span>
          </>
        )}
      </div>

    </div>
  );
}

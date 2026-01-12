'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Map, { MapRef, Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RegionState, Adjacency, FactionId, Movement, ActiveCombat, Theater } from '../types/game';
import { FACTION_COLORS, getAdjacentRegions } from '../utils/mapUtils';
import { useRegionCentroids } from './GameMap/mapHooks';
import { UnitMarker, MovingUnitMarker, CombatMarker } from './GameMap/MapMarkers';
import { RegionTooltip, RegionInfoPanel } from './GameMap/RegionPanels';

interface GameMapProps {
  regions: RegionState;
  adjacency: Adjacency;
  selectedRegion: string | null;
  selectedUnitRegion: string | null;
  movingUnits: Movement[];
  activeCombats: ActiveCombat[];
  currentDateTime: Date;
  playerFaction: FactionId;
  unitsInReserve: number;
  theaters: Theater[];
  selectedTheaterId: string | null;
  onRegionSelect: (regionId: string | null) => void;
  onUnitSelect: (regionId: string | null) => void;
  onRegionHover?: (regionId: string | null) => void;
  onDeployUnit: () => void;
  onMoveUnits: (fromRegion: string, toRegion: string, count: number) => void;
  onSelectCombat: (combatId: string | null) => void;
}

export default function GameMap({
  regions,
  adjacency,
  selectedRegion,
  selectedUnitRegion,
  movingUnits,
  activeCombats,
  currentDateTime,
  playerFaction,
  unitsInReserve,
  theaters,
  selectedTheaterId,
  onRegionSelect,
  onUnitSelect,
  onRegionHover,
  onDeployUnit,
  onMoveUnits,
  onSelectCombat,
}: GameMapProps) {
  const mapRef = useRef<MapRef>(null);
  const selectedUnitRegionRef = useRef<string | null>(null);
  const regionsRef = useRef<RegionState>(regions);
  const adjacencyRef = useRef<Adjacency>(adjacency);
  const onMoveUnitsRef = useRef(onMoveUnits);
  const onUnitSelectRef = useRef(onUnitSelect);
  const hoveredRegionIdRef = useRef<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Use custom hook to load region centroids
  const regionCentroids = useRegionCentroids();

  // Keep refs in sync with props for use in event handlers
  useEffect(() => {
    selectedUnitRegionRef.current = selectedUnitRegion;
  }, [selectedUnitRegion]);

  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  useEffect(() => {
    adjacencyRef.current = adjacency;
  }, [adjacency]);

  useEffect(() => {
    onMoveUnitsRef.current = onMoveUnits;
  }, [onMoveUnits]);

  useEffect(() => {
    onUnitSelectRef.current = onUnitSelect;
  }, [onUnitSelect]);

  // Handle map load event
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  // Set up native MapLibre hover handlers for better performance
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;

    const onMouseMove = (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
      if (e.features && e.features.length > 0) {
        const regionId = e.features[0].properties?.shapeISO;
        if (regionId && regionId !== hoveredRegionIdRef.current) {
          // Clear previous hover
          if (hoveredRegionIdRef.current) {
            map.setFeatureState(
              { source: 'regions', id: hoveredRegionIdRef.current },
              { hover: false }
            );
          }
          // Set new hover
          map.setFeatureState(
            { source: 'regions', id: regionId },
            { hover: true }
          );
          hoveredRegionIdRef.current = regionId;
          setHoveredRegion(regionId);
          onRegionHover?.(regionId);
        }
      }
      map.getCanvas().style.cursor = 'pointer';
    };

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      if (hoveredRegionIdRef.current) {
        map.setFeatureState(
          { source: 'regions', id: hoveredRegionIdRef.current },
          { hover: false }
        );
        hoveredRegionIdRef.current = null;
        setHoveredRegion(null);
        onRegionHover?.(null);
      }
    };

    map.on('mousemove', 'regions-fill', onMouseMove);
    map.on('mouseleave', 'regions-fill', onMouseLeave);

    return () => {
      map.off('mousemove', 'regions-fill', onMouseMove);
      map.off('mouseleave', 'regions-fill', onMouseLeave);
    };
  }, [mapLoaded, onRegionHover]);

  // Update feature states for selected regions, hover, and adjacent regions
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;

    // Clear all feature states except hover (hover is managed separately)
    map.removeFeatureState({ source: 'regions' });

    // Set theater frontline highlights (lowest priority)
    if (selectedTheaterId) {
      const theater = theaters.find(t => t.id === selectedTheaterId);
      if (theater) {
        for (const regionId of theater.frontlineRegions) {
          map.setFeatureState(
            { source: 'regions', id: regionId },
            { theaterFrontline: true }
          );
        }
      }
    }

    // Set selected region state
    if (selectedRegion) {
      map.setFeatureState(
        { source: 'regions', id: selectedRegion },
        { selected: true }
      );

      // Highlight adjacent regions
      const adjacent = getAdjacentRegions(adjacency, selectedRegion);
      for (const adjId of adjacent) {
        map.setFeatureState(
          { source: 'regions', id: adjId },
          { adjacent: true }
        );
      }
    }

    // If a unit is selected, also highlight adjacent regions for movement
    if (selectedUnitRegion && selectedUnitRegion !== selectedRegion) {
      const adjacent = getAdjacentRegions(adjacency, selectedUnitRegion);
      for (const adjId of adjacent) {
        map.setFeatureState(
          { source: 'regions', id: adjId },
          { adjacent: true }
        );
      }
    }

    // Restore hover state if there's a currently hovered region
    if (hoveredRegionIdRef.current) {
      map.setFeatureState(
        { source: 'regions', id: hoveredRegionIdRef.current },
        { hover: true }
      );
    }
  }, [selectedRegion, selectedUnitRegion, adjacency, mapLoaded, selectedTheaterId, theaters]);

  // Build color expression for region fill based on ownership
  const fillColorExpression = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expression: any[] = ['match', ['get', 'shapeISO']];
    
    for (const [id, region] of Object.entries(regions)) {
      expression.push(id, FACTION_COLORS[region.owner]);
    }
    
    // Default color for unmatched regions
    expression.push(FACTION_COLORS.neutral);
    
    return expression;
  }, [regions]);

  // Build line color expression using feature-state
  const lineColorExpression = useMemo(() => {
    return [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      '#FFD700',
      ['boolean', ['feature-state', 'theaterFrontline'], false],
      '#FF6B35',
      ['boolean', ['feature-state', 'hover'], false],
      '#FFFFFF',
      '#333333'
    ];
  }, []);

  // Build line width expression using feature-state
  const lineWidthExpression = useMemo(() => {
    return [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      3,
      ['boolean', ['feature-state', 'theaterFrontline'], false],
      3,
      ['boolean', ['feature-state', 'hover'], false],
      2,
      1
    ];
  }, []);

  // Build opacity expression for fill using feature-state for performance
  const fillOpacityExpression = useMemo(() => {
    return [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      0.9,
      ['boolean', ['feature-state', 'hover'], false],
      0.8,
      ['boolean', ['feature-state', 'adjacent'], false],
      0.7,
      0.6
    ];
  }, []);

  // Handle left-click on region
  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    const features = e.features;
    if (features && features.length > 0) {
      const regionId = features[0].properties?.shapeISO;
      if (regionId) {
        // If clicking on same region, deselect
        if (regionId === selectedRegion) {
          onRegionSelect(null);
          onUnitSelect(null);
        } else {
          onRegionSelect(regionId);
          // If this region has units owned by player, also select as unit
          const region = regions[regionId];
          if (region && region.owner === playerFaction && region.divisions.length > 0) {
            onUnitSelect(regionId);
          } else {
            onUnitSelect(null);
          }
        }
      }
    }
  }, [selectedRegion, regions, playerFaction, onRegionSelect, onUnitSelect]);

  // Handle right-click on region (context menu for unit movement)
  const handleContextMenu = useCallback((e: MapLayerMouseEvent) => {
    e.preventDefault();
    const features = e.features;
    if (features && features.length > 0) {
      const targetRegionId = features[0].properties?.shapeISO;
      const currentSelectedUnit = selectedUnitRegionRef.current;
      
      // Check if we have a unit selected and this is an adjacent region
      if (currentSelectedUnit && targetRegionId && targetRegionId !== currentSelectedUnit) {
        const adjacentRegions = getAdjacentRegions(adjacencyRef.current, currentSelectedUnit);
        if (adjacentRegions.includes(targetRegionId)) {
          const sourceRegion = regionsRef.current[currentSelectedUnit];
          if (sourceRegion && sourceRegion.divisions.length > 0) {
            // Move all units (or could use unitsToMove for partial)
            onMoveUnitsRef.current(currentSelectedUnit, targetRegionId, sourceRegion.divisions.length);
            onUnitSelectRef.current(null);
          }
        }
      }
    }
  }, []);

  // Calculate unit markers
  const unitMarkers = useMemo(() => {
    return Object.entries(regions)
      .filter(([, region]) => region.divisions.length > 0)
      .map(([regionId, region]) => {
        const centroid = regionCentroids[regionId];
        if (!centroid) return null;
        
        const isSelected = selectedUnitRegion === regionId;
        const isPlayerUnit = region.owner === playerFaction;
        
        return {
          regionId,
          region,
          centroid,
          isSelected,
          isPlayerUnit,
        };
      })
      .filter(Boolean);
  }, [regions, regionCentroids, selectedUnitRegion, playerFaction]);

  // Calculate moving unit markers
  const movingUnitMarkers = useMemo(() => {
    return movingUnits.map((movement) => {
      const fromCentroid = regionCentroids[movement.fromRegion];
      const toCentroid = regionCentroids[movement.toRegion];
      if (!fromCentroid || !toCentroid) return null;

      // Calculate current position based on progress
      const totalTime = movement.arrivalTime.getTime() - movement.departureTime.getTime();
      const elapsed = currentDateTime.getTime() - movement.departureTime.getTime();
      const progress = Math.min(1, Math.max(0, elapsed / totalTime));
      
      const currentLng = fromCentroid[0] + (toCentroid[0] - fromCentroid[0]) * progress;
      const currentLat = fromCentroid[1] + (toCentroid[1] - fromCentroid[1]) * progress;
      
      return {
        id: movement.id,
        movement,
        longitude: currentLng,
        latitude: currentLat,
      };
    }).filter(Boolean);
  }, [movingUnits, regionCentroids, currentDateTime]);

  // Calculate combat markers
  const combatMarkers = useMemo(() => {
    return activeCombats
      .filter(combat => !combat.isComplete)
      .map((combat) => {
        const centroid = regionCentroids[combat.regionId];
        if (!centroid || !Array.isArray(centroid) || centroid.length !== 2 || 
            typeof centroid[0] !== 'number' || typeof centroid[1] !== 'number' ||
            isNaN(centroid[0]) || isNaN(centroid[1])) {
          return null;
        }

        return {
          combat,
          centroid,
        };
      })
      .filter(Boolean);
  }, [activeCombats, regionCentroids]);

  // Memoize mapStyle to prevent unnecessary re-renders
  const mapStyle = useMemo(() => ({
    version: 8 as const,
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background' as const,
        paint: {
          'background-color': '#1a2e1a',
        },
      },
    ],
  }), []);

  // Memoize style object
  const mapContainerStyle = useMemo(() => ({ 
    width: '100%', 
    height: '100%' 
  }), []);

  // Memoize interactive layer IDs
  const interactiveLayerIds = useMemo(() => ['regions-fill'], []);

  // Memoize paint properties to prevent layer re-creation
  // MapLibre expressions require complex types that don't match react-map-gl's FillPaint/LinePaint
  const fillPaint = useMemo(() => ({
    'fill-color': fillColorExpression,
    'fill-opacity': fillOpacityExpression,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any), [fillColorExpression, fillOpacityExpression]);

  const linePaint = useMemo(() => ({
    'line-color': lineColorExpression,
    'line-width': lineWidthExpression,
    'line-dasharray': [
      'case',
      ['boolean', ['feature-state', 'theaterFrontline'], false],
      ['literal', [4, 2]],
      ['literal', [1, 0]]
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any), [lineColorExpression, lineWidthExpression]);

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 50,
          latitude: 55,
          zoom: 3,
        }}
        style={mapContainerStyle}
        mapStyle={mapStyle}
        minZoom={2}
        maxZoom={8}
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleMapClick}
        onContextMenu={handleContextMenu}
        onLoad={handleMapLoad}
      >
        {/* Regions GeoJSON source and layers */}
        <Source
          id="regions"
          type="geojson"
          data="/map/regions.geojson"
          promoteId="shapeISO"
        >
          {/* Fill layer for regions */}
          <Layer
            id="regions-fill"
            type="fill"
            paint={fillPaint}
          />

          {/* Border layer */}
          <Layer
            id="regions-border"
            type="line"
            paint={linePaint}
          />
        </Source>

        {/* Unit markers */}
        {unitMarkers.map((marker) => {
          if (!marker) return null;
          const { regionId, region, centroid, isSelected, isPlayerUnit } = marker;
          
          return (
            <UnitMarker
              key={regionId}
              regionId={regionId}
              region={region}
              centroid={centroid}
              isSelected={isSelected}
              isPlayerUnit={isPlayerUnit}
              onRegionSelect={onRegionSelect}
              onUnitSelect={onUnitSelect}
            />
          );
        })}

        {/* Moving unit markers */}
        {movingUnitMarkers.map((marker) => {
          if (!marker) return null;
          const { id, movement, longitude, latitude } = marker;
          
          return (
            <MovingUnitMarker
              key={id}
              id={id}
              movement={movement}
              longitude={longitude}
              latitude={latitude}
            />
          );
        })}

        {/* Combat markers */}
        {combatMarkers.map((marker) => {
          if (!marker) return null;
          const { combat, centroid } = marker;
          
          return (
            <CombatMarker
              key={combat.id}
              combat={combat}
              centroid={centroid}
              onSelectCombat={onSelectCombat}
            />
          );
        })}

        {/* Navigation controls */}
        <NavigationControl position="bottom-right" />
      </Map>
      
      {/* Region info tooltip - only show when no region is selected */}
      {!selectedRegion && hoveredRegion && regions[hoveredRegion] && (
        <RegionTooltip
          hoveredRegion={hoveredRegion}
          regions={regions}
        />
      )}

      {/* Selected region info - bottom left */}
      {selectedRegion && regions[selectedRegion] && (
        <RegionInfoPanel
          selectedRegion={selectedRegion}
          selectedUnitRegion={selectedUnitRegion}
          regions={regions}
          adjacency={adjacency}
          playerFaction={playerFaction}
          unitsInReserve={unitsInReserve}
          activeCombats={activeCombats}
          onRegionSelect={onRegionSelect}
          onUnitSelect={onUnitSelect}
          onDeployUnit={onDeployUnit}
        />
      )}
    </div>
  );
}

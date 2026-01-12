'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Map, { MapRef, Source, Layer, Marker, NavigationControl } from 'react-map-gl/maplibre';
import type { LayerProps } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RegionState, Adjacency, FactionId, Movement, ActiveCombat, Theater } from '../types/game';
import { FACTION_COLORS, getAdjacentRegions } from '../utils/mapUtils';

// Map faction to flag image URL
const FACTION_FLAGS: Record<FactionId, string> = {
  soviet: '/images/flags/soviet.svg',
  white: '/images/flags/white.svg',
  neutral: '',
  foreign: '',
};

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
  const [regionCentroids, setRegionCentroids] = useState<Record<string, [number, number]>>({});
  const [cursor, setCursor] = useState<string>('');
  const [mapLoaded, setMapLoaded] = useState(false);

  // Calculate centroid of a polygon
  const calculateCentroid = (coordinates: number[][][]): [number, number] => {
    let totalX = 0;
    let totalY = 0;
    let totalPoints = 0;
    
    // Handle MultiPolygon by iterating all rings
    for (const ring of coordinates) {
      for (const coord of ring) {
        totalX += coord[0];
        totalY += coord[1];
        totalPoints++;
      }
    }
    
    return [totalX / totalPoints, totalY / totalPoints];
  };

  // Load region centroids from GeoJSON
  useEffect(() => {
    const loadCentroids = async () => {
      try {
        const response = await fetch('/map/regions.geojson');
        const data = await response.json();
        const centroids: Record<string, [number, number]> = {};
        
        for (const feature of data.features) {
          const id = feature.properties?.shapeISO;
          if (!id) continue;
          
          const geometry = feature.geometry;
          if (geometry.type === 'Polygon') {
            centroids[id] = calculateCentroid(geometry.coordinates);
          } else if (geometry.type === 'MultiPolygon') {
            // For MultiPolygon, use the largest polygon's centroid
            let largestRing = geometry.coordinates[0];
            let maxPoints = 0;
            for (const polygon of geometry.coordinates) {
              const points = polygon[0]?.length || 0;
              if (points > maxPoints) {
                maxPoints = points;
                largestRing = polygon;
              }
            }
            centroids[id] = calculateCentroid(largestRing);
          }
        }
        
        console.log('Loaded region centroids:', Object.keys(centroids).length, 'regions');
        setRegionCentroids(centroids);
      } catch (error) {
        console.error('Failed to load centroids:', error);
      }
    };
    
    loadCentroids();
  }, []);

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
  const handleMapClick = useCallback((e: any) => {
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
  const handleContextMenu = useCallback((e: any) => {
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

  // Handle mouse move for hover state (more performant than mouseenter/leave)
  const handleMouseMove = useCallback((e: any) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    
    const features = e.features;
    if (features && features.length > 0) {
      const regionId = features[0].properties?.shapeISO;
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
        setCursor('pointer');
      }
    }
  }, [onRegionHover]);

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    
    setCursor('');
    if (hoveredRegionIdRef.current) {
      map.setFeatureState(
        { source: 'regions', id: hoveredRegionIdRef.current },
        { hover: false }
      );
      hoveredRegionIdRef.current = null;
    }
    setHoveredRegion(null);
    onRegionHover?.(null);
  }, [onRegionHover]);

  // Calculate unit markers
  const unitMarkers = useMemo(() => {
    return Object.entries(regions)
      .filter(([_, region]) => region.divisions.length > 0)
      .map(([regionId, region]) => {
        const centroid = regionCentroids[regionId];
        if (!centroid) return null;
        
        const isSelected = selectedUnitRegion === regionId;
        const isPlayerUnit = region.owner === playerFaction;
        const flagUrl = FACTION_FLAGS[region.owner];
        
        return {
          regionId,
          region,
          centroid,
          isSelected,
          isPlayerUnit,
          flagUrl,
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

      const flagUrl = FACTION_FLAGS[movement.owner];
      
      return {
        id: movement.id,
        movement,
        longitude: currentLng,
        latitude: currentLat,
        flagUrl,
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

        const attackerHp = combat.attackerDivisions.reduce((sum, d) => sum + d.hp, 0);
        const defenderHp = combat.defenderDivisions.reduce((sum, d) => sum + d.hp, 0);
        const attackerProgress = combat.initialAttackerHp > 0 
          ? (attackerHp / combat.initialAttackerHp) * 100 
          : 0;
        const defenderProgress = combat.initialDefenderHp > 0 
          ? (defenderHp / combat.initialDefenderHp) * 100 
          : 0;

        const attackerColor = FACTION_COLORS[combat.attackerFaction];
        const defenderColor = FACTION_COLORS[combat.defenderFaction];
        const attackerTextColor = combat.attackerFaction === 'white' ? '#000' : '#fff';
        const defenderTextColor = combat.defenderFaction === 'white' ? '#000' : '#fff';

        return {
          combat,
          centroid,
          attackerProgress,
          defenderProgress,
          attackerColor,
          defenderColor,
          attackerTextColor,
          defenderTextColor,
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
  const fillPaint = useMemo(() => ({
    'fill-color': fillColorExpression as any,
    'fill-opacity': fillOpacityExpression as any,
  }), [fillColorExpression, fillOpacityExpression]);

  const linePaint = useMemo(() => ({
    'line-color': lineColorExpression as any,
    'line-width': lineWidthExpression as any,
    'line-dasharray': [
      'case',
      ['boolean', ['feature-state', 'theaterFrontline'], false],
      ['literal', [4, 2]],
      ['literal', [1, 0]]
    ] as any,
  }), [lineColorExpression, lineWidthExpression]);

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
        cursor={cursor}
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleMapClick}
        onContextMenu={handleContextMenu}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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
          const { regionId, region, centroid, isSelected, isPlayerUnit, flagUrl } = marker;
          
          return (
            <Marker
              key={regionId}
              longitude={centroid[0]}
              latitude={centroid[1]}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onRegionSelect(regionId);
                if (isPlayerUnit) {
                  onUnitSelect(regionId);
                }
              }}
            >
              <div
                className="unit-marker"
                style={{
                  backgroundColor: FACTION_COLORS[region.owner],
                  border: isSelected ? '2px solid #22d3ee' : '1px solid rgba(0,0,0,0.5)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: isSelected ? '0 0 10px #22d3ee' : '0 2px 4px rgba(0,0,0,0.3)',
                  cursor: isPlayerUnit ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
              >
                {flagUrl ? (
                  <img
                    src={flagUrl}
                    alt={region.owner}
                    style={{
                      width: '16px',
                      height: '11px',
                      objectFit: 'cover',
                      border: '1px solid rgba(0,0,0,0.3)',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '14px' }}>&#9632;</span>
                )}
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: region.owner === 'white' ? '#000' : '#fff',
                    textShadow: region.owner === 'white' ? 'none' : '1px 1px 1px rgba(0,0,0,0.5)',
                  }}
                >
                  {region.divisions.length}
                </span>
              </div>
            </Marker>
          );
        })}

        {/* Moving unit markers */}
        {movingUnitMarkers.map((marker) => {
          if (!marker) return null;
          const { id, movement, longitude, latitude, flagUrl } = marker;
          
          return (
            <Marker
              key={id}
              longitude={longitude}
              latitude={latitude}
              anchor="center"
            >
              <div
                className="moving-unit-marker"
                style={{
                  backgroundColor: FACTION_COLORS[movement.owner],
                  border: '1px dashed #22d3ee',
                  borderRadius: '50%',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 0 8px rgba(34, 211, 238, 0.5)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              >
                {flagUrl ? (
                  <img
                    src={flagUrl}
                    alt={movement.owner}
                    style={{
                      width: '14px',
                      height: '9px',
                      objectFit: 'cover',
                      border: '1px solid rgba(0,0,0,0.3)',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '12px' }}>&#9632;</span>
                )}
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: movement.owner === 'white' ? '#000' : '#fff',
                  }}
                >
                  {movement.divisions.length}
                </span>
              </div>
            </Marker>
          );
        })}

        {/* Combat markers */}
        {combatMarkers.map((marker) => {
          if (!marker) return null;
          const {
            combat,
            centroid,
            attackerProgress,
            defenderProgress,
            attackerColor,
            defenderColor,
            attackerTextColor,
            defenderTextColor,
          } = marker;
          
          return (
            <Marker
              key={combat.id}
              longitude={centroid[0]}
              latitude={centroid[1]}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onSelectCombat(combat.id);
              }}
            >
              <div
                className="combat-marker"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
              >
                {/* Attacker side */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '2px' }}>
                  <div style={{
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: '0 6px',
                    minWidth: '35px',
                    borderRadius: '3px 0 0 3px',
                    backgroundColor: attackerColor,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: attackerTextColor,
                    }}>
                      {combat.attackerDivisions.length}
                    </span>
                  </div>
                  <div style={{ height: '3px', width: '100%', background: 'rgba(0,0,0,0.5)', borderRadius: '0 0 0 2px', marginTop: '1px' }}>
                    <div style={{ height: '100%', width: `${attackerProgress}%`, background: attackerColor, transition: 'width 0.3s' }}></div>
                  </div>
                </div>
                
                {/* Combat icon */}
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'radial-gradient(circle, #4a4a4a 0%, #2a2a2a 100%)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  border: '2px solid #666',
                  zIndex: 10,
                }}>
                  <span style={{ fontSize: '10px', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}>&#9876;</span>
                </div>
                
                {/* Defender side */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: '2px' }}>
                  <div style={{
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: '0 6px',
                    minWidth: '35px',
                    borderRadius: '0 3px 3px 0',
                    backgroundColor: defenderColor,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: defenderTextColor,
                    }}>
                      {combat.defenderDivisions.length}
                    </span>
                  </div>
                  <div style={{ height: '3px', width: '100%', background: 'rgba(0,0,0,0.5)', borderRadius: '0 0 2px 0', marginTop: '1px' }}>
                    <div style={{ height: '100%', width: `${defenderProgress}%`, background: defenderColor, transition: 'width 0.3s' }}></div>
                  </div>
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Navigation controls */}
        <NavigationControl position="bottom-right" />
      </Map>
      
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
          {regions[hoveredRegion].divisions.length > 0 && (
            <div className="mt-1 text-xs text-amber-400">
              Divisions: {regions[hoveredRegion].divisions.length} | 
              Total HP: {regions[hoveredRegion].divisions.reduce((sum, d) => sum + d.hp, 0)}
            </div>
          )}
        </div>
      )}

      {/* Selected region info - bottom left */}
      {selectedRegion && regions[selectedRegion] && (
        <div className={`absolute left-4 bottom-16 z-10 rounded-lg border-2 bg-stone-900/95 p-4 min-w-[280px] ${
          selectedUnitRegion === selectedRegion ? 'border-cyan-400' : 'border-amber-500'
        }`}>
          <div className={`mb-2 text-lg font-bold ${
            selectedUnitRegion === selectedRegion ? 'text-cyan-400' : 'text-amber-400'
          }`}>
            {regions[selectedRegion].name}
            {selectedUnitRegion === selectedRegion && (
              <span className="ml-2 text-xs font-normal">(Unit Selected)</span>
            )}
          </div>
          <div className="text-xs text-stone-500 -mt-1 mb-2">
            ID: {selectedRegion}
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
              Divisions: {regions[selectedRegion].divisions.length}
            </div>
            {/* Show division combat stats */}
            {regions[selectedRegion].divisions.length > 0 && (
              <div className="mt-2 space-y-1 rounded bg-stone-800 p-2">
                <div className="text-xs font-semibold text-stone-300 mb-1">Combat Stats:</div>
                {regions[selectedRegion].divisions.map((div) => (
                  <div key={div.id} className="flex items-center justify-between text-xs">
                    <span className="text-stone-400 truncate max-w-[120px]" title={div.name}>
                      {div.name.length > 15 ? div.name.substring(0, 15) + '...' : div.name}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-red-400" title="HP">❤ {div.hp}/{div.maxHp}</span>
                      <span className="text-orange-400" title="Attack">⚔ {div.attack}</span>
                      <span className="text-blue-400" title="Defence">🛡 {div.defence}</span>
                    </span>
                  </div>
                ))}
                <div className="border-t border-stone-700 pt-1 mt-1 flex justify-between text-xs font-semibold">
                  <span className="text-stone-300">Total:</span>
                  <span className="flex items-center gap-2">
                    <span className="text-red-400">❤ {regions[selectedRegion].divisions.reduce((sum, d) => sum + d.hp, 0)}</span>
                    <span className="text-orange-400">⚔ {regions[selectedRegion].divisions.reduce((sum, d) => sum + d.attack, 0)}</span>
                    <span className="text-blue-400">🛡 {Math.round(regions[selectedRegion].divisions.reduce((sum, d) => sum + d.defence, 0) / regions[selectedRegion].divisions.length)}</span>
                  </span>
                </div>
              </div>
            )}
            <div className="text-stone-400">
              Adjacent: {getAdjacentRegions(adjacency, selectedRegion).length} regions
            </div>
          </div>
          
          {/* Actions for player-owned regions */}
          {regions[selectedRegion].owner === playerFaction && (
            <div className="mt-3 space-y-2 border-t border-stone-700 pt-3">
              {/* Deploy unit button */}
              {unitsInReserve > 0 && (() => {
                const hasActiveCombat = activeCombats.some(c => c.regionId === selectedRegion && !c.isComplete);
                return (
                  <>
                    <button
                      onClick={onDeployUnit}
                      disabled={hasActiveCombat}
                      className={`w-full rounded py-2 text-sm font-semibold text-white ${
                        hasActiveCombat
                          ? 'bg-stone-600 cursor-not-allowed'
                          : 'bg-green-700 hover:bg-green-600'
                      }`}
                    >
                      Deploy Unit ({unitsInReserve} available)
                    </button>
                    {hasActiveCombat && (
                      <p className="text-xs text-red-400">
                        Cannot deploy to regions with ongoing combat
                      </p>
                    )}
                  </>
                );
              })()}
              
              {/* Unit selection info */}
              {regions[selectedRegion].divisions.length > 0 && selectedUnitRegion === selectedRegion && (
                <div className="space-y-2 rounded bg-cyan-900/30 p-2">
                  <p className="text-xs text-cyan-300">
                    Right-click an adjacent region to move {regions[selectedRegion].divisions.length} division(s)
                  </p>
                  <p className="text-xs text-stone-400">
                    Travel time: ~6 hours
                  </p>
                </div>
              )}
              
              {regions[selectedRegion].divisions.length > 0 && selectedUnitRegion !== selectedRegion && (
                <button
                  onClick={() => onUnitSelect(selectedRegion)}
                  className="w-full rounded bg-blue-700 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                >
                  Select Divisions ({regions[selectedRegion].divisions.length})
                </button>
              )}
            </div>
          )}

          {/* Show adjacent regions when unit is selected */}
          {selectedUnitRegion === selectedRegion && regions[selectedRegion].owner === playerFaction && (
            <div className="mt-3 space-y-1 border-t border-stone-700 pt-3">
              <p className="text-xs text-stone-400 mb-2">Adjacent regions (right-click to move):</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {getAdjacentRegions(adjacency, selectedRegion).map((adjId) => {
                  const adjRegion = regions[adjId];
                  if (!adjRegion) return null;
                  const isEnemy = adjRegion.owner !== playerFaction && adjRegion.owner !== 'neutral';
                  return (
                    <div
                      key={adjId}
                      className={`w-full rounded px-2 py-1 text-left text-xs ${
                        isEnemy 
                          ? 'bg-red-900/50 text-red-200' 
                          : adjRegion.owner === playerFaction
                          ? 'bg-green-900/50 text-green-200'
                          : 'bg-stone-700 text-stone-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{adjRegion.name}</span>
                        <span className="flex items-center gap-1">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: FACTION_COLORS[adjRegion.owner] }}
                          />
                          {adjRegion.divisions.length > 0 && <span>({adjRegion.divisions.length})</span>}
                        </span>
                      </div>
                      {isEnemy && adjRegion.divisions.length > 0 && (
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-red-300">
                          <span>❤ {adjRegion.divisions.reduce((sum, d) => sum + d.hp, 0)}</span>
                          <span>⚔ {adjRegion.divisions.reduce((sum, d) => sum + d.attack, 0)}</span>
                          <span>🛡 {Math.round(adjRegion.divisions.reduce((sum, d) => sum + d.defence, 0) / adjRegion.divisions.length)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <button
            onClick={() => {
              onRegionSelect(null);
              onUnitSelect(null);
            }}
            className="mt-3 w-full rounded bg-stone-700 py-1 text-xs text-stone-300 hover:bg-stone-600"
          >
            Deselect
          </button>
        </div>
      )}

      {/* Moving units indicator */}
      {movingUnits.length > 0 && (
        <div className="absolute right-4 bottom-16 z-10 rounded-lg border border-blue-500 bg-stone-900/95 p-3 min-w-[200px]">
          <div className="text-sm font-bold text-blue-400 mb-2">
            Units in Transit ({movingUnits.length})
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {movingUnits.map((movement) => {
              const fromRegion = regions[movement.fromRegion];
              const toRegion = regions[movement.toRegion];
              const totalTime = movement.arrivalTime.getTime() - movement.departureTime.getTime();
              const elapsed = currentDateTime.getTime() - movement.departureTime.getTime();
              const progress = Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
              
              return (
                <div key={movement.id} className="rounded bg-stone-800 p-2">
                  <div className="text-xs text-stone-300">
                    {movement.divisions.length} unit(s): {fromRegion?.name || movement.fromRegion} → {toRegion?.name || movement.toRegion}
                  </div>
                  <div className="mt-1 h-1 bg-stone-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    Arrives: {movement.arrivalTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

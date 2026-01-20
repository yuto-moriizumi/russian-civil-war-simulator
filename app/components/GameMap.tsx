'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Map, { MapRef, Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGameStore } from '../store/useGameStore';
import { getAdjacentRegions } from '../utils/mapUtils';

import { UnitMarker, MovingUnitMarker, CombatMarker } from './GameMap/MapMarkers';
import { RegionTooltip, RegionInfoPanel } from './GameMap/RegionPanels';
import { useMapState } from './GameMap/useMapState';
import {
  createMapModeFillColorExpression,
  createLineColorExpression,
  createLineWidthExpression,
  createFillOpacityExpression,
  createFillPaint,
  createLinePaint,
  createMapStyle,
} from './GameMap/mapStyles';
import {
  calculateUnitMarkers,
  calculateMovingUnitMarkers,
  calculateCombatMarkers,
} from './GameMap/mapCalculations';

export default function GameMap() {
  // Store selectors
  const regions = useGameStore(state => state.regions);
  const adjacency = useGameStore(state => state.adjacency);
  const selectedRegion = useGameStore(state => state.selectedRegion);
  const selectedUnitRegion = useGameStore(state => state.selectedUnitRegion);
  const movingUnits = useGameStore(state => state.movingUnits);
  const activeCombats = useGameStore(state => state.activeCombats);
  const currentDateTime = useGameStore(state => state.dateTime);
  const playerCountry = useGameStore(state => state.selectedCountry?.id);
  const theaters = useGameStore(state => state.theaters);
  const selectedTheaterId = useGameStore(state => state.selectedTheaterId);
  const selectedGroupId = useGameStore(state => state.selectedGroupId);
  const armyGroups = useGameStore(state => state.armyGroups);
  const mapMode = useGameStore(state => state.mapMode);
  const regionCentroids = useGameStore(state => state.regionCentroids);
  const getRelationship = useGameStore(state => state.getRelationship);
  
  // Actions
  const setSelectedRegion = useGameStore(state => state.setSelectedRegion);
  const setSelectedUnitRegion = useGameStore(state => state.setSelectedUnitRegion);
  const moveUnits = useGameStore(state => state.moveUnits);
  const setSelectedCombatId = useGameStore(state => state.setSelectedCombatId);
  const setSelectedCountryId = useGameStore(state => state.setSelectedCountryId);
  const setIsCountrySidebarOpen = useGameStore(state => state.setIsCountrySidebarOpen);
  
  // Local refs and state
  // Local refs and state
  const mapRef = useRef<MapRef>(null);
  const selectedUnitRegionRef = useRef<string | null>(null);
  const regionsRef = useRef(regions);
  const adjacencyRef = useRef(adjacency);
  const moveUnitsRef = useRef(moveUnits);
  const setSelectedUnitRegionRef = useRef(setSelectedUnitRegion);
  const setSelectedCountryIdRef = useRef(setSelectedCountryId);
  const setIsCountrySidebarOpenRef = useRef(setIsCountrySidebarOpen);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { hoveredRegion } = useMapState({
    mapRef,
    mapLoaded,
    selectedRegion,
    selectedUnitRegion,
    adjacency,
    theaters,
    selectedTheaterId,
    selectedGroupId,
    armyGroups,
    onRegionHover: undefined,
  });

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
    moveUnitsRef.current = moveUnits;
  }, [moveUnits]);

  useEffect(() => {
    setSelectedUnitRegionRef.current = setSelectedUnitRegion;
  }, [setSelectedUnitRegion]);

  useEffect(() => {
    setSelectedCountryIdRef.current = setSelectedCountryId;
  }, [setSelectedCountryId]);

  useEffect(() => {
    setIsCountrySidebarOpenRef.current = setIsCountrySidebarOpen;
  }, [setIsCountrySidebarOpen]);

  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  // Map style expressions
  const fillColorExpression = useMemo(() => 
    playerCountry ? createMapModeFillColorExpression(mapMode, regions, playerCountry, getRelationship) : ['case', ['has', 'shapeISO'], '#555', '#000'], 
    [mapMode, regions, playerCountry, getRelationship]
  );
  const lineColorExpression = useMemo(() => createLineColorExpression(), []);
  const lineWidthExpression = useMemo(() => createLineWidthExpression(), []);
  const fillOpacityExpression = useMemo(() => createFillOpacityExpression(), []);

  // Event handlers
  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const features = e.features;
      if (features && features.length > 0) {
        // Use shapeISO (like 'RU-TA') which matches the region keys in our state
        const regionId = features[0].properties?.shapeISO || features[0].properties?.regionId || features[0].properties?.shapeID;
        if (regionId) {
          // If clicking on same region, deselect
          if (regionId === selectedRegion) {
            setSelectedRegion(null);
            setSelectedUnitRegion(null);
          } else {
            setSelectedRegion(regionId);
            // If this region has units owned by player, also select as unit
            const region = regions[regionId];
            if (region && region.owner === playerCountry && region.divisions.length > 0) {
              setSelectedUnitRegion(regionId);
            } else {
              setSelectedUnitRegion(null);
            }
          }
        }
      }
    },
    [selectedRegion, regions, playerCountry, setSelectedRegion, setSelectedUnitRegion]
  );

  const handleContextMenu = useCallback(
    (e: MapLayerMouseEvent) => {
      e.preventDefault();
      const features = e.features;
      if (features && features.length > 0) {
        // Use shapeISO (like 'RU-TA') which matches the region keys in our state
        const targetRegionId = features[0].properties?.shapeISO || features[0].properties?.regionId || features[0].properties?.shapeID;
        const currentSelectedUnit = selectedUnitRegionRef.current;
        
        let moved = false;
        // Check if we have a unit selected and this is an adjacent region
        if (currentSelectedUnit && targetRegionId && targetRegionId !== currentSelectedUnit) {
          const adjacentRegions = getAdjacentRegions(adjacencyRef.current, currentSelectedUnit);
          if (adjacentRegions.includes(targetRegionId)) {
            const sourceRegion = regionsRef.current[currentSelectedUnit];
            if (sourceRegion && sourceRegion.divisions.length > 0) {
              // Move all units (or could use unitsToMove for partial)
              moveUnitsRef.current(currentSelectedUnit, targetRegionId, sourceRegion.divisions.length);
              setSelectedUnitRegionRef.current(null);
              moved = true;
            }
          }
        }

        // Open country sidebar for the target region's owner if not moved
        if (!moved && targetRegionId) {
          const targetRegion = regionsRef.current[targetRegionId];
          if (targetRegion) {
            setSelectedCountryIdRef.current(targetRegion.owner);
            setIsCountrySidebarOpenRef.current(true);
          }
        }
      }
    },
    []
  );

  // Calculate markers
  const unitMarkers = useMemo(
    () => playerCountry ? calculateUnitMarkers(regions, regionCentroids, selectedUnitRegion, playerCountry) : [],
    [regions, regionCentroids, selectedUnitRegion, playerCountry]
  );

  const movingUnitMarkers = useMemo(
    () => calculateMovingUnitMarkers(movingUnits, regionCentroids, currentDateTime),
    [movingUnits, regionCentroids, currentDateTime]
  );

  const combatMarkers = useMemo(
    () => calculateCombatMarkers(activeCombats, regionCentroids),
    [activeCombats, regionCentroids]
  );

  // Memoized style objects
  const mapStyle = useMemo(() => createMapStyle(), []);
  const mapContainerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  const interactiveLayerIds = useMemo(() => ['regions-fill'], []);
  const fillPaint = useMemo(
    () => createFillPaint(fillColorExpression, fillOpacityExpression),
    [fillColorExpression, fillOpacityExpression]
  );
  const linePaint = useMemo(
    () => createLinePaint(lineColorExpression, lineWidthExpression),
    [lineColorExpression, lineWidthExpression]
  );

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
        <Source
          id="regions"
          type="geojson"
          data="/map/regions.geojson"
          promoteId="shapeID"
        >
          <Layer id="regions-fill" type="fill" paint={fillPaint} />
          <Layer id="regions-border" type="line" paint={linePaint} />
        </Source>

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
              onRegionSelect={setSelectedRegion}
              onUnitSelect={setSelectedUnitRegion}
            />
          );
        })}

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

        {combatMarkers.map((marker) => {
          if (!marker) return null;
          const { combat, centroid } = marker;
          
          return (
            <CombatMarker
              key={combat.id}
              combat={combat}
              centroid={centroid}
              onSelectCombat={setSelectedCombatId}
            />
          );
        })}

        <NavigationControl position="bottom-right" />
      </Map>
      
      {!selectedRegion && hoveredRegion && regions[hoveredRegion] && (
        <RegionTooltip hoveredRegion={hoveredRegion} />
      )}

      {selectedRegion && regions[selectedRegion] && playerCountry && (
        <RegionInfoPanel />
      )}
    </div>
  );
}

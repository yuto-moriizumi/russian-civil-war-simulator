'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import Map, { MapRef, Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGameStore } from '../store/useGameStore';

import { UnitMarker, MovingUnitMarker, CombatMarker } from './GameMap/MapMarkers';
import { RegionTooltip, RegionInfoPanel, MovingUnitInfoPanel, DivisionSelectionPanel } from './GameMap/RegionPanels';
import { useMapState } from './GameMap/useMapState';
import { useMapEventHandlers } from './GameMap/useMapEventHandlers';
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
  const playerCoreRegions = useGameStore(state => state.selectedCountry?.coreRegions);
  const theaters = useGameStore(state => state.theaters);
  const selectedTheaterId = useGameStore(state => state.selectedTheaterId);
  const selectedGroupId = useGameStore(state => state.selectedGroupId);
  const armyGroups = useGameStore(state => state.armyGroups);
  const mapMode = useGameStore(state => state.mapMode);
  const regionCentroids = useGameStore(state => state.regionCentroids);
  const getRelationship = useGameStore(state => state.getRelationship);
  const selectedMovementId = useGameStore(state => state.selectedMovementId);
  const selectedDivisionIds = useGameStore(state => state.selectedDivisionIds);

  // Actions
  const setSelectedRegion = useGameStore(state => state.setSelectedRegion);
  const setSelectedUnitRegion = useGameStore(state => state.setSelectedUnitRegion);
  const selectDivisionsInRegion = useGameStore(state => state.selectDivisionsInRegion);
  const addDivisionsInRegion = useGameStore(state => state.addDivisionsInRegion);
  const setSelectedCombatId = useGameStore(state => state.setSelectedCombatId);
  const setSelectedMovementId = useGameStore(state => state.setSelectedMovementId);

  // Local refs and state
  const mapRef = useRef<MapRef>(null);
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

  const { handleMapClick, handleContextMenu } = useMapEventHandlers(
    selectedRegion,
    regions,
    playerCountry,
    setSelectedRegion,
    setSelectedUnitRegion,
    setSelectedMovementId,
  );

  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  /**
   * Handles clicking a unit marker on the map.
   * - Normal click: select all divisions in that region (replaces current selection).
   * - Shift+click: add all divisions in that region to the existing selection.
   */
  const handleDivisionSelect = useCallback(
    (regionId: string, shiftHeld: boolean) => {
      if (shiftHeld && selectedDivisionIds.length > 0) {
        addDivisionsInRegion(regionId);
      } else {
        selectDivisionsInRegion(regionId);
      }
    },
    [selectedDivisionIds, addDivisionsInRegion, selectDivisionsInRegion]
  );

  // Map style expressions
  const fillColorExpression = useMemo(() =>
    playerCountry ? createMapModeFillColorExpression(mapMode, regions, playerCountry, playerCoreRegions, getRelationship) : ['case', ['boolean', ['has', 'countryIso3'], false], '#555', '#000'],
    [mapMode, regions, playerCountry, playerCoreRegions, getRelationship]
  );
  const lineColorExpression = useMemo(() => createLineColorExpression(), []);
  const lineWidthExpression = useMemo(() => createLineWidthExpression(), []);
  const fillOpacityExpression = useMemo(() => createFillOpacityExpression(), []);

  // Calculate markers
  const unitMarkers = useMemo(
    () => playerCountry ? calculateUnitMarkers(regions, regionCentroids, selectedUnitRegion, playerCountry, selectedDivisionIds) : [],
    [regions, regionCentroids, selectedUnitRegion, playerCountry, selectedDivisionIds]
  );

  const movingUnitMarkers = useMemo(
    () => calculateMovingUnitMarkers(movingUnits, regionCentroids, currentDateTime),
    [movingUnits, regionCentroids, currentDateTime]
  );

  const combatMarkers = useMemo(
    () => calculateCombatMarkers(activeCombats, regionCentroids),
    [activeCombats, regionCentroids]
  );

  /**
   * Build a GeoJSON LineString for the selected movement's planned path.
   */
  const movementPathGeoJSON = useMemo(() => {
    const features: { type: 'Feature'; geometry: { type: 'LineString'; coordinates: [number, number][] }; properties: { movementId: string } }[] = [];

    const movementsToShow: typeof movingUnits = [];
    if (selectedMovementId) {
      const m = movingUnits.find(mu => mu.id === selectedMovementId);
      if (m) movementsToShow.push(m);
    } else if (selectedUnitRegion) {
      movementsToShow.push(...movingUnits.filter(mu => mu.fromRegion === selectedUnitRegion));
    }

    for (const movement of movementsToShow) {
      const fullPath = [movement.fromRegion, movement.toRegion, ...(movement.remainingPath ?? [])];
      const coordinates: [number, number][] = [];
      for (const regionId of fullPath) {
        const centroid = regionCentroids[regionId];
        if (centroid) coordinates.push([centroid[0], centroid[1]]);
      }
      if (coordinates.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates },
          properties: { movementId: movement.id },
        });
      }
    }

    return { type: 'FeatureCollection' as const, features };
  }, [selectedMovementId, selectedUnitRegion, movingUnits, regionCentroids]);

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
        initialViewState={{ longitude: 50, latitude: 55, zoom: 3 }}
        style={mapContainerStyle}
        mapStyle={mapStyle}
        minZoom={2}
        maxZoom={8}
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleMapClick}
        onContextMenu={handleContextMenu}
        onLoad={handleMapLoad}
      >
        <Source id="regions" type="geojson" data="/map/regions.geojson" promoteId="id">
          <Layer id="regions-fill" type="fill" paint={fillPaint} />
          <Layer id="regions-border" type="line" paint={linePaint} />
        </Source>

        {/* Movement path overlay */}
        <Source id="movement-path" type="geojson" data={movementPathGeoJSON}>
          <Layer
            id="movement-path-glow"
            type="line"
            paint={{ 'line-color': '#22d3ee', 'line-width': 8, 'line-opacity': 0.25, 'line-blur': 4 }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
          <Layer
            id="movement-path-line"
            type="line"
            paint={{ 'line-color': '#22d3ee', 'line-width': 2.5, 'line-opacity': 0.9, 'line-dasharray': [4, 3] }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
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
              onDivisionSelect={handleDivisionSelect}
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
              isSelected={selectedMovementId === movement.id || (selectedDivisionIds.length > 0 && movement.divisions.some(d => selectedDivisionIds.includes(d.id)))}
              isPlayerUnit={movement.owner === playerCountry}
              onSelect={setSelectedMovementId}
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

      {selectedDivisionIds.length > 0 && !selectedRegion && (
        <DivisionSelectionPanel />
      )}

      {selectedMovementId && !selectedRegion && selectedDivisionIds.length === 0 && (
        <MovingUnitInfoPanel />
      )}
    </div>
  );
}

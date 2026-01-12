'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Map, { MapRef, Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import type { MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RegionState, Adjacency, FactionId, Movement, ActiveCombat, Theater } from '../types/game';
import { getAdjacentRegions } from '../utils/mapUtils';
import { useRegionCentroids } from './GameMap/mapHooks';
import { UnitMarker, MovingUnitMarker, CombatMarker } from './GameMap/MapMarkers';
import { RegionTooltip, RegionInfoPanel } from './GameMap/RegionPanels';
import { createMapClickHandler, createContextMenuHandler } from './GameMap/mapInteractions';
import { useMapState } from './GameMap/useMapState';
import {
  createFillColorExpression,
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
  const [mapLoaded, setMapLoaded] = useState(false);

  const regionCentroids = useRegionCentroids();

  const { hoveredRegion } = useMapState({
    mapRef,
    mapLoaded,
    selectedRegion,
    selectedUnitRegion,
    adjacency,
    theaters,
    selectedTheaterId,
    onRegionHover,
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
    onMoveUnitsRef.current = onMoveUnits;
  }, [onMoveUnits]);

  useEffect(() => {
    onUnitSelectRef.current = onUnitSelect;
  }, [onUnitSelect]);

  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  // Map style expressions
  const fillColorExpression = useMemo(() => createFillColorExpression(regions), [regions]);
  const lineColorExpression = useMemo(() => createLineColorExpression(), []);
  const lineWidthExpression = useMemo(() => createLineWidthExpression(), []);
  const fillOpacityExpression = useMemo(() => createFillOpacityExpression(), []);

  // Event handlers
  const handleMapClick = useCallback(
    createMapClickHandler({
      selectedRegion,
      regions,
      playerFaction,
      onRegionSelect,
      onUnitSelect,
    }),
    [selectedRegion, regions, playerFaction, onRegionSelect, onUnitSelect]
  );

  const handleContextMenu = useCallback(
    createContextMenuHandler({
      selectedUnitRegionRef,
      regionsRef,
      adjacencyRef,
      onMoveUnitsRef,
      onUnitSelectRef,
    }),
    []
  );

  // Calculate markers
  const unitMarkers = useMemo(
    () => calculateUnitMarkers(regions, regionCentroids, selectedUnitRegion, playerFaction),
    [regions, regionCentroids, selectedUnitRegion, playerFaction]
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
          promoteId="shapeISO"
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
              onRegionSelect={onRegionSelect}
              onUnitSelect={onUnitSelect}
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
              onSelectCombat={onSelectCombat}
            />
          );
        })}

        <NavigationControl position="bottom-right" />
      </Map>
      
      {!selectedRegion && hoveredRegion && regions[hoveredRegion] && (
        <RegionTooltip
          hoveredRegion={hoveredRegion}
          regions={regions}
        />
      )}

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

'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Map, { MapRef, Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RegionState, Adjacency, CountryId, Movement, ActiveCombat, Theater, ArmyGroup, MapMode, RelationshipType } from '../types/game';
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

interface GameMapProps {
  regions: RegionState;
  adjacency: Adjacency;
  selectedRegion: string | null;
  selectedUnitRegion: string | null;
  movingUnits: Movement[];
  activeCombats: ActiveCombat[];
  currentDateTime: Date;
  playerCountry: CountryId;
  unitsInReserve: number;
  theaters: Theater[];
  selectedTheaterId: string | null;
  selectedGroupId: string | null;
  armyGroups: ArmyGroup[];
  mapMode: MapMode;
  regionCentroids: Record<string, [number, number]>;
  coreRegions?: string[];
  getRelationship: (fromCountry: CountryId, toCountry: CountryId) => RelationshipType;
  onRegionSelect: (regionId: string | null) => void;
  onUnitSelect: (regionId: string | null) => void;
  onRegionHover?: (regionId: string | null) => void;
  onDeployUnit: () => void;
  onMoveUnits: (fromRegion: string, toRegion: string, count: number) => void;
  onSelectCombat: (combatId: string | null) => void;
  onCountrySelect: (countryId: CountryId | null) => void;
  onSidebarOpen: (isOpen: boolean) => void;
}

export default function GameMap({
  regions,
  adjacency,
  selectedRegion,
  selectedUnitRegion,
  movingUnits,
  activeCombats,
  currentDateTime,
  playerCountry,
  unitsInReserve,
  theaters,
  selectedTheaterId,
  selectedGroupId,
  armyGroups,
  mapMode,
  regionCentroids,
  coreRegions,
  getRelationship,
  onRegionSelect,
  onUnitSelect,
  onRegionHover,
  onDeployUnit,
  onMoveUnits,
  onSelectCombat,
  onCountrySelect,
  onSidebarOpen,
}: GameMapProps) {
  const mapRef = useRef<MapRef>(null);
  const selectedUnitRegionRef = useRef<string | null>(null);
  const regionsRef = useRef<RegionState>(regions);
  const adjacencyRef = useRef<Adjacency>(adjacency);
  const onMoveUnitsRef = useRef(onMoveUnits);
  const onUnitSelectRef = useRef(onUnitSelect);
  const onCountrySelectRef = useRef(onCountrySelect);
  const onSidebarOpenRef = useRef(onSidebarOpen);
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

  useEffect(() => {
    onCountrySelectRef.current = onCountrySelect;
  }, [onCountrySelect]);

  useEffect(() => {
    onSidebarOpenRef.current = onSidebarOpen;
  }, [onSidebarOpen]);

  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  // Map style expressions
  const fillColorExpression = useMemo(() => 
    createMapModeFillColorExpression(mapMode, regions, playerCountry, getRelationship), 
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
        const regionId = features[0].properties?.regionId || features[0].properties?.shapeID;
        if (regionId) {
          // If clicking on same region, deselect
          if (regionId === selectedRegion) {
            onRegionSelect(null);
            onUnitSelect(null);
          } else {
            onRegionSelect(regionId);
            // If this region has units owned by player, also select as unit
            const region = regions[regionId];
            if (region && region.owner === playerCountry && region.divisions.length > 0) {
              onUnitSelect(regionId);
            } else {
              onUnitSelect(null);
            }
          }
        }
      }
    },
    [selectedRegion, regions, playerCountry, onRegionSelect, onUnitSelect]
  );

  const handleContextMenu = useCallback(
    (e: MapLayerMouseEvent) => {
      e.preventDefault();
      const features = e.features;
      if (features && features.length > 0) {
        const targetRegionId = features[0].properties?.regionId || features[0].properties?.shapeID;
        const currentSelectedUnit = selectedUnitRegionRef.current;
        
        let moved = false;
        // Check if we have a unit selected and this is an adjacent region
        if (currentSelectedUnit && targetRegionId && targetRegionId !== currentSelectedUnit) {
          const adjacentRegions = getAdjacentRegions(adjacencyRef.current, currentSelectedUnit);
          if (adjacentRegions.includes(targetRegionId)) {
            const sourceRegion = regionsRef.current[currentSelectedUnit];
            if (sourceRegion && sourceRegion.divisions.length > 0) {
              // Move all units (or could use unitsToMove for partial)
              onMoveUnitsRef.current(currentSelectedUnit, targetRegionId, sourceRegion.divisions.length);
              onUnitSelectRef.current(null);
              moved = true;
            }
          }
        }

        // Open country sidebar for the target region's owner if not moved
        if (!moved && targetRegionId) {
          const targetRegion = regionsRef.current[targetRegionId];
          if (targetRegion) {
            onCountrySelectRef.current(targetRegion.owner);
            onSidebarOpenRef.current(true);
          }
        }
      }
    },
    []
  );

  // Calculate markers
  const unitMarkers = useMemo(
    () => calculateUnitMarkers(regions, regionCentroids, selectedUnitRegion, playerCountry),
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
          playerCountry={playerCountry}
          unitsInReserve={unitsInReserve}
          activeCombats={activeCombats}
          coreRegions={coreRegions}
          onRegionSelect={onRegionSelect}
          onUnitSelect={onUnitSelect}
          onDeployUnit={onDeployUnit}
        />
      )}
    </div>
  );
}

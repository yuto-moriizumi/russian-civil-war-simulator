'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { useShallow } from 'zustand/react/shallow';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useGameUiStore } from '../../store/useGameUiStore';
import { useMapState } from './useMapState';
import { useMapEventHandlers } from './useMapEventHandlers';
import {
  createMapModeFillColorExpression,
  createFillPaint,
  createLinePaint,
  createMapStyle,
  createLineColorExpression,
  createLineWidthExpression,
  createFillOpacityExpression,
} from './mapStyles';
import {
  calculateUnitMarkers,
  calculateMovingUnitMarkers,
  calculateCombatMarkers,
} from './mapCalculations';

const MAP_STYLE = createMapStyle();
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const INTERACTIVE_LAYER_IDS = ['regions-fill'];
const LINE_PAINT = createLinePaint(
  createLineColorExpression(),
  createLineWidthExpression(),
);
const FILL_OPACITY_EXPRESSION = createFillOpacityExpression();
const FALLBACK_FILL_COLOR_EXPRESSION = [
  'case',
  ['boolean', ['has', 'countryIso3'], false],
  '#555',
  '#000',
];

interface MovementPathFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: {
    movementId: string;
  };
}

export function useGameMapViewModel() {
  const simulation = useSimulationStore(
    useShallow(state => ({
      regions: state.regions,
      divisions: state.divisions,
      adjacency: state.adjacency,
      movingUnits: state.movingUnits,
      activeCombats: state.activeCombats,
      currentDateTime: state.dateTime,
      playerCountry: state.selectedCountry?.id,
      playerCoreRegions: state.selectedCountry?.coreRegions,
      theaters: state.theaters,
      armyGroups: state.armyGroups,
      regionCentroids: state.regionCentroids,
      borderMidpoints: state.borderMidpoints,
      getRelationship: state.getRelationship,
    })),
  );

  const ui = useGameUiStore(
    useShallow(state => ({
      selectedRegion: state.selectedRegion,
      selectedUnitRegion: state.selectedUnitRegion,
      selectedTheaterId: state.selectedTheaterId,
      selectedGroupId: state.selectedGroupId,
      mapMode: state.mapMode,
      selectedMovementId: state.selectedMovementId,
      selectedDivisionIds: state.selectedDivisionIds,
      setSelectedRegion: state.setSelectedRegion,
      selectDivisionsInRegion: state.selectDivisionsInRegion,
      addDivisionsInRegion: state.addDivisionsInRegion,
      setSelectedCombatId: state.setSelectedCombatId,
      setSelectedMovementId: state.setSelectedMovementId,
    })),
  );

  const {
    selectedRegion,
    selectedUnitRegion,
    selectedTheaterId,
    selectedGroupId,
    mapMode,
    selectedMovementId,
    selectedDivisionIds,
    setSelectedRegion,
    selectDivisionsInRegion,
    addDivisionsInRegion,
    setSelectedCombatId,
    setSelectedMovementId,
  } = ui;

  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { hoveredRegion } = useMapState({
    mapRef,
    mapLoaded,
    selectedRegion,
    selectedUnitRegion,
    adjacency: simulation.adjacency,
    theaters: simulation.theaters,
    selectedTheaterId,
    selectedGroupId,
    armyGroups: simulation.armyGroups,
    onRegionHover: undefined,
  });

  const { handleMapClick, handleContextMenu } = useMapEventHandlers();

  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  const handleDivisionSelect = useCallback(
    (regionId: string, shiftHeld: boolean) => {
      if (shiftHeld && selectedDivisionIds.length > 0) {
        addDivisionsInRegion(regionId);
      } else {
        selectDivisionsInRegion(regionId);
      }
    },
    [selectedDivisionIds, addDivisionsInRegion, selectDivisionsInRegion],
  );

  const fillColorExpression = useMemo(
    () =>
      simulation.playerCountry
        ? createMapModeFillColorExpression(
            mapMode,
            simulation.regions,
            simulation.playerCountry,
            simulation.playerCoreRegions,
            simulation.getRelationship,
          )
        : FALLBACK_FILL_COLOR_EXPRESSION,
    [
      mapMode,
      simulation.regions,
      simulation.playerCountry,
      simulation.playerCoreRegions,
      simulation.getRelationship,
    ],
  );

  const fillPaint = useMemo(
    () => createFillPaint(fillColorExpression, FILL_OPACITY_EXPRESSION),
    [fillColorExpression],
  );

  const unitMarkers = useMemo(
    () =>
      simulation.playerCountry
        ? calculateUnitMarkers(
            simulation.regions,
            simulation.regionCentroids,
            selectedUnitRegion,
            simulation.playerCountry,
            selectedDivisionIds,
            simulation.activeCombats,
            simulation.movingUnits,
            simulation.divisions,
          )
        : [],
    [
      simulation.regions,
      simulation.regionCentroids,
      selectedUnitRegion,
      simulation.playerCountry,
      selectedDivisionIds,
      simulation.activeCombats,
      simulation.movingUnits,
      simulation.divisions,
    ],
  );

  const movingUnitMarkers = useMemo(
    () =>
      calculateMovingUnitMarkers(
        simulation.movingUnits,
        simulation.regionCentroids,
        simulation.currentDateTime,
      ),
    [
      simulation.movingUnits,
      simulation.regionCentroids,
      simulation.currentDateTime,
    ],
  );

  const combatMarkers = useMemo(
    () =>
      calculateCombatMarkers(
        simulation.activeCombats,
        simulation.regionCentroids,
        simulation.borderMidpoints,
      ),
    [
      simulation.activeCombats,
      simulation.regionCentroids,
      simulation.borderMidpoints,
    ],
  );

  const movementPathGeoJSON = useMemo(() => {
    const features: MovementPathFeature[] = [];

    const movementsToShow =
      selectedMovementId
        ? simulation.movingUnits.filter(
            movement => movement.id === selectedMovementId,
          )
        : selectedUnitRegion
          ? simulation.movingUnits.filter(
              movement => movement.fromRegion === selectedUnitRegion,
            )
          : [];

    for (const movement of movementsToShow) {
      const fullPath = [
        movement.fromRegion,
        movement.toRegion,
        ...(movement.remainingPath ?? []),
      ];
      const coordinates: [number, number][] = [];
      for (const regionId of fullPath) {
        const centroid = simulation.regionCentroids[regionId];
        if (centroid) {
          coordinates.push([centroid[0], centroid[1]]);
        }
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
  }, [
    selectedMovementId,
    selectedUnitRegion,
    simulation.movingUnits,
    simulation.regionCentroids,
  ]);

  return {
    mapRef,
    mapStyle: MAP_STYLE,
    mapContainerStyle: MAP_CONTAINER_STYLE,
    interactiveLayerIds: INTERACTIVE_LAYER_IDS,
    linePaint: LINE_PAINT,
    fillPaint,
    handleMapClick,
    handleContextMenu,
    handleMapLoad,
    handleDivisionSelect,
    hoveredRegion,
    movementPathGeoJSON,
    unitMarkers,
    movingUnitMarkers,
    combatMarkers,
    regions: simulation.regions,
    divisions: simulation.divisions,
    movingUnits: simulation.movingUnits,
    selectedRegion,
    selectedDivisionIds,
    selectedMovementId,
    playerCountry: simulation.playerCountry,
    setSelectedRegion,
    setSelectedCombatId,
    setSelectedMovementId,
  };
}

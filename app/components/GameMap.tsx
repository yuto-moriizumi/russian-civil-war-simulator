'use client';

import Map, { Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { UnitMarker, MovingUnitMarker, CombatMarker } from './GameMap/MapMarkers';
import { RegionTooltip, RegionInfoPanel, MovingUnitInfoPanel, DivisionSelectionPanel } from './GameMap/RegionPanels';
import { useGameMapViewModel } from './GameMap/useGameMapViewModel';

export default function GameMap() {
  const {
    mapRef,
    mapStyle,
    mapContainerStyle,
    interactiveLayerIds,
    linePaint,
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
    regions,
    divisions,
    movingUnits,
    selectedRegion,
    selectedDivisionIds,
    selectedMovementId,
    playerCountry,
    setSelectedRegion,
    setSelectedCombatId,
    setSelectedMovementId,
  } = useGameMapViewModel();

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
              divisions={divisions}
              centroid={centroid}
              isSelected={isSelected}
              isPlayerUnit={isPlayerUnit}
              movingUnits={movingUnits}
              onRegionSelect={setSelectedRegion}
              onDivisionSelect={handleDivisionSelect}
            />
          );
        })}

        {movingUnitMarkers.map((marker) => {
          if (!marker) return null;
          const { id, movement, longitude, latitude, offset } = marker;
          return (
            <MovingUnitMarker
              key={id}
              id={id}
              movement={movement}
              longitude={longitude}
              latitude={latitude}
              offset={offset}
              isSelected={selectedMovementId === movement.id || (selectedDivisionIds.length > 0 && movement.divisionIds.some(id => selectedDivisionIds.includes(id)))}
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
              divisions={divisions}
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

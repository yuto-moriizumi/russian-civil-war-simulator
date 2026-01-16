import { useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { MapMouseEvent } from 'maplibre-gl';
import type { Adjacency, Theater } from '../../types/game';
import { getAdjacentRegions } from '../../utils/mapUtils';

interface UseMapStateProps {
  mapRef: React.RefObject<MapRef | null>;
  mapLoaded: boolean;
  selectedRegion: string | null;
  selectedUnitRegion: string | null;
  adjacency: Adjacency;
  theaters: Theater[];
  selectedTheaterId: string | null;
  selectedGroupId: string | null;
  armyGroups: Array<{ id: string; theaterId: string | null }>;
  onRegionHover?: (regionId: string | null) => void;
}

export function useMapState({
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
}: UseMapStateProps) {
  const hoveredFeatureIdRef = useRef<string | null>(null); // Store shapeID for feature state
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null); // Store shapeID for game logic

  // Set up native MapLibre hover handlers for better performance
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;

    const onMouseMove = (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const shapeId = feature.properties?.shapeID; // Use shapeID for both feature state and game logic
        
        if (shapeId && shapeId !== hoveredFeatureIdRef.current) {
          // Clear previous hover
          if (hoveredFeatureIdRef.current) {
            map.setFeatureState(
              { source: 'regions', id: hoveredFeatureIdRef.current },
              { hover: false }
            );
          }
          // Set new hover
          map.setFeatureState(
            { source: 'regions', id: shapeId },
            { hover: true }
          );
          hoveredFeatureIdRef.current = shapeId;
          setHoveredRegion(shapeId);
          onRegionHover?.(shapeId);
        }
      }
      map.getCanvas().style.cursor = 'pointer';
    };

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      if (hoveredFeatureIdRef.current) {
        map.setFeatureState(
          { source: 'regions', id: hoveredFeatureIdRef.current },
          { hover: false }
        );
        hoveredFeatureIdRef.current = null;
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
  }, [mapLoaded, onRegionHover, mapRef]);

  // Update feature states for selected regions, hover, and adjacent regions
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;

    // Clear all feature states except hover (hover is managed separately)
    map.removeFeatureState({ source: 'regions' });

    // Set theater frontline highlights (lowest priority)
    // Highlight theater if either directly selected OR if a selected army group belongs to it
    let theaterToHighlight = selectedTheaterId;
    if (!theaterToHighlight && selectedGroupId) {
      const selectedGroup = armyGroups.find(g => g.id === selectedGroupId);
      if (selectedGroup?.theaterId) {
        theaterToHighlight = selectedGroup.theaterId;
      }
    }
    
    if (theaterToHighlight) {
      const theater = theaters.find(t => t.id === theaterToHighlight);
      if (theater) {
        for (const shapeId of theater.frontlineRegions) {
          map.setFeatureState(
            { source: 'regions', id: shapeId },
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
    if (hoveredFeatureIdRef.current) {
      map.setFeatureState(
        { source: 'regions', id: hoveredFeatureIdRef.current },
        { hover: true }
      );
    }
  }, [selectedRegion, selectedUnitRegion, adjacency, mapLoaded, selectedTheaterId, selectedGroupId, armyGroups, theaters, mapRef]);

  return {
    hoveredRegion,
    hoveredFeatureIdRef,
  };
}

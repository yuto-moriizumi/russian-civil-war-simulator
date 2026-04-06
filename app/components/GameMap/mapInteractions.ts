import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { RegionState, Adjacency, CountryId } from '../../types/game';

interface MapClickHandlerProps {
  selectedRegion: string | null;
  regions: RegionState;
  playerCountry: CountryId;
  onRegionSelect: (regionId: string | null) => void;
  onUnitSelect: (regionId: string | null) => void;
}

export function createMapClickHandler({
  selectedRegion,
  regions,
  playerCountry,
  onRegionSelect,
  onUnitSelect,
}: MapClickHandlerProps) {
  return (e: MapLayerMouseEvent) => {
    const features = e.features;
    if (features && features.length > 0) {
      const regionId = features[0].id as string;
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
  };
}

interface MapContextMenuHandlerRefs {
  selectedUnitRegionRef: React.MutableRefObject<string | null>;
  regionsRef: React.MutableRefObject<RegionState>;
  // adjacencyRef kept for API compatibility but no longer used for the adjacency gate
  adjacencyRef: React.MutableRefObject<Adjacency>;
  onMoveUnitsRef: React.MutableRefObject<(fromRegion: string, toRegion: string, count: number) => void>;
  onUnitSelectRef: React.MutableRefObject<(regionId: string | null) => void>;
  onCountrySelectRef: React.MutableRefObject<(countryId: CountryId | null) => void>;
  onSidebarOpenRef: React.MutableRefObject<(isOpen: boolean) => void>;
}

export function createContextMenuHandler({
  selectedUnitRegionRef,
  regionsRef,
  onMoveUnitsRef,
  onUnitSelectRef,
  onCountrySelectRef,
  onSidebarOpenRef,
}: MapContextMenuHandlerRefs) {
  return (e: MapLayerMouseEvent) => {
    e.preventDefault();
    const features = e.features;
    if (features && features.length > 0) {
      const targetRegionId = features[0].id as string;
      const currentSelectedUnit = selectedUnitRegionRef.current;
      
      let moved = false;
      // Check if we have a unit selected and this is a different region.
      // moveUnits handles both adjacent (single-hop) and non-adjacent (multi-step
      // via pathfinding) targets — no adjacency gate needed here.
      if (currentSelectedUnit && targetRegionId && targetRegionId !== currentSelectedUnit) {
        const sourceRegion = regionsRef.current[currentSelectedUnit];
        if (sourceRegion && sourceRegion.divisions.length > 0) {
          onMoveUnitsRef.current(currentSelectedUnit, targetRegionId, sourceRegion.divisions.length);
          onUnitSelectRef.current(null);
          moved = true;
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
  };
}

import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { RegionState, Adjacency, CountryId } from '../../types/game';
import { getAdjacentRegions } from '../../utils/mapUtils';

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
  adjacencyRef: React.MutableRefObject<Adjacency>;
  onMoveUnitsRef: React.MutableRefObject<(fromRegion: string, toRegion: string, count: number) => void>;
  onUnitSelectRef: React.MutableRefObject<(regionId: string | null) => void>;
  onCountrySelectRef: React.MutableRefObject<(countryId: CountryId | null) => void>;
  onSidebarOpenRef: React.MutableRefObject<(isOpen: boolean) => void>;
}

export function createContextMenuHandler({
  selectedUnitRegionRef,
  regionsRef,
  adjacencyRef,
  onMoveUnitsRef,
  onUnitSelectRef,
  onCountrySelectRef,
  onSidebarOpenRef,
}: MapContextMenuHandlerRefs) {
  return (e: MapLayerMouseEvent) => {
    e.preventDefault();
    const features = e.features;
    if (features && features.length > 0) {
      const targetRegionId = features[0].properties?.shapeISO;
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
      // Or maybe always open it? The requirement says "can be opened by right clicking region"
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

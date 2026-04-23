import { useEffect } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { createInitialOwnership } from '../utils/mapUtils';

export function useMapData() {
  const setRegions = useSimulationStore(state => state.setRegions);
  const setAdjacency = useSimulationStore(state => state.setAdjacency);
  const setBorderMidpoints = useSimulationStore(state => state.setBorderMidpoints);
  const setMapDataLoaded = useSimulationStore(state => state.setMapDataLoaded);
  const mapDataLoaded = useSimulationStore(state => state.mapDataLoaded);
  const initializeCentroids = useSimulationStore(state => state.initializeCentroids);
  const detectAndUpdateTheaters = useSimulationStore(state => state.detectAndUpdateTheaters);
  const persistedRegionOwners = useSimulationStore(state => state.regionOwners);

  useEffect(() => {
    if (mapDataLoaded) return;

    const loadMapData = async () => {
      try {
        const [geoResponse, adjResponse, midpointsResponse] = await Promise.all([
          fetch('/map/regions.geojson'),
          fetch('/map/adjacency.json'),
          fetch('/map/borderMidpoints.json'),
        ]);

        const geoData = await geoResponse.json();
        const adjData = await adjResponse.json();
        const midpointsData = await midpointsResponse.json();

        const freshRegions = createInitialOwnership(geoData.features);

        // If the store already has persisted ownership data (from a saved game),
        // merge GeoJSON-derived metadata with saved owners so gameplay ownership is preserved.
        const hasSavedRegionOwners = Object.keys(persistedRegionOwners).length > 0;
        const regions = hasSavedRegionOwners
          ? Object.fromEntries(
              Object.entries(freshRegions).map(([id, fresh]) => {
                const savedOwner = persistedRegionOwners[id];
                return [id, savedOwner ? { ...fresh, owner: savedOwner } : fresh];
              })
            )
          : freshRegions;

        setRegions(regions);
        setAdjacency(adjData);
        setBorderMidpoints(midpointsData);
        setMapDataLoaded(true);

        // Re-sync theaters now that adjacency is available. This handles the case
        // where selectCountry() was called before adjacency finished loading,
        // leaving non-player AI countries with only a single default army group.
        detectAndUpdateTheaters();

        // Initialize centroids for distance calculations
        await initializeCentroids();
      } catch (error) {
        console.error('Failed to load map data:', error);
      }
    };

    loadMapData();
  }, [setRegions, setAdjacency, setBorderMidpoints, setMapDataLoaded, mapDataLoaded, initializeCentroids, detectAndUpdateTheaters, persistedRegionOwners]);
}

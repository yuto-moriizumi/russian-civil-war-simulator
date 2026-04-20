import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { createInitialOwnership } from '../utils/mapUtils';

export function useMapData() {
  const setRegions = useGameStore(state => state.setRegions);
  const setAdjacency = useGameStore(state => state.setAdjacency);
  const setBorderMidpoints = useGameStore(state => state.setBorderMidpoints);
  const setMapDataLoaded = useGameStore(state => state.setMapDataLoaded);
  const mapDataLoaded = useGameStore(state => state.mapDataLoaded);
  const initializeCentroids = useGameStore(state => state.initializeCentroids);
  const detectAndUpdateTheaters = useGameStore(state => state.detectAndUpdateTheaters);
  const persistedRegions = useGameStore(state => state.regions);

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

        // If the store already has persisted region data (from a saved game),
        // merge only the GeoJSON-derived metadata (name, countryIso3) into
        // the persisted regions so that gameplay ownership and divisions are preserved.
        const hasSavedRegions = Object.keys(persistedRegions).length > 0;
        const regions = hasSavedRegions
          ? Object.fromEntries(
              Object.entries(freshRegions).map(([id, fresh]) => {
                const saved = persistedRegions[id];
                if (saved) {
                  return [id, { ...saved, name: fresh.name, countryIso3: fresh.countryIso3 }];
                }
                // Region exists in GeoJSON but not in save — use fresh data
                return [id, fresh];
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRegions, setAdjacency, setBorderMidpoints, setMapDataLoaded, mapDataLoaded, initializeCentroids, detectAndUpdateTheaters]);
}

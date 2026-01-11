import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { createInitialOwnership } from '../utils/mapUtils';

export function useMapData() {
  const setRegions = useGameStore(state => state.setRegions);
  const setAdjacency = useGameStore(state => state.setAdjacency);
  const setMapDataLoaded = useGameStore(state => state.setMapDataLoaded);
  const mapDataLoaded = useGameStore(state => state.mapDataLoaded);

  useEffect(() => {
    if (mapDataLoaded) return;

    const loadMapData = async () => {
      try {
        const [geoResponse, adjResponse] = await Promise.all([
          fetch('/map/regions.geojson'),
          fetch('/map/adjacency.json'),
        ]);

        const geoData = await geoResponse.json();
        const adjData = await adjResponse.json();

        const initialRegions = createInitialOwnership(geoData.features);
        
        setRegions(initialRegions);
        setAdjacency(adjData);
        setMapDataLoaded(true);
      } catch (error) {
        console.error('Failed to load map data:', error);
      }
    };

    loadMapData();
  }, [setRegions, setAdjacency, setMapDataLoaded, mapDataLoaded]);
}

import { useEffect } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { createInitialOwnership } from '../utils/mapUtils';
import { detectTheatersForCountries, syncAIArmyGroupsToTheaters } from '../utils/aiArmyGroupTheaters';

export function useMapData() {
  const setRegions = useSimulationStore(state => state.setRegions);
  const setAdjacency = useSimulationStore(state => state.setAdjacency);
  const setBorderMidpoints = useSimulationStore(state => state.setBorderMidpoints);
  const setMapDataLoaded = useSimulationStore(state => state.setMapDataLoaded);
  const mapDataLoaded = useSimulationStore(state => state.mapDataLoaded);
  const initializeCentroids = useSimulationStore(state => state.initializeCentroids);
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
        // leaving theaters empty or incomplete.
        const state = useSimulationStore.getState();
        if (state.selectedCountry && Object.keys(adjData).length > 0) {
          const aiCountryIds = state.aiStates.map(s => s.countryId).filter(id => id !== state.selectedCountry!.id);
          const allCountryIds = [state.selectedCountry.id, ...aiCountryIds];

          const theaters = detectTheatersForCountries({
            regions,
            adjacency: adjData,
            countryIds: allCountryIds,
            existingTheaters: state.theaters,
            relationships: state.relationships,
          });

          if (aiCountryIds.length > 0) {
            const aiSync = syncAIArmyGroupsToTheaters({
              aiCountryIds,
              theaters,
              armyGroups: state.armyGroups,
              regions,
              divisions: state.divisions,
              movingUnits: state.movingUnits,
              activeCombats: state.activeCombats,
              productionQueues: state.productionQueues,
            });
            useSimulationStore.setState({
              theaters,
              armyGroups: aiSync.armyGroups,
              divisions: aiSync.divisions,
              movingUnits: aiSync.movingUnits,
              activeCombats: aiSync.activeCombats,
              productionQueues: aiSync.productionQueues,
            });
          } else {
            useSimulationStore.setState({ theaters });
          }
        }

        // Initialize centroids for distance calculations
        await initializeCentroids();
      } catch (error) {
        console.error('Failed to load map data:', error);
      }
    };

    loadMapData();
  }, [setRegions, setAdjacency, setBorderMidpoints, setMapDataLoaded, mapDataLoaded, initializeCentroids, persistedRegionOwners]);
}

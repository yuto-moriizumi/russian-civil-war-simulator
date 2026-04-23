import { Region, Adjacency } from '../../types/game';
import { ActionsState } from './types';
import { StoreApi } from 'zustand';
import * as turf from '@turf/turf';
import { createRegionStatePatch } from '../../utils/regionState';

export const createMapDataActions = (
  set: StoreApi<ActionsState>['setState'],
) => ({
  setRegions: (regions: Record<string, Region>) => set(createRegionStatePatch(regions)),

  setAdjacency: (adjacency: Adjacency) => set({ adjacency }),

  setBorderMidpoints: (midpoints: Record<string, [number, number]>) => set({ borderMidpoints: midpoints }),

  setMapDataLoaded: (loaded: boolean) => set({ mapDataLoaded: loaded }),

  initializeCentroids: async () => {
    try {
      const response = await fetch('/map/regions.geojson');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geojson = await response.json() as any;

      const centroids: Record<string, [number, number]> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      geojson.features.forEach((feature: any) => {
        const id = feature.id as string;
        const centroid = turf.centroid(feature);
        const coords = centroid.geometry.coordinates;
        centroids[id] = [coords[0], coords[1]];
      });

      set({ regionCentroids: centroids });
      console.log(`Loaded ${Object.keys(centroids).length} region centroids`);
    } catch (error) {
      console.error('Failed to load region centroids:', error);
    }
  },
});

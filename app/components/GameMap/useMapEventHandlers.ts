'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { useGameStore } from '../../store/useGameStore';
import { COUNTRY_METADATA } from '../../data/countryMetadata';
import type { CountryId } from '../../types/game';

/**
 * Encapsulates all refs, ref-sync effects, and map event handlers for GameMap.
 * Extracted to keep GameMap.tsx under the max-lines lint limit.
 */
export function useMapEventHandlers(
  selectedRegion: string | null,
  regions: ReturnType<typeof useGameStore.getState>['regions'],
  playerCountry: string | undefined,
  setSelectedRegion: (id: string | null) => void,
  setSelectedUnitRegion: (id: string | null) => void,
  setSelectedMovementId: (id: string | null) => void,
) {
  const moveUnits = useGameStore(state => state.moveUnits);
  const redirectMovement = useGameStore(state => state.redirectMovement);
  const setSelectedCountryId = useGameStore(state => state.setSelectedCountryId);
  const setIsCountrySidebarOpen = useGameStore(state => state.setIsCountrySidebarOpen);
  const selectedMovementId = useGameStore(state => state.selectedMovementId);
  const isSwitchModeActive = useGameStore(state => state.isSwitchModeActive);
  const setSwitchModeActive = useGameStore(state => state.setSwitchModeActive);
  const selectCountry = useGameStore(state => state.selectCountry);
  const clearSelectedDivisions = useGameStore(state => state.clearSelectedDivisions);

  const selectedUnitRegionRef = useRef<string | null>(null);
  const selectedMovementIdRef = useRef<string | null>(null);
  const regionsRef = useRef(regions);
  const adjacencyRef = useRef(useGameStore.getState().adjacency);
  const moveUnitsRef = useRef(moveUnits);
  const redirectMovementRef = useRef(redirectMovement);
  const setSelectedMovementIdRef = useRef(setSelectedMovementId);
  const setSelectedUnitRegionRef = useRef(setSelectedUnitRegion);
  const setSelectedCountryIdRef = useRef(setSelectedCountryId);
  const setIsCountrySidebarOpenRef = useRef(setIsCountrySidebarOpen);
  const isSwitchModeActiveRef = useRef(isSwitchModeActive);
  const setSwitchModeActiveRef = useRef(setSwitchModeActive);
  const selectCountryRef = useRef(selectCountry);
  const clearSelectedDivisionsRef = useRef(clearSelectedDivisions);

  const selectedUnitRegion = useGameStore(state => state.selectedUnitRegion);

  useEffect(() => { selectedUnitRegionRef.current = selectedUnitRegion; }, [selectedUnitRegion]);
  useEffect(() => { selectedMovementIdRef.current = selectedMovementId; }, [selectedMovementId]);
  useEffect(() => { regionsRef.current = regions; }, [regions]);
  useEffect(() => { adjacencyRef.current = useGameStore.getState().adjacency; });
  useEffect(() => { moveUnitsRef.current = moveUnits; }, [moveUnits]);
  useEffect(() => { redirectMovementRef.current = redirectMovement; }, [redirectMovement]);
  useEffect(() => { setSelectedMovementIdRef.current = setSelectedMovementId; }, [setSelectedMovementId]);
  useEffect(() => { setSelectedUnitRegionRef.current = setSelectedUnitRegion; }, [setSelectedUnitRegion]);
  useEffect(() => { setSelectedCountryIdRef.current = setSelectedCountryId; }, [setSelectedCountryId]);
  useEffect(() => { setIsCountrySidebarOpenRef.current = setIsCountrySidebarOpen; }, [setIsCountrySidebarOpen]);
  useEffect(() => { isSwitchModeActiveRef.current = isSwitchModeActive; }, [isSwitchModeActive]);
  useEffect(() => { setSwitchModeActiveRef.current = setSwitchModeActive; }, [setSwitchModeActive]);
  useEffect(() => { selectCountryRef.current = selectCountry; }, [selectCountry]);
  useEffect(() => { clearSelectedDivisionsRef.current = clearSelectedDivisions; }, [clearSelectedDivisions]);

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const features = e.features;
      if (features && features.length > 0) {
        const regionId = features[0].id as string;
        if (regionId) {
          if (isSwitchModeActiveRef.current) {
            const region = regionsRef.current[regionId];
            if (region) {
              const meta = COUNTRY_METADATA[region.owner as keyof typeof COUNTRY_METADATA];
              if (meta) {
                selectCountryRef.current({
                  id: meta.id as CountryId,
                  name: meta.name,
                  flag: meta.flag,
                  color: meta.color,
                  coreRegions: (meta.coreRegions as string[] | undefined) ?? [],
                });
              }
            }
            setSwitchModeActiveRef.current(false);
            return;
          }

          if (regionId === selectedRegion) {
            setSelectedRegion(null);
            setSelectedUnitRegion(null);
            setSelectedMovementId(null);
          } else {
            setSelectedRegion(regionId);
            setSelectedMovementId(null);
            const region = regions[regionId];
            if (region && region.owner === playerCountry && region.divisions.length > 0) {
              setSelectedUnitRegion(regionId);
            } else {
              setSelectedUnitRegion(null);
            }
          }
        }
      }
    },
    [selectedRegion, regions, playerCountry, setSelectedRegion, setSelectedUnitRegion, setSelectedMovementId]
  );

  const handleContextMenu = useCallback(
    (e: MapLayerMouseEvent) => {
      e.preventDefault();
      const features = e.features;
      if (features && features.length > 0) {
        const targetRegionId = features[0].id as string;
        const currentSelectedMovement = selectedMovementIdRef.current;
        const currentSelectedUnit = selectedUnitRegionRef.current;

        let moved = false;

        if (currentSelectedMovement && targetRegionId) {
          redirectMovementRef.current(currentSelectedMovement, targetRegionId);
          setSelectedMovementIdRef.current(null);
          moved = true;
        }

        if (!moved && currentSelectedUnit && targetRegionId && targetRegionId !== currentSelectedUnit) {
          const sourceRegion = regionsRef.current[currentSelectedUnit];
          if (sourceRegion && sourceRegion.divisions.length > 0) {
            moveUnitsRef.current(currentSelectedUnit, targetRegionId, sourceRegion.divisions.length);
            // Clear division selection after initiating movement
            clearSelectedDivisionsRef.current();
            moved = true;
          }
        }

        if (!moved && targetRegionId) {
          const targetRegion = regionsRef.current[targetRegionId];
          if (targetRegion) {
            setSelectedCountryIdRef.current(targetRegion.owner);
            setIsCountrySidebarOpenRef.current(true);
          }
        }
      }
    },
    []
  );

  return { handleMapClick, handleContextMenu };
}

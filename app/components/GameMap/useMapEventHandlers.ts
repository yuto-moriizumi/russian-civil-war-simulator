'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useGameUiStore } from '../../store/useGameUiStore';
import { COUNTRY_METADATA } from '../../data/countryMetadata';
import type { CountryId } from '../../types/game';
import { getDivisionsInRegion } from '../../utils/divisionState';

/**
 * Encapsulates all refs, ref-sync effects, and map event handlers for GameMap.
 * Extracted to keep GameMap.tsx under the max-lines lint limit.
 */
export function useMapEventHandlers(
  selectedRegion: string | null,
  regions: ReturnType<typeof useSimulationStore.getState>['regions'],
  divisions: ReturnType<typeof useSimulationStore.getState>['divisions'],
  playerCountry: string | undefined,
  setSelectedRegion: (id: string | null) => void,
  setSelectedUnitRegion: (id: string | null) => void,
  setSelectedMovementId: (id: string | null) => void,
) {
  const moveUnits = useSimulationStore(state => state.moveUnits);
  const redirectMovement = useSimulationStore(state => state.redirectMovement);
  const cancelMovement = useSimulationStore(state => state.cancelMovement);
  const movingUnits = useSimulationStore(state => state.movingUnits);
  const selectCountry = useSimulationStore(state => state.selectCountry);
  const setSelectedCountryId = useGameUiStore(state => state.setSelectedCountryId);
  const setIsCountrySidebarOpen = useGameUiStore(state => state.setIsCountrySidebarOpen);
  const selectedMovementId = useGameUiStore(state => state.selectedMovementId);
  const isSwitchModeActive = useGameUiStore(state => state.isSwitchModeActive);
  const setSwitchModeActive = useGameUiStore(state => state.setSwitchModeActive);
  const clearSelectedDivisions = useGameUiStore(state => state.clearSelectedDivisions);

  const selectedUnitRegionRef = useRef<string | null>(null);
  const selectedMovementIdRef = useRef<string | null>(null);
  const regionsRef = useRef(regions);
  const divisionsRef = useRef(divisions);
  const adjacencyRef = useRef(useSimulationStore.getState().adjacency);
  const moveUnitsRef = useRef(moveUnits);
  const redirectMovementRef = useRef(redirectMovement);
  const cancelMovementRef = useRef(cancelMovement);
  const movingUnitsRef = useRef(movingUnits);
  const setSelectedMovementIdRef = useRef(setSelectedMovementId);
  const setSelectedUnitRegionRef = useRef(setSelectedUnitRegion);
  const setSelectedCountryIdRef = useRef(setSelectedCountryId);
  const setIsCountrySidebarOpenRef = useRef(setIsCountrySidebarOpen);
  const isSwitchModeActiveRef = useRef(isSwitchModeActive);
  const setSwitchModeActiveRef = useRef(setSwitchModeActive);
  const selectCountryRef = useRef(selectCountry);
  const clearSelectedDivisionsRef = useRef(clearSelectedDivisions);
  /** Tracks the current selectedDivisionIds length so the context-menu handler
   *  can use it without capturing a stale value in a useCallback closure. */
  const selectedDivisionIdsRef = useRef<string[]>([]);

  const selectedUnitRegion = useGameUiStore(state => state.selectedUnitRegion);
  const selectedDivisionIds = useGameUiStore(state => state.selectedDivisionIds);

  useEffect(() => { selectedUnitRegionRef.current = selectedUnitRegion; }, [selectedUnitRegion]);
  useEffect(() => { selectedMovementIdRef.current = selectedMovementId; }, [selectedMovementId]);
  useEffect(() => { regionsRef.current = regions; }, [regions]);
  useEffect(() => { divisionsRef.current = divisions; }, [divisions]);
  useEffect(() => { adjacencyRef.current = useSimulationStore.getState().adjacency; });
  useEffect(() => { moveUnitsRef.current = moveUnits; }, [moveUnits]);
  useEffect(() => { redirectMovementRef.current = redirectMovement; }, [redirectMovement]);
  useEffect(() => { cancelMovementRef.current = cancelMovement; }, [cancelMovement]);
  useEffect(() => { movingUnitsRef.current = movingUnits; }, [movingUnits]);
  useEffect(() => { setSelectedMovementIdRef.current = setSelectedMovementId; }, [setSelectedMovementId]);
  useEffect(() => { setSelectedUnitRegionRef.current = setSelectedUnitRegion; }, [setSelectedUnitRegion]);
  useEffect(() => { setSelectedCountryIdRef.current = setSelectedCountryId; }, [setSelectedCountryId]);
  useEffect(() => { setIsCountrySidebarOpenRef.current = setIsCountrySidebarOpen; }, [setIsCountrySidebarOpen]);
  useEffect(() => { isSwitchModeActiveRef.current = isSwitchModeActive; }, [isSwitchModeActive]);
  useEffect(() => { setSwitchModeActiveRef.current = setSwitchModeActive; }, [setSwitchModeActive]);
  useEffect(() => { selectCountryRef.current = selectCountry; }, [selectCountry]);
  useEffect(() => { clearSelectedDivisionsRef.current = clearSelectedDivisions; }, [clearSelectedDivisions]);
  useEffect(() => { selectedDivisionIdsRef.current = selectedDivisionIds; }, [selectedDivisionIds]);

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
            if (region && region.owner === playerCountry && getDivisionsInRegion(divisionsRef.current, regionId).length > 0) {
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
          const movement = movingUnitsRef.current.find(m => m.id === currentSelectedMovement);
          if (movement && targetRegionId === movement.fromRegion) {
            cancelMovementRef.current(currentSelectedMovement);
          } else {
            redirectMovementRef.current(currentSelectedMovement, targetRegionId);
          }
          setSelectedMovementIdRef.current(null);
          moved = true;
        }

        if (!moved && currentSelectedUnit && targetRegionId && targetRegionId !== currentSelectedUnit) {
          const sourceRegion = regionsRef.current[currentSelectedUnit];
          const sourceDivisions = sourceRegion ? getDivisionsInRegion(divisionsRef.current, currentSelectedUnit) : [];
          if (sourceDivisions.length > 0) {
            // Use the number of explicitly selected divisions if any; otherwise move all.
            const selIds = selectedDivisionIdsRef.current;
            const count = selIds.length > 0 ? selIds.length : sourceDivisions.length;
            moveUnitsRef.current(currentSelectedUnit, targetRegionId, count);
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

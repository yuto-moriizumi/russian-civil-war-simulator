'use client';

import { useState, useCallback } from 'react';
import type { RegionFeatureCollection } from '../../../types';
import { CountryId } from '../../types/game';
import { UnitPlacementData } from '../../data/map/initialUnitPlacement';

interface ArmyGroupDef {
  name: string;
  color: string;
}

interface UseMapToolSaveOptions {
  ownership: Record<string, CountryId>;
  coreRegions: Record<string, string[]>;
  unitPlacement: UnitPlacementData;
  armyGroupDefs: Record<CountryId, ArmyGroupDef[]>;
  geojson: RegionFeatureCollection | null;
  onSaveSuccess: (opts: {
    ownership: Record<string, CountryId>;
    coreRegions: Record<string, string[]>;
    unitPlacement: UnitPlacementData;
    armyGroupDefs: Record<CountryId, ArmyGroupDef[]>;
  }) => void;
  setAdjacency: (adj: Record<string, string[]>) => void;
}

export function useMapToolSave({
  ownership,
  coreRegions,
  unitPlacement,
  armyGroupDefs,
  geojson,
  onSaveSuccess,
  setAdjacency,
}: UseMapToolSaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const [ownershipRes, coreRes, unitRes] = await Promise.all([
        fetch('/api/map-tool/save-ownership', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownership, format: 'typescript' }),
        }),
        fetch('/api/map-tool/save-core-regions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coreRegions }),
        }),
        fetch('/api/map-tool/save-unit-placement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placement: unitPlacement, armyGroupDefs }),
        }),
      ]);
      const [ownershipResult, coreResult, unitResult] = await Promise.all([
        ownershipRes.json(), coreRes.json(), unitRes.json(),
      ]);

      if (ownershipResult.success && coreResult.success && unitResult.success) {
        alert(`Successfully saved!\nOwnership: ${ownershipResult.message}\nCore Regions: ${coreResult.message}\nUnit Placement: ${unitResult.message}`);
        onSaveSuccess({ ownership, coreRegions, unitPlacement, armyGroupDefs });
      } else {
        const errors: string[] = [];
        if (!ownershipResult.success) errors.push(`Ownership: ${ownershipResult.message}`);
        if (!coreResult.success) errors.push(`Core Regions: ${coreResult.message}`);
        if (!unitResult.success) errors.push(`Unit Placement: ${unitResult.message}`);
        alert(`Save failed:\n${errors.join('\n')}`);
      }
    } catch (error) {
      alert(`Save error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }, [ownership, coreRegions, unitPlacement, armyGroupDefs, onSaveSuccess]);

  const handleGenerateAdjacency = useCallback(async () => {
    if (!geojson) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/map-tool/generate-adjacency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geojson, options: { bufferKm: 2, detectIsolated: true } }),
      });
      const result = await response.json();
      if (result.adjacency) {
        setAdjacency(result.adjacency);
        alert(`Adjacency generated!\nRegions: ${result.stats.totalRegions}\nConnections: ${result.stats.totalConnections}\nIsolated: ${result.stats.isolatedRegions.length}`);
      }
    } catch (error) {
      alert(`Adjacency generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [geojson, setAdjacency]);

  return { isSaving, isLoading, handleSave, handleGenerateAdjacency };
}

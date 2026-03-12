'use client';

import { useState, useCallback, useEffect } from 'react';
import { CountryId } from '../../types/game';
import { UnitPlacementData } from '../../data/map/initialUnitPlacement';

interface ArmyGroupDef {
  name: string;
  color: string;
}

export function useUnitPlacement() {
  const [unitPlacement, setUnitPlacement] = useState<UnitPlacementData>({});
  const [originalUnitPlacement, setOriginalUnitPlacement] = useState<UnitPlacementData>({});
  const [armyGroupDefs, setArmyGroupDefs] = useState<Record<CountryId, ArmyGroupDef[]>>(
    {} as Record<CountryId, ArmyGroupDef[]>
  );
  const [originalArmyGroupDefs, setOriginalArmyGroupDefs] = useState<Record<CountryId, ArmyGroupDef[]>>(
    {} as Record<CountryId, ArmyGroupDef[]>
  );
  const [selectedArmyGroup, setSelectedArmyGroup] = useState<string | null>(null);
  const [unitCountry, setUnitCountry] = useState<CountryId>('soviet');

  // Load placement data from API on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/map-tool/load-unit-placement');
        if (!res.ok) return;
        const data = await res.json() as {
          placement: UnitPlacementData;
          armyGroupDefs: Record<CountryId, ArmyGroupDef[]>;
        };
        setUnitPlacement(data.placement ?? {});
        setOriginalUnitPlacement({ ...(data.placement ?? {}) });
        setArmyGroupDefs(data.armyGroupDefs ?? {} as Record<CountryId, ArmyGroupDef[]>);
        setOriginalArmyGroupDefs({ ...(data.armyGroupDefs ?? {}) } as Record<CountryId, ArmyGroupDef[]>);
      } catch {
        // silently ignore – tool still works without saved placements
      }
    };
    load();
  }, []);

  const handleRegionUnitAdd = useCallback(
    (regionId: string) => {
      if (!selectedArmyGroup) return;
      setUnitPlacement((prev) => {
        const entries = prev[regionId] ? [...prev[regionId]] : [];
        const existing = entries.find(
          (e) => e.owner === unitCountry && e.armyGroupName === selectedArmyGroup
        );
        if (existing) {
          return {
            ...prev,
            [regionId]: entries.map((e) =>
              e.owner === unitCountry && e.armyGroupName === selectedArmyGroup
                ? { ...e, count: e.count + 1 }
                : e
            ),
          };
        }
        return {
          ...prev,
          [regionId]: [
            ...entries,
            { owner: unitCountry, armyGroupName: selectedArmyGroup, count: 1 },
          ],
        };
      });
    },
    [selectedArmyGroup, unitCountry]
  );

  const handleRegionUnitRemove = useCallback(
    (regionId: string) => {
      if (!selectedArmyGroup) return;
      setUnitPlacement((prev) => {
        const entries = prev[regionId];
        if (!entries) return prev;
        const updated = entries
          .map((e) =>
            e.owner === unitCountry && e.armyGroupName === selectedArmyGroup
              ? { ...e, count: Math.max(0, e.count - 1) }
              : e
          )
          .filter((e) => e.count > 0);
        const next = { ...prev };
        if (updated.length === 0) {
          delete next[regionId];
        } else {
          next[regionId] = updated;
        }
        return next;
      });
    },
    [selectedArmyGroup, unitCountry]
  );

  const handleAddArmyGroup = useCallback(
    (country: CountryId, name: string, color: string) => {
      setArmyGroupDefs((prev) => ({
        ...prev,
        [country]: [...(prev[country] ?? []), { name, color }],
      }));
    },
    []
  );

  const handleRemoveArmyGroup = useCallback(
    (country: CountryId, name: string) => {
      setArmyGroupDefs((prev) => ({
        ...prev,
        [country]: (prev[country] ?? []).filter((g) => g.name !== name),
      }));
      setUnitPlacement((prev) => {
        const next: UnitPlacementData = {};
        for (const [regionId, entries] of Object.entries(prev)) {
          const filtered = entries.filter(
            (e) => !(e.owner === country && e.armyGroupName === name)
          );
          if (filtered.length > 0) next[regionId] = filtered;
        }
        return next;
      });
    },
    []
  );

  const resetUnitPlacement = useCallback(
    (original: UnitPlacementData, originalDefs: Record<CountryId, ArmyGroupDef[]>) => {
      setUnitPlacement({ ...original });
      setArmyGroupDefs({ ...originalDefs });
    },
    []
  );

  const confirmSave = useCallback(
    (saved: UnitPlacementData, savedDefs: Record<CountryId, ArmyGroupDef[]>) => {
      setOriginalUnitPlacement({ ...saved });
      setOriginalArmyGroupDefs({ ...savedDefs });
    },
    []
  );

  const hasChanges =
    JSON.stringify(unitPlacement) !== JSON.stringify(originalUnitPlacement) ||
    JSON.stringify(armyGroupDefs) !== JSON.stringify(originalArmyGroupDefs);

  return {
    unitPlacement,
    originalUnitPlacement,
    armyGroupDefs,
    originalArmyGroupDefs,
    selectedArmyGroup,
    setSelectedArmyGroup,
    unitCountry,
    setUnitCountry,
    handleRegionUnitAdd,
    handleRegionUnitRemove,
    handleAddArmyGroup,
    handleRemoveArmyGroup,
    resetUnitPlacement,
    confirmSave,
    hasChanges,
  };
}

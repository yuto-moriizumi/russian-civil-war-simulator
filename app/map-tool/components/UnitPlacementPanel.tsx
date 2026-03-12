"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { COUNTRY_METADATA, getAllCountryIds } from "../../data/countryMetadata";
import { CountryId } from "../../types/game";
import { UnitPlacementData } from "../../data/map/initialUnitPlacement";

interface ArmyGroupDef {
  name: string;
  color: string;
}

const ARMY_GROUP_COLORS = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
  "#84CC16", // lime
];

interface UnitPlacementPanelProps {
  /** Which country's units we are placing */
  selectedCountry: CountryId;
  onSelectCountry: (country: CountryId) => void;
  /** Currently active army group name (used when clicking a region) */
  selectedArmyGroup: string | null;
  onSelectArmyGroup: (name: string | null) => void;
  /** Army groups defined for the selected country */
  armyGroups: Record<CountryId, ArmyGroupDef[]>;
  onAddArmyGroup: (country: CountryId, name: string, color: string) => void;
  onRemoveArmyGroup: (country: CountryId, name: string) => void;
  /** Current placement data (read-only for summary display) */
  placement: UnitPlacementData;
}

export default function UnitPlacementPanel({
  selectedCountry,
  onSelectCountry,
  selectedArmyGroup,
  onSelectArmyGroup,
  armyGroups,
  onAddArmyGroup,
  onRemoveArmyGroup,
  placement,
}: UnitPlacementPanelProps) {
  const countries = useMemo(
    () =>
      getAllCountryIds().map((id) => {
        const meta = COUNTRY_METADATA[id];
        return { id, name: meta.name, color: meta.color, flag: meta.flag };
      }),
    []
  );

  // Combo-box state for country selection
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const comboBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // New army group form
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(ARMY_GROUP_COLORS[0]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countries;
    const q = searchQuery.toLowerCase();
    return countries.filter(
      (c) =>
        c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [countries, searchQuery]);

  const validHighlight = Math.min(
    highlightedIndex,
    Math.max(0, filteredCountries.length - 1)
  );

  const selectedCountryMeta = COUNTRY_METADATA[selectedCountry];
  const selectedLabel = selectedCountryMeta
    ? `${selectedCountryMeta.id} - ${selectedCountryMeta.name}`
    : selectedCountry;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        comboBoxRef.current &&
        !comboBoxRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsDropdownOpen(true);
      setHighlightedIndex((p) =>
        Math.min(p + 1, filteredCountries.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isDropdownOpen && filteredCountries[validHighlight]) {
        onSelectCountry(filteredCountries[validHighlight].id);
        setSearchQuery("");
        setIsDropdownOpen(false);
      }
    } else if (e.key === "Escape") {
      setSearchQuery("");
      setIsDropdownOpen(false);
      inputRef.current?.blur();
    }
  };

  // Current country's army groups
  const countryArmyGroups = armyGroups[selectedCountry] ?? [];

  // Summary: how many divisions per army group in this country
  const summaryByGroup = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const entries of Object.values(placement)) {
      for (const entry of entries) {
        if (entry.owner === selectedCountry) {
          totals[entry.armyGroupName] =
            (totals[entry.armyGroupName] ?? 0) + entry.count;
        }
      }
    }
    return totals;
  }, [placement, selectedCountry]);

  // Total divisions for this country across all regions
  const totalDivisions = useMemo(
    () => Object.values(summaryByGroup).reduce((s, n) => s + n, 0),
    [summaryByGroup]
  );

  // Suggest next color
  const nextColor =
    ARMY_GROUP_COLORS[countryArmyGroups.length % ARMY_GROUP_COLORS.length];

  // Auto-fill suggested name and color when country changes
  useEffect(() => {
    const meta = COUNTRY_METADATA[selectedCountry];
    const existing = armyGroups[selectedCountry] ?? [];
    if (newGroupName === "" || !existing.some((g) => g.name === newGroupName)) {
      // suggest a default name
      setNewGroupName(
        existing.length === 0
          ? meta?.firstArmyGroupName ?? `${selectedCountry} Army`
          : `${meta?.adjective ?? selectedCountry} Group ${existing.length + 1}`
      );
    }
    setNewGroupColor(
      ARMY_GROUP_COLORS[existing.length % ARMY_GROUP_COLORS.length]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]);

  void nextColor; // suppress unused warning - used above

  return (
    <div className="space-y-3">
      {/* Country selector */}
      <div className="rounded border border-gray-700 bg-gray-900 p-3">
        <h3 className="mb-2 text-sm font-semibold">Country</h3>
        <div ref={comboBoxRef} className="relative">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selectedLabel}
            className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
          {isDropdownOpen && (
            <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded border border-gray-600 bg-gray-800 shadow-lg">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((c, idx) => (
                  <div
                    key={c.id}
                    role="option"
                    aria-selected={c.id === selectedCountry}
                    onClick={() => {
                      onSelectCountry(c.id);
                      setSearchQuery("");
                      setIsDropdownOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex cursor-pointer items-center gap-2 border-b border-gray-700 px-2 py-1.5 text-sm last:border-0 ${
                      idx === validHighlight
                        ? "bg-blue-600/50"
                        : c.id === selectedCountry
                        ? "bg-blue-900/30"
                        : "hover:bg-gray-700"
                    }`}
                  >
                    <div
                      className="h-3 w-3 flex-shrink-0 rounded border border-gray-500"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="truncate">
                      <span className="font-semibold">{c.id}</span>
                      <span className="text-gray-400"> – {c.name}</span>
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-gray-400">
                  No results
                </div>
              )}
            </div>
          )}
        </div>
        {/* Selected country swatch */}
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
          <div
            className="h-3 w-3 rounded border border-gray-500"
            style={{ backgroundColor: selectedCountryMeta?.color }}
          />
          <span>{selectedCountryMeta?.name ?? selectedCountry}</span>
          <span className="ml-auto text-gray-500">
            {totalDivisions} div{totalDivisions !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Army Groups */}
      <div className="rounded border border-gray-700 bg-gray-900 p-3">
        <h3 className="mb-2 text-sm font-semibold">Army Groups</h3>

        {countryArmyGroups.length === 0 && (
          <p className="mb-2 text-xs text-gray-500">
            No army groups yet. Create one below.
          </p>
        )}

        <div className="space-y-1">
          {countryArmyGroups.map((group) => (
            <div
              key={group.name}
              onClick={() =>
                onSelectArmyGroup(
                  selectedArmyGroup === group.name ? null : group.name
                )
              }
              className={`flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5 text-sm transition-colors ${
                selectedArmyGroup === group.name
                  ? "border-white/40 bg-white/10"
                  : "border-gray-700 hover:border-gray-500 hover:bg-gray-800"
              }`}
            >
              <div
                className="h-3 w-3 flex-shrink-0 rounded border border-gray-500"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex-1 truncate text-xs font-medium">
                {group.name}
              </span>
              <span className="text-[10px] text-gray-400">
                {summaryByGroup[group.name] ?? 0}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedArmyGroup === group.name) {
                    onSelectArmyGroup(null);
                  }
                  onRemoveArmyGroup(selectedCountry, group.name);
                }}
                className="ml-1 rounded px-1 py-0.5 text-[10px] text-red-400 hover:bg-red-900/30"
                title="Remove army group"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Create new army group */}
        <div className="mt-3 space-y-2 border-t border-gray-700 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            New Army Group
          </p>
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Name"
            className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Color</label>
            <div className="flex gap-1">
              {ARMY_GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewGroupColor(c)}
                  className={`h-4 w-4 rounded border transition-transform ${
                    newGroupColor === c
                      ? "scale-125 border-white"
                      : "border-gray-600"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              const name = newGroupName.trim();
              if (!name) return;
              if (countryArmyGroups.some((g) => g.name === name)) return;
              onAddArmyGroup(selectedCountry, name, newGroupColor);
              onSelectArmyGroup(name);
              // Suggest next name
              const meta = COUNTRY_METADATA[selectedCountry];
              setNewGroupName(
                `${meta?.adjective ?? selectedCountry} Group ${countryArmyGroups.length + 2}`
              );
              setNewGroupColor(
                ARMY_GROUP_COLORS[
                  (countryArmyGroups.length + 1) % ARMY_GROUP_COLORS.length
                ]
              );
            }}
            disabled={!newGroupName.trim()}
            className="w-full rounded bg-blue-700 px-2 py-1 text-xs hover:bg-blue-600 disabled:opacity-50"
          >
            + Add Army Group
          </button>
        </div>
      </div>

      {/* Usage hint */}
      {selectedArmyGroup ? (
        <div className="rounded border border-green-700 bg-green-900/20 p-2 text-[10px] text-green-300">
          <div className="font-semibold">Active: {selectedArmyGroup}</div>
          <div className="mt-1 text-green-400/80">
            Left-click region to add division
          </div>
          <div className="text-green-400/80">
            Right-click region to remove last division
          </div>
        </div>
      ) : (
        <div className="rounded border border-gray-700 bg-gray-800 p-2 text-[10px] text-gray-500">
          Select an army group above to start placing units
        </div>
      )}
    </div>
  );
}

'use client';

import { RegionState, Adjacency, CountryId, ActiveCombat } from '../../types/game';
import { COUNTRY_COLORS, getAdjacentRegions } from '../../utils/mapUtils';
import { MAJOR_CITY_CAP_BONUS, DIVISIONS_PER_STATE } from '../../utils/commandPower';

interface RegionTooltipProps {
  hoveredRegion: string;
  regions: RegionState;
}

export function RegionTooltip({ hoveredRegion, regions }: RegionTooltipProps) {
  const region = regions[hoveredRegion];
  if (!region) return null;

  return (
    <div className="absolute left-4 bottom-16 z-10 rounded-lg border border-stone-600 bg-stone-900/90 p-3">
      <div className="text-sm font-bold text-white">
        {region.name}
      </div>
      <div className="text-xs text-stone-400">
        ID: {hoveredRegion}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: COUNTRY_COLORS[region.owner] }}
        />
        <span className="text-xs capitalize text-stone-300">
          {region.owner}
        </span>
      </div>
      {region.divisions.length > 0 && (
        <div className="mt-1 text-xs text-amber-400">
          Divisions: {region.divisions.length} | 
          Total HP: {region.divisions.reduce((sum, d) => sum + d.hp, 0)}
        </div>
      )}
    </div>
  );
}

interface RegionInfoPanelProps {
  selectedRegion: string;
  selectedUnitRegion: string | null;
  regions: RegionState;
  adjacency: Adjacency;
  playerCountry: CountryId;
  unitsInReserve: number;
  activeCombats: ActiveCombat[];
  coreRegions?: string[];
  onRegionSelect: (regionId: string | null) => void;
  onUnitSelect: (regionId: string | null) => void;
  onDeployUnit: () => void;
}

export function RegionInfoPanel({
  selectedRegion,
  selectedUnitRegion,
  regions,
  adjacency,
  playerCountry,
  unitsInReserve,
  activeCombats,
  coreRegions,
  onRegionSelect,
  onUnitSelect,
  onDeployUnit,
}: RegionInfoPanelProps) {
  const region = regions[selectedRegion];
  if (!region) return null;

  return (
    <div className={`absolute left-4 bottom-16 z-10 rounded-lg border-2 bg-stone-900/95 p-4 min-w-[280px] ${
      selectedUnitRegion === selectedRegion ? 'border-cyan-400' : 'border-amber-500'
    }`}>
      <div className={`mb-2 text-lg font-bold ${
        selectedUnitRegion === selectedRegion ? 'text-cyan-400' : 'text-amber-400'
      }`}>
        {region.name}
        {selectedUnitRegion === selectedRegion && (
          <span className="ml-2 text-xs font-normal">(Unit Selected)</span>
        )}
      </div>
      <div className="text-xs text-stone-500 -mt-1 mb-2">
        ID: {selectedRegion}
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-stone-400">Control:</span>
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: COUNTRY_COLORS[region.owner] }}
          />
          <span className="capitalize text-white">
            {region.owner}
          </span>
        </div>
        <div className="text-stone-400">
          Country: {region.countryIso3}
        </div>
        
        {/* Command power contribution */}
        <div className="rounded bg-stone-800 p-2 mt-2">
          <div className="text-xs font-semibold text-stone-300 mb-1">Command Power Contribution:</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400">Base:</span>
              <span className="text-green-400">+{DIVISIONS_PER_STATE}</span>
            </div>
            {MAJOR_CITY_CAP_BONUS[selectedRegion] && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Major City Bonus:</span>
                <span className="text-amber-400 font-semibold">+{MAJOR_CITY_CAP_BONUS[selectedRegion]}</span>
              </div>
            )}
            {coreRegions?.includes(selectedRegion) && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Core Region Bonus:</span>
                <span className="text-purple-400 font-semibold">+1</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs border-t border-stone-700 pt-1 font-semibold">
              <span className="text-stone-300">Total Contribution:</span>
              <span className={MAJOR_CITY_CAP_BONUS[selectedRegion] || coreRegions?.includes(selectedRegion) ? "text-amber-400" : "text-green-400"}>
                +{DIVISIONS_PER_STATE + (MAJOR_CITY_CAP_BONUS[selectedRegion] || 0) + (coreRegions?.includes(selectedRegion) ? 1 : 0)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-stone-400 mt-2">
          Divisions: {region.divisions.length}
        </div>
        {/* Show division combat stats */}
        {region.divisions.length > 0 && (
          <div className="mt-2 space-y-1 rounded bg-stone-800 p-2">
            <div className="text-xs font-semibold text-stone-300 mb-1">Combat Stats:</div>
            {region.divisions.map((div) => (
              <div key={div.id} className="flex items-center justify-between text-xs">
                <span className="text-stone-400 truncate max-w-[120px]" title={div.name}>
                  {div.name.length > 15 ? div.name.substring(0, 15) + '...' : div.name}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-red-400" title="HP">❤ {div.hp}/{div.maxHp}</span>
                  <span className="text-orange-400" title="Attack">⚔ {div.attack}</span>
                  <span className="text-blue-400" title="Defence">🛡 {div.defence}</span>
                </span>
              </div>
            ))}
            <div className="border-t border-stone-700 pt-1 mt-1 flex justify-between text-xs font-semibold">
              <span className="text-stone-300">Total:</span>
              <span className="flex items-center gap-2">
                <span className="text-red-400">❤ {region.divisions.reduce((sum, d) => sum + d.hp, 0)}</span>
                <span className="text-orange-400">⚔ {region.divisions.reduce((sum, d) => sum + d.attack, 0)}</span>
                <span className="text-blue-400">🛡 {Math.round(region.divisions.reduce((sum, d) => sum + d.defence, 0) / region.divisions.length)}</span>
              </span>
            </div>
          </div>
        )}
        <div className="text-stone-400">
          Adjacent: {getAdjacentRegions(adjacency, selectedRegion).length} regions
        </div>
      </div>
      
      {/* Actions for player-owned regions */}
      {region.owner === playerCountry && (
        <div className="mt-3 space-y-2 border-t border-stone-700 pt-3">
          {/* Deploy unit button */}
          {unitsInReserve > 0 && (() => {
            const hasActiveCombat = activeCombats.some(c => c.regionId === selectedRegion && !c.isComplete);
            return (
              <>
                <button
                  onClick={onDeployUnit}
                  disabled={hasActiveCombat}
                  className={`w-full rounded py-2 text-sm font-semibold text-white ${
                    hasActiveCombat
                      ? 'bg-stone-600 cursor-not-allowed'
                      : 'bg-green-700 hover:bg-green-600'
                  }`}
                >
                  Deploy Unit ({unitsInReserve} available)
                </button>
                {hasActiveCombat && (
                  <p className="text-xs text-red-400">
                    Cannot deploy to regions with ongoing combat
                  </p>
                )}
              </>
            );
          })()}
          
          {/* Unit selection info */}
          {region.divisions.length > 0 && selectedUnitRegion === selectedRegion && (
            <div className="space-y-2 rounded bg-cyan-900/30 p-2">
              <p className="text-xs text-cyan-300">
                Right-click an adjacent region to move {region.divisions.length} division(s)
              </p>
              <p className="text-xs text-stone-400">
                Travel time: ~6 hours
              </p>
            </div>
          )}
          
          {region.divisions.length > 0 && selectedUnitRegion !== selectedRegion && (
            <button
              onClick={() => onUnitSelect(selectedRegion)}
              className="w-full rounded bg-blue-700 py-2 text-sm font-semibold text-white hover:bg-blue-600"
            >
              Select Divisions ({region.divisions.length})
            </button>
          )}
        </div>
      )}

      {/* Show adjacent regions when unit is selected */}
      {selectedUnitRegion === selectedRegion && region.owner === playerCountry && (
        <div className="mt-3 space-y-1 border-t border-stone-700 pt-3">
          <p className="text-xs text-stone-400 mb-2">Adjacent regions (right-click to move):</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {getAdjacentRegions(adjacency, selectedRegion).map((adjId) => {
              const adjRegion = regions[adjId];
              if (!adjRegion) return null;
              const isEnemy = adjRegion.owner !== playerCountry && adjRegion.owner !== 'neutral';
              return (
                <div
                  key={adjId}
                  className={`w-full rounded px-2 py-1 text-left text-xs ${
                    isEnemy 
                      ? 'bg-red-900/50 text-red-200' 
                      : adjRegion.owner === playerCountry
                      ? 'bg-green-900/50 text-green-200'
                      : 'bg-stone-700 text-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{adjRegion.name}</span>
                    <span className="flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: COUNTRY_COLORS[adjRegion.owner] }}
                      />
                      {adjRegion.divisions.length > 0 && <span>({adjRegion.divisions.length})</span>}
                    </span>
                  </div>
                  {isEnemy && adjRegion.divisions.length > 0 && (
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-red-300">
                      <span>❤ {adjRegion.divisions.reduce((sum, d) => sum + d.hp, 0)}</span>
                      <span>⚔ {adjRegion.divisions.reduce((sum, d) => sum + d.attack, 0)}</span>
                      <span>🛡 {Math.round(adjRegion.divisions.reduce((sum, d) => sum + d.defence, 0) / adjRegion.divisions.length)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <button
        onClick={() => {
          onRegionSelect(null);
          onUnitSelect(null);
        }}
        className="mt-3 w-full rounded bg-stone-700 py-1 text-xs text-stone-300 hover:bg-stone-600"
      >
        Deselect
      </button>
    </div>
  );
}

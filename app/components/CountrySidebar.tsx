'use client';

import { useGameStore } from '../store/useGameStore';
import { CountryId, RelationshipType } from '../types/game';
import SidebarPanel from './SidebarPanel';
import { countries } from '../data/gameData';
import { COUNTRY_NAMES } from '../data/countries';
import Image from 'next/image';

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  neutral: 'Neutral',
  military_access: 'Military Access',
  war: 'War',
  autonomy: 'Autonomy',
};

const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  neutral: 'text-stone-400',
  military_access: 'text-blue-400',
  war: 'text-red-400',
  autonomy: 'text-purple-400',
};

export default function CountrySidebar() {
  // Store selectors
  const isOpen = useGameStore(state => state.isCountrySidebarOpen);
  const countryId = useGameStore(state => state.selectedCountryId);
  const playerCountry = useGameStore(state => state.selectedCountry?.id);
  const relationships = useGameStore(state => state.relationships);
  
  // Actions
  const setIsCountrySidebarOpen = useGameStore(state => state.setIsCountrySidebarOpen);
  const setRelationship = useGameStore(state => state.setRelationship);
  
  if (!countryId || !playerCountry) return null;
  
  const onClose = () => setIsCountrySidebarOpen(false);
  const country = countries.find(c => c.id === countryId);
  const countryName = country?.name || COUNTRY_NAMES[countryId];

  // Get relationships from this country to others
  const otherCountries: CountryId[] = ['soviet', 'white', 'finland', 'ukraine', 'don', 'fswr', 'romania', 'neutral', 'foreign'].filter(
    f => f !== countryId
  ) as CountryId[];

  const getRelationshipStatus = (from: CountryId, to: CountryId): RelationshipType => {
    const relation = relationships.find(
      r => r.fromCountry === from && r.toCountry === to
    );
    return relation ? relation.type : 'neutral';
  };

  const handleMilitaryAccessToggle = (isChecked: boolean) => {
    const currentStatus = getRelationshipStatus(playerCountry, countryId);
    if (isChecked && currentStatus !== 'war') {
      setRelationship(playerCountry, countryId, 'military_access');
    } else if (!isChecked && currentStatus === 'military_access') {
      setRelationship(playerCountry, countryId, 'neutral');
    }
  };

  const handleDeclareWar = () => {
    setRelationship(playerCountry, countryId, 'war');
  };

  const playerToTargetStatus = getRelationshipStatus(playerCountry, countryId);
  const targetToPlayerStatus = getRelationshipStatus(countryId, playerCountry);
  const isPlayable = countryId === 'soviet' || countryId === 'white' || countryId === 'finland' || countryId === 'ukraine' || countryId === 'don' || countryId === 'fswr' || countryId === 'romania';

  return (
    <SidebarPanel
      isOpen={isOpen}
      onClose={onClose}
      title={countryName}
      subtitle="Country Overview"
      side="left"
    >
      <div className="flex flex-col space-y-6">
        {/* Header Info */}
        <div className="flex items-center space-x-4 bg-stone-900 p-4 rounded-lg border border-stone-700">
          <div className="relative w-16 h-10 border border-stone-600 shadow-md bg-stone-700 flex items-center justify-center overflow-hidden">
            {country?.flag ? (
              <Image
                src={country.flag}
                alt={`${countryName} flag`}
                fill
                className="object-cover"
              />
            ) : (
              <div 
                className="w-full h-full" 
                style={{ backgroundColor: country?.color || '#555' }}
              />
            )}
          </div>
          <div>
            <div className="text-xl font-bold text-stone-100">{countryName}</div>
            <div className="text-sm text-stone-400 capitalize">{countryId} Country</div>
          </div>
        </div>

        {/* Diplomacy Section for non-player playable countries */}
        {countryId !== playerCountry && isPlayable && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 px-1">
              Diplomacy
            </h3>
            <div className="bg-stone-900 rounded-lg border border-stone-700 p-4 space-y-4">
              <div className="text-sm space-y-2">
                <div className="flex flex-col gap-1">
                  <div className="text-stone-400 text-xs">Relationship status:</div>
                  <div className="text-stone-100">
                    {playerToTargetStatus === 'autonomy' && (
                      <span className="text-purple-400 font-bold">This country is an Autonomy Servant to you.</span>
                    )}
                    {targetToPlayerStatus === 'autonomy' && (
                      <span className="text-purple-400 font-bold">This country is your Autonomy Master.</span>
                    )}
                    {(playerToTargetStatus === 'war' || targetToPlayerStatus === 'war') && (
                      <span className="text-red-400 font-bold">You are at war with this country.</span>
                    )}
                    {playerToTargetStatus === 'military_access' && targetToPlayerStatus === 'military_access' && (
                      <span className="text-blue-400 font-bold">You have mutual military access.</span>
                    )}
                    {playerToTargetStatus === 'military_access' && targetToPlayerStatus !== 'military_access' && targetToPlayerStatus !== 'war' && (
                      <span className="text-blue-400 font-bold">You grant military access to this country.</span>
                    )}
                    {playerToTargetStatus !== 'military_access' && playerToTargetStatus !== 'war' && targetToPlayerStatus === 'military_access' && (
                      <span className="text-blue-400 font-bold">This country grants military access to you.</span>
                    )}
                    {playerToTargetStatus === 'neutral' && targetToPlayerStatus === 'neutral' && (
                      <span className="text-stone-500 font-bold">You are currently neutral towards each other.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="grant-access-sidebar"
                    checked={playerToTargetStatus === 'military_access' || playerToTargetStatus === 'war'}
                    disabled={playerToTargetStatus === 'war' || playerToTargetStatus === 'autonomy'}
                    onChange={(e) => handleMilitaryAccessToggle(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-stone-700 border-stone-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="grant-access-sidebar" className="text-sm text-stone-300 cursor-pointer">
                    Grant Military Access
                  </label>
                </div>

                <button
                  onClick={handleDeclareWar}
                  disabled={playerToTargetStatus === 'war' || targetToPlayerStatus === 'war' || playerToTargetStatus === 'autonomy' || targetToPlayerStatus === 'autonomy'}
                  className={`w-full font-bold py-2 px-3 rounded transition-colors ${
                    (playerToTargetStatus === 'war' || targetToPlayerStatus === 'war')
                      ? 'bg-red-900/50 text-red-400 cursor-not-allowed border border-red-800'
                      : (playerToTargetStatus === 'autonomy' || targetToPlayerStatus === 'autonomy')
                      ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                      : 'bg-red-700 hover:bg-red-600 text-white'
                  }`}
                >
                  {playerToTargetStatus === 'war' || targetToPlayerStatus === 'war'
                    ? '⚔ At War' 
                    : (playerToTargetStatus === 'autonomy' || targetToPlayerStatus === 'autonomy')
                    ? '⚔ Cannot Declare War (Autonomy)'
                    : '⚔ Declare War'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Relationships Section (Read Only) */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 px-1">
            Global Relationships
          </h3>
          
          <div className="bg-stone-900 rounded-lg border border-stone-700 divide-y divide-stone-800">
            {otherCountries.map((otherId: CountryId) => {
              if (otherId === 'neutral' || otherId === 'foreign') return null;
              
              const outwardRelation = getRelationshipStatus(countryId, otherId);
              const inwardRelation = getRelationshipStatus(otherId, countryId);
              
              return (
                <div key={otherId} className="p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-stone-200">
                      {COUNTRY_NAMES[otherId]}
                    </span>
                  </div>
                  <div className="flex flex-col text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-medium">Outward:</span>
                      <span className={`font-bold ${RELATIONSHIP_COLORS[outwardRelation]}`}>
                        {outwardRelation === 'autonomy' ? 'Autonomy Master' : RELATIONSHIP_LABELS[outwardRelation]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-medium">Inward:</span>
                      <span className={`font-bold ${RELATIONSHIP_COLORS[inwardRelation]}`}>
                        {inwardRelation === 'autonomy' ? 'Autonomy Servant' : RELATIONSHIP_LABELS[inwardRelation]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SidebarPanel>
  );
}

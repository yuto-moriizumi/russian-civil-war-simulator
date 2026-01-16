'use client';

import { CountryId, Relationship, RelationshipType} from '../types/game';
import SidebarPanel from './SidebarPanel';

interface RelationshipsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  playerCountry: CountryId;
  relationships: Relationship[];
  onSetRelationship: (fromCountry: CountryId, toCountry: CountryId, type: RelationshipType) => void;
}

const COUNTRY_NAMES: Record<CountryId, string> = {
  soviet: 'Soviet Russia',
  white: 'White Army',
  finland: 'Finland',
  ukraine: 'Ukraine',
  don: 'Don Republic',
  fswr: "Finnish Socialist Workers' Republic",
  iskolat: 'Iskolat (Latvian Soviet Republic)',
  neutral: 'Neutral',
  foreign: 'Foreign',
  germany: 'German Empire',
  bulgaria: 'Tsardom of Bulgaria',
  poland: 'Kingdom of Poland',
};

const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  neutral: 'bg-gray-600',
  military_access: 'bg-blue-600',
  war: 'bg-red-600',
  autonomy: 'bg-purple-600',
};

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  neutral: 'Neutral',
  military_access: 'Military Access',
  war: 'War',
  autonomy: 'Autonomy',
};

export default function RelationshipsPanel({
  isOpen,
  onClose,
  playerCountry,
  relationships,
  onSetRelationship,
}: RelationshipsPanelProps) {
  // Get all countries except player, neutral, and foreign
  const otherCountries: CountryId[] = ['soviet', 'white', 'finland', 'ukraine', 'don', 'fswr'].filter(
    f => f !== playerCountry
  ) as CountryId[];

  const getRelationshipStatus = (targetCountry: CountryId): RelationshipType => {
    // Check if target grants us access/war
    const theirRelation = relationships.find(
      r => r.fromCountry === targetCountry && r.toCountry === playerCountry
    );
    return theirRelation ? theirRelation.type : 'neutral';
  };

  const getOurRelationshipStatus = (targetCountry: CountryId): RelationshipType => {
    // Check if we grant them access/war
    const ourRelation = relationships.find(
      r => r.fromCountry === playerCountry && r.toCountry === targetCountry
    );
    return ourRelation ? ourRelation.type : 'neutral';
  };

  const handleMilitaryAccessToggle = (targetCountry: CountryId, isChecked: boolean) => {
    const currentStatus = getOurRelationshipStatus(targetCountry);
    // If checking military access and currently at war, keep war
    // If checking military access and currently neutral, set to military access
    // If unchecking military access, set to neutral
    if (isChecked && currentStatus !== 'war') {
      onSetRelationship(playerCountry, targetCountry, 'military_access');
    } else if (!isChecked && currentStatus === 'military_access') {
      onSetRelationship(playerCountry, targetCountry, 'neutral');
    }
  };

  const handleDeclareWar = (targetCountry: CountryId) => {
    onSetRelationship(playerCountry, targetCountry, 'war');
  };

  return (
    <SidebarPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Diplomatic Relations"
      subtitle="Manage your relationships with other countries"
      side="left"
    >
      <div className="space-y-3">
        {otherCountries.map((country: CountryId) => {
          const theirStatus = getRelationshipStatus(country);
          const ourStatus = getOurRelationshipStatus(country);

          return (
            <div key={country} className="bg-stone-900 rounded p-3 border border-stone-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-stone-100">{COUNTRY_NAMES[country]}</h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold text-white ${RELATIONSHIP_COLORS[ourStatus === 'neutral' && theirStatus === 'war' ? 'war' : ourStatus]}`}
                >
                  {ourStatus === 'neutral' && theirStatus === 'war' ? 'At War' : ourStatus === 'autonomy' ? 'Autonomy Master' : RELATIONSHIP_LABELS[ourStatus]}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="text-stone-400">
                  <span className="font-semibold">They grant us:</span>{' '}
                  <span className={`font-bold ${theirStatus === 'war' ? 'text-red-400' : theirStatus === 'military_access' ? 'text-blue-400' : theirStatus === 'autonomy' ? 'text-purple-400' : 'text-gray-400'}`}>
                    {theirStatus === 'autonomy' ? 'Autonomy Master' : RELATIONSHIP_LABELS[theirStatus]}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`military-access-${country}`}
                      checked={ourStatus === 'military_access' || ourStatus === 'war'}
                      disabled={ourStatus === 'war' || ourStatus === 'autonomy'}
                      onChange={(e) => handleMilitaryAccessToggle(country, e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-stone-700 border-stone-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`military-access-${country}`} className="text-stone-300 font-semibold">
                      Grant Military Access
                    </label>
                  </div>

                  <button
                    onClick={() => handleDeclareWar(country)}
                    disabled={ourStatus === 'war' || theirStatus === 'war' || ourStatus === 'autonomy' || theirStatus === 'autonomy'}
                    className={`w-full font-bold py-2 px-3 rounded transition-colors ${
                      ourStatus === 'war' || theirStatus === 'war'
                        ? 'bg-red-900/50 text-red-400 cursor-not-allowed border border-red-800'
                        : (ourStatus === 'autonomy' || theirStatus === 'autonomy')
                        ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                        : 'bg-red-700 hover:bg-red-600 text-white'
                    }`}
                  >
                    {ourStatus === 'war' || theirStatus === 'war'
                      ? '⚔ At War' 
                      : (ourStatus === 'autonomy' || theirStatus === 'autonomy')
                      ? '⚔ Cannot Declare War (Autonomy)'
                      : '⚔ Declare War'}
                  </button>
                </div>

                <div className="mt-2 pt-2 border-t border-stone-700 text-stone-400">
                  {(ourStatus === 'military_access' || ourStatus === 'autonomy') && (
                    <p>✓ They can move through your territory without combat</p>
                  )}
                  {ourStatus === 'war' && (
                    <p>⚔ They can attack and occupy your regions</p>
                  )}
                  {ourStatus === 'neutral' && theirStatus === 'neutral' && (
                    <p>✕ No movement between territories allowed</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="mt-3 p-2 bg-stone-900 rounded text-xs text-stone-400">
          <p className="font-semibold mb-1">Relationship Types:</p>
          <ul className="space-y-1 ml-2">
            <li><span className="text-gray-400">Neutral:</span> No troop movement allowed</li>
            <li><span className="text-blue-400">Military Access:</span> Troops can move, no occupation</li>
            <li><span className="text-red-400">War:</span> Troops can move and occupy regions</li>
            <li><span className="text-purple-400">Autonomy:</span> Master/Servant bond with mutual access, no mutual war, and joint defense/offense</li>
          </ul>
        </div>
      </div>
    </SidebarPanel>
  );
}

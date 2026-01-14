'use client';

import { FactionId, Relationship, RelationshipType } from '../types/game';

interface RelationshipsPanelProps {
  playerFaction: FactionId;
  relationships: Relationship[];
  onSetRelationship: (fromFaction: FactionId, toFaction: FactionId, type: RelationshipType) => void;
}

const FACTION_NAMES: Record<FactionId, string> = {
  soviet: 'Soviet Russia',
  white: 'White Army',
  finland: 'Finland',
  neutral: 'Neutral',
  foreign: 'Foreign',
};

const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  neutral: 'bg-gray-600',
  military_access: 'bg-blue-600',
  war: 'bg-red-600',
};

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  neutral: 'Neutral',
  military_access: 'Military Access',
  war: 'War',
};

export default function RelationshipsPanel({
  playerFaction,
  relationships,
  onSetRelationship,
}: RelationshipsPanelProps) {
  // Get all factions except player, neutral, and foreign
  const otherFactions: FactionId[] = ['soviet', 'white', 'finland'].filter(
    f => f !== playerFaction
  ) as FactionId[];

  const getRelationshipStatus = (targetFaction: FactionId): RelationshipType => {
    // Check if target grants us access/war
    const theirRelation = relationships.find(
      r => r.fromFaction === targetFaction && r.toFaction === playerFaction
    );
    return theirRelation ? theirRelation.type : 'neutral';
  };

  const getOurRelationshipStatus = (targetFaction: FactionId): RelationshipType => {
    // Check if we grant them access/war
    const ourRelation = relationships.find(
      r => r.fromFaction === playerFaction && r.toFaction === targetFaction
    );
    return ourRelation ? ourRelation.type : 'neutral';
  };

  const handleRelationshipChange = (targetFaction: FactionId, newType: RelationshipType) => {
    onSetRelationship(playerFaction, targetFaction, newType);
  };

  const handleMilitaryAccessToggle = (targetFaction: FactionId, isChecked: boolean) => {
    const currentStatus = getOurRelationshipStatus(targetFaction);
    // If checking military access and currently at war, keep war
    // If checking military access and currently neutral, set to military access
    // If unchecking military access, set to neutral
    if (isChecked && currentStatus !== 'war') {
      onSetRelationship(playerFaction, targetFaction, 'military_access');
    } else if (!isChecked && currentStatus === 'military_access') {
      onSetRelationship(playerFaction, targetFaction, 'neutral');
    }
  };

  const handleDeclareWar = (targetFaction: FactionId) => {
    onSetRelationship(playerFaction, targetFaction, 'war');
  };

  return (
    <div className="absolute top-20 left-4 bg-stone-800 border border-stone-700 rounded-lg p-4 shadow-xl max-w-md z-10">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-stone-100">Diplomatic Relations</h2>
        <p className="text-xs text-stone-400 mt-1">
          Manage your relationships with other factions
        </p>
      </div>

      <div className="space-y-3">
        {otherFactions.map(faction => {
          const theirStatus = getRelationshipStatus(faction);
          const ourStatus = getOurRelationshipStatus(faction);

          return (
            <div key={faction} className="bg-stone-900 rounded p-3 border border-stone-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-stone-100">{FACTION_NAMES[faction]}</h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold text-white ${RELATIONSHIP_COLORS[theirStatus]}`}
                >
                  {RELATIONSHIP_LABELS[theirStatus]}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="text-stone-400">
                  <span className="font-semibold">They grant us:</span>{' '}
                  <span className={`font-bold ${theirStatus === 'war' ? 'text-red-400' : theirStatus === 'military_access' ? 'text-blue-400' : 'text-gray-400'}`}>
                    {RELATIONSHIP_LABELS[theirStatus]}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`military-access-${faction}`}
                      checked={ourStatus === 'military_access' || ourStatus === 'war'}
                      disabled={ourStatus === 'war'}
                      onChange={(e) => handleMilitaryAccessToggle(faction, e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-stone-700 border-stone-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`military-access-${faction}`} className="text-stone-300 font-semibold">
                      Grant Military Access
                    </label>
                  </div>

                  {ourStatus !== 'war' && (
                    <button
                      onClick={() => handleDeclareWar(faction)}
                      className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-3 rounded transition-colors"
                    >
                      ⚔ Declare War
                    </button>
                  )}

                  {ourStatus === 'war' && (
                    <div className="bg-red-900/30 border border-red-700 rounded p-2 text-red-300 font-semibold">
                      ⚔ At War
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-stone-700 text-stone-400">
                  {ourStatus === 'military_access' && (
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
      </div>

      <div className="mt-3 p-2 bg-stone-900 rounded text-xs text-stone-400">
        <p className="font-semibold mb-1">Relationship Types:</p>
        <ul className="space-y-1 ml-2">
          <li><span className="text-gray-400">Neutral:</span> No troop movement allowed</li>
          <li><span className="text-blue-400">Military Access:</span> Troops can move, no occupation</li>
          <li><span className="text-red-400">War:</span> Troops can move and occupy regions</li>
        </ul>
      </div>
    </div>
  );
}

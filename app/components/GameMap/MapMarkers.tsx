/* eslint-disable @next/next/no-img-element */
'use client';

import { Marker } from 'react-map-gl/maplibre';
import { Region, FactionId, Movement, ActiveCombat } from '../../types/game';
import { FACTION_COLORS } from '../../utils/mapUtils';
import { FACTION_FLAGS } from './mapConstants';

interface UnitMarkerProps {
  regionId: string;
  region: Region;
  centroid: [number, number];
  isSelected: boolean;
  isPlayerUnit: boolean;
  onRegionSelect: (regionId: string) => void;
  onUnitSelect: (regionId: string | null) => void;
}

export function UnitMarker({
  regionId,
  region,
  centroid,
  isSelected,
  isPlayerUnit,
  onRegionSelect,
  onUnitSelect,
}: UnitMarkerProps) {
  const flagUrl = FACTION_FLAGS[region.owner];
  
  return (
    <Marker
      longitude={centroid[0]}
      latitude={centroid[1]}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onRegionSelect(regionId);
        if (isPlayerUnit) {
          onUnitSelect(regionId);
        }
      }}
    >
      <div
        className="unit-marker"
        style={{
          backgroundColor: FACTION_COLORS[region.owner],
          border: isSelected ? '2px solid #22d3ee' : '1px solid rgba(0,0,0,0.5)',
          borderRadius: '4px',
          padding: '2px 6px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          boxShadow: isSelected ? '0 0 10px #22d3ee' : '0 2px 4px rgba(0,0,0,0.3)',
          cursor: isPlayerUnit ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
      >
        {flagUrl ? (
          <img
            src={flagUrl}
            alt={region.owner}
            style={{
              width: '16px',
              height: '11px',
              objectFit: 'cover',
              border: '1px solid rgba(0,0,0,0.3)',
            }}
          />
        ) : (
          <span style={{ fontSize: '14px' }}>&#9632;</span>
        )}
        <span
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: region.owner === 'white' ? '#000' : '#fff',
            textShadow: region.owner === 'white' ? 'none' : '1px 1px 1px rgba(0,0,0,0.5)',
          }}
        >
          {region.divisions.length}
        </span>
      </div>
    </Marker>
  );
}

interface MovingUnitMarkerProps {
  id: string;
  movement: Movement;
  longitude: number;
  latitude: number;
}

export function MovingUnitMarker({
  id,
  movement,
  longitude,
  latitude,
}: MovingUnitMarkerProps) {
  const flagUrl = FACTION_FLAGS[movement.owner];
  
  return (
    <Marker
      key={id}
      longitude={longitude}
      latitude={latitude}
      anchor="center"
    >
      <div
        className="moving-unit-marker"
        style={{
          backgroundColor: FACTION_COLORS[movement.owner],
          border: '1px dashed #22d3ee',
          borderRadius: '50%',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          boxShadow: '0 0 8px rgba(34, 211, 238, 0.5)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      >
        {flagUrl ? (
          <img
            src={flagUrl}
            alt={movement.owner}
            style={{
              width: '14px',
              height: '9px',
              objectFit: 'cover',
              border: '1px solid rgba(0,0,0,0.3)',
            }}
          />
        ) : (
          <span style={{ fontSize: '12px' }}>&#9632;</span>
        )}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 'bold',
            color: movement.owner === 'white' ? '#000' : '#fff',
          }}
        >
          {movement.divisions.length}
        </span>
      </div>
    </Marker>
  );
}

interface CombatMarkerProps {
  combat: ActiveCombat;
  centroid: [number, number];
  onSelectCombat: (combatId: string) => void;
}

export function CombatMarker({
  combat,
  centroid,
  onSelectCombat,
}: CombatMarkerProps) {
  const attackerHp = combat.attackerDivisions.reduce((sum, d) => sum + d.hp, 0);
  const defenderHp = combat.defenderDivisions.reduce((sum, d) => sum + d.hp, 0);
  const attackerProgress = Math.min(100, combat.initialAttackerHp > 0 
    ? (attackerHp / combat.initialAttackerHp) * 100 
    : 0);
  const defenderProgress = Math.min(100, combat.initialDefenderHp > 0 
    ? (defenderHp / combat.initialDefenderHp) * 100 
    : 0);

  const attackerColor = FACTION_COLORS[combat.attackerFaction];
  const defenderColor = FACTION_COLORS[combat.defenderFaction];
  const attackerTextColor = combat.attackerFaction === 'white' ? '#000' : '#fff';
  const defenderTextColor = combat.defenderFaction === 'white' ? '#000' : '#fff';

  return (
    <Marker
      longitude={centroid[0]}
      latitude={centroid[1]}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onSelectCombat(combat.id);
      }}
    >
      <div
        className="combat-marker"
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
      >
        {/* Attacker side */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '2px' }}>
          <div style={{
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 6px',
            minWidth: '35px',
            borderRadius: '3px 0 0 3px',
            backgroundColor: attackerColor,
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: attackerTextColor,
            }}>
              {combat.attackerDivisions.length}
            </span>
          </div>
          <div style={{ height: '3px', width: '100%', background: 'rgba(0,0,0,0.5)', borderRadius: '0 0 0 2px', marginTop: '1px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${attackerProgress}%`, background: attackerColor, transition: 'width 0.3s' }}></div>
          </div>
        </div>
        
        {/* Combat icon */}
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle, #4a4a4a 0%, #2a2a2a 100%)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
          border: '2px solid #666',
          zIndex: 10,
        }}>
          <span style={{ fontSize: '10px', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}>&#9876;</span>
        </div>
        
        {/* Defender side */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: '2px' }}>
          <div style={{
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '0 6px',
            minWidth: '35px',
            borderRadius: '0 3px 3px 0',
            backgroundColor: defenderColor,
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: defenderTextColor,
            }}>
              {combat.defenderDivisions.length}
            </span>
          </div>
          <div style={{ height: '3px', width: '100%', background: 'rgba(0,0,0,0.5)', borderRadius: '0 0 2px 0', marginTop: '1px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${defenderProgress}%`, background: defenderColor, transition: 'width 0.3s' }}></div>
          </div>
        </div>
      </div>
    </Marker>
  );
}

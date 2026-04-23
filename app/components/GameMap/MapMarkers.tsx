/* eslint-disable @next/next/no-img-element */
'use client';

import { Marker } from 'react-map-gl/maplibre';
import { Region, Movement, ActiveCombat, DivisionState } from '../../types/game';
import { COUNTRY_COLORS } from '../../utils/mapUtils';
import { COUNTRY_FLAGS } from './mapConstants';
import { getDivisionsInRegion } from '../../domain/game/divisionState';

interface UnitMarkerProps {
  regionId: string;
  region: Region;
  divisions: DivisionState;
  centroid: [number, number];
  isSelected: boolean;
  isPlayerUnit: boolean;
  onRegionSelect: (regionId: string) => void;
  /** Called with (regionId, shiftHeld) so callers can implement multi-select */
  onDivisionSelect: (regionId: string, shiftHeld: boolean) => void;
}

export function UnitMarker({
  regionId,
  region,
  divisions,
  centroid,
  isSelected,
  isPlayerUnit,
  onRegionSelect,
  onDivisionSelect,
}: UnitMarkerProps) {
  const regionDivisions = getDivisionsInRegion(divisions, regionId);
  // Group divisions by owner so the marker reflects who actually controls the units,
  // not just who owns the territory. This is critical for military-access scenarios
  // where Soviet divisions sit in a Ukraine-owned region — they should show the
  // Soviet flag, not the Ukrainian one.
  const ownerCounts = regionDivisions.reduce<Record<string, number>>((acc, d) => {
    acc[d.owner] = (acc[d.owner] ?? 0) + 1;
    return acc;
  }, {});
  const ownerEntries = Object.entries(ownerCounts).sort((a, b) => b[1] - a[1]);
  // Primary display owner: the one with the most divisions (fall back to region owner)
  const primaryOwner = ownerEntries.length > 0 ? ownerEntries[0][0] : region.owner;
  const hasMixedOwners = ownerEntries.length > 1;

  const flagUrl = COUNTRY_FLAGS[primaryOwner as keyof typeof COUNTRY_FLAGS] ?? COUNTRY_FLAGS[region.owner];
  const bgColor = COUNTRY_COLORS[primaryOwner as keyof typeof COUNTRY_COLORS] ?? COUNTRY_COLORS[region.owner];
  const textColor = primaryOwner === 'white' ? '#000' : '#fff';
  const textShadow = primaryOwner === 'white' ? 'none' : '1px 1px 1px rgba(0,0,0,0.5)';
  
  return (
    <Marker
      longitude={centroid[0]}
      latitude={centroid[1]}
      anchor="bottom"
      offset={[0, -4]}
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        if (isPlayerUnit) {
          onDivisionSelect(regionId, e.originalEvent.shiftKey);
        } else {
          onRegionSelect(regionId);
        }
      }}
    >
      <div
        className="unit-marker"
        style={{
          backgroundColor: bgColor,
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
            alt={primaryOwner}
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
            color: textColor,
            textShadow,
          }}
        >
          {hasMixedOwners
            ? ownerEntries.map(([, count], i) => (i === 0 ? count : `+${count}`)).join(' ')
            : regionDivisions.length}
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
  offset: [number, number];
  isSelected: boolean;
  isPlayerUnit: boolean;
  onSelect: (movementId: string) => void;
}

export function MovingUnitMarker({
  id,
  movement,
  longitude,
  latitude,
  offset,
  isSelected,
  isPlayerUnit,
  onSelect,
}: MovingUnitMarkerProps) {
  const flagUrl = COUNTRY_FLAGS[movement.owner];

  return (
    <Marker
      key={id}
      longitude={longitude}
      latitude={latitude}
      offset={offset}
      anchor="center"
      onClick={isPlayerUnit ? (e) => {
        e.originalEvent.stopPropagation();
        onSelect(movement.id);
      } : undefined}
    >
      <div
        className="moving-unit-marker"
        style={{
          backgroundColor: COUNTRY_COLORS[movement.owner],
          border: isSelected ? '2px solid #22d3ee' : '1px solid rgba(0,0,0,0.5)',
          borderRadius: '50%',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          boxShadow: isSelected ? '0 0 12px #22d3ee, 0 0 20px rgba(34, 211, 238, 0.4)' : '0 2px 4px rgba(0,0,0,0.3)',
          animation: 'pulse 1.5s ease-in-out infinite',
          cursor: isPlayerUnit ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
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
          {movement.divisionIds.length}
        </span>
      </div>
    </Marker>
  );
}

interface CombatMarkerProps {
  combat: ActiveCombat;
  centroid: [number, number];
  onSelectCombat: (combatId: string) => void;
  divisions: DivisionState;
}

export function CombatMarker({
  combat,
  centroid,
  onSelectCombat,
  divisions,
}: CombatMarkerProps) {
  const attackerHp = combat.attackerDivisionIds.reduce((sum, id) => sum + (divisions[id]?.hp ?? 0), 0);
  const defenderHp = combat.defenderDivisionIds.reduce((sum, id) => sum + (divisions[id]?.hp ?? 0), 0);
  const attackerProgress = Math.min(100, combat.initialAttackerHp > 0 
    ? (attackerHp / combat.initialAttackerHp) * 100 
    : 0);
  const defenderProgress = Math.min(100, combat.initialDefenderHp > 0 
    ? (defenderHp / combat.initialDefenderHp) * 100 
    : 0);

  const attackerColor = COUNTRY_COLORS[combat.attackerCountry];
  const defenderColor = COUNTRY_COLORS[combat.defenderCountry];
  const attackerTextColor = combat.attackerCountry === 'white' ? '#000' : '#fff';
  const defenderTextColor = combat.defenderCountry === 'white' ? '#000' : '#fff';
  const attackerFlagUrl = COUNTRY_FLAGS[combat.attackerCountry as keyof typeof COUNTRY_FLAGS];
  const defenderFlagUrl = COUNTRY_FLAGS[combat.defenderCountry as keyof typeof COUNTRY_FLAGS];

  return (
    <Marker
      longitude={centroid[0]}
      latitude={centroid[1]}
      anchor="top"
      offset={[0, 4]}
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
            gap: '4px',
            padding: '0 6px',
            minWidth: '35px',
            borderRadius: '3px 0 0 3px',
            backgroundColor: attackerColor,
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}>
            {attackerFlagUrl ? (
              <img
                src={attackerFlagUrl}
                alt={combat.attackerCountry}
                style={{
                  width: '16px',
                  height: '11px',
                  objectFit: 'cover',
                  border: '1px solid rgba(0,0,0,0.3)',
                  flexShrink: 0,
                }}
              />
            ) : (
              <span style={{ fontSize: '10px', color: attackerTextColor }}>&#9632;</span>
            )}
            <span style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: attackerTextColor,
            }}>
              {combat.attackerDivisionIds.length}
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
            gap: '4px',
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
              {combat.defenderDivisionIds.length}
            </span>
            {defenderFlagUrl ? (
              <img
                src={defenderFlagUrl}
                alt={combat.defenderCountry}
                style={{
                  width: '16px',
                  height: '11px',
                  objectFit: 'cover',
                  border: '1px solid rgba(0,0,0,0.3)',
                  flexShrink: 0,
                }}
              />
            ) : (
              <span style={{ fontSize: '10px', color: defenderTextColor }}>&#9632;</span>
            )}
          </div>
          <div style={{ height: '3px', width: '100%', background: 'rgba(0,0,0,0.5)', borderRadius: '0 0 2px 0', marginTop: '1px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${defenderProgress}%`, background: defenderColor, transition: 'width 0.3s' }}></div>
          </div>
        </div>
      </div>
    </Marker>
  );
}

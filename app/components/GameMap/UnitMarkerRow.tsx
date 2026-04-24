/* eslint-disable @next/next/no-img-element */

import type { CountryId } from '../../types/game';
import { COUNTRY_COLORS } from '../../utils/mapUtils';
import { COUNTRY_FLAGS } from './mapConstants';

interface UnitMarkerRowProps {
  owner: CountryId;
  count: number;
  regionId: string;
  regionOwner: CountryId;
  isSelected: boolean;
  index: number;
  totalRows: number;
}

export function UnitMarkerRow({
  owner,
  count,
  regionId,
  regionOwner,
  isSelected,
  index,
  totalRows,
}: UnitMarkerRowProps) {
  const flagUrl = COUNTRY_FLAGS[owner as keyof typeof COUNTRY_FLAGS] ?? COUNTRY_FLAGS[regionOwner];
  const bgColor = COUNTRY_COLORS[owner as keyof typeof COUNTRY_COLORS] ?? COUNTRY_COLORS[regionOwner];
  const textColor = owner === 'white' ? '#000' : '#fff';
  const textShadow = owner === 'white' ? 'none' : '1px 1px 1px rgba(0,0,0,0.5)';

  return (
    <div
      key={`${regionId}-${owner}`}
      data-owner={owner}
      style={{
        backgroundColor: bgColor,
        border: isSelected ? '2px solid #22d3ee' : '1px solid rgba(0,0,0,0.5)',
        borderRadius: '4px',
        padding: '2px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        boxShadow: isSelected ? '0 0 10px #22d3ee' : '0 2px 4px rgba(0,0,0,0.3)',
        marginTop: index === 0 ? 0 : '-4px',
        zIndex: totalRows - index,
      }}
    >
      {flagUrl ? (
        <img
          src={flagUrl}
          alt={owner}
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
        {count}
      </span>
    </div>
  );
}

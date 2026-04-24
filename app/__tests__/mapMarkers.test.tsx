import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { UnitMarker } from '../components/GameMap/MapMarkers';
import type { DivisionState, Region } from '../types/game';

vi.mock('react-map-gl/maplibre', () => ({
  Marker: ({ children }: { children: React.ReactNode }) => children,
}));

describe('UnitMarker', () => {
  const region: Region = {
    id: 'RU-MOW',
    name: 'Moscow',
    countryIso3: 'RUS',
    owner: 'soviet',
  };

  it('renders separate stacked owner markers instead of a +N summary for mixed-country divisions', () => {
    const divisions: DivisionState = {
      soviet1: {
        id: 'soviet1',
        name: '1st Soviet Division',
        owner: 'soviet',
        armyGroupId: 'ag-1',
        hp: 100,
        maxHp: 100,
        attack: 10,
        defence: 10,
        regionId: region.id,
      },
      soviet2: {
        id: 'soviet2',
        name: '2nd Soviet Division',
        owner: 'soviet',
        armyGroupId: 'ag-1',
        hp: 100,
        maxHp: 100,
        attack: 10,
        defence: 10,
        regionId: region.id,
      },
      white1: {
        id: 'white1',
        name: '1st White Division',
        owner: 'white',
        armyGroupId: 'ag-2',
        hp: 100,
        maxHp: 100,
        attack: 10,
        defence: 10,
        regionId: region.id,
      },
    };

    const markup = renderToStaticMarkup(
      <UnitMarker
        regionId={region.id}
        region={region}
        divisions={divisions}
        centroid={[37.6173, 55.7558]}
        isSelected={false}
        isPlayerUnit={true}
        onRegionSelect={() => {}}
        onDivisionSelect={() => {}}
      />,
    );

    expect(markup).toContain('data-owner="soviet"');
    expect(markup).toContain('data-owner="white"');
    expect(markup).toContain('>2<');
    expect(markup).toContain('>1<');
    expect(markup).not.toContain('+1');
  });
});

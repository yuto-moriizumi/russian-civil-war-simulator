import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import MissionNode from '../components/MissionNode';
import { getCountryName } from '../data/countries';
import type { Mission } from '../types/game';

vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: {
    Top: 'top',
    Bottom: 'bottom',
  },
}));

describe('MissionNode', () => {
  it('renders liberate puppet rewards so the reward area is not blank', () => {
    const mission: Mission = {
      id: 'soviet_capture_kharkiv',
      country: 'soviet',
      name: 'ハリコフの占領',
      description: 'ハリコフ（UA-63）を支配下に置け',
      completed: false,
      claimed: false,
      rewards: {
        liberatePuppet: {
          country: 'ukrainesoviet',
          spawnRegionId: 'UA-63',
          divisions: 3,
        },
      },
      prerequisites: ['soviet_mobilize'],
      available: [{ type: 'controlRegion', regionId: 'UA-63' }],
    };

    const markup = renderToStaticMarkup(
      <MissionNode
        {...({
          id: mission.id,
          type: 'missionNode',
          data: {
            mission,
            canClaim: false,
            isUnlocked: true,
            onClaim: () => {},
          },
          selectable: true,
          selected: false,
          draggable: false,
          dragging: false,
          deletable: false,
          zIndex: 0,
          isConnectable: true,
          positionAbsoluteX: 0,
          positionAbsoluteY: 0,
        } as const)}
      />,
    );

    const encodedCountryName = getCountryName('ukrainesoviet').replace("'", '&#x27;');
    expect(markup).toContain(`Puppet: ${encodedCountryName}`);
  });
});

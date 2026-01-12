import Dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';
import { Mission } from '../types/game';

const NODE_WIDTH = 240; // w-60 in tailwind
const NODE_HEIGHT = 280; // approximate card height with requirements

export type MissionNodeData = {
  mission: Mission;
  canClaim: boolean;
  isUnlocked: boolean;
  [key: string]: unknown;
};

export function getLayoutedElements(
  missions: Mission[],
  canClaimMission: (mission: Mission) => boolean,
  isMissionUnlocked: (mission: Mission) => boolean
): { nodes: Node<MissionNodeData>[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: 'TB', // Top to bottom
    nodesep: 80, // Horizontal spacing
    ranksep: 120, // Vertical spacing between rows
    marginx: 50,
    marginy: 50,
  });

  // Add nodes
  missions.forEach((mission) => {
    g.setNode(mission.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  // Add edges from prerequisites
  const edges: Edge[] = [];
  missions.forEach((mission) => {
    mission.prerequisites.forEach((prereqId) => {
      g.setEdge(prereqId, mission.id);

      const prereq = missions.find((m) => m.id === prereqId);
      const isCompleted = prereq?.claimed ?? false;

      edges.push({
        id: `${prereqId}-${mission.id}`,
        source: prereqId,
        target: mission.id,
        type: 'smoothstep',
        style: {
          stroke: isCompleted ? '#22c55e' : '#57534e',
          strokeWidth: 3,
          strokeDasharray: isCompleted ? undefined : '8 4',
        },
      });
    });
  });

  // Run layout
  Dagre.layout(g);

  // Extract positioned nodes
  const nodes: Node<MissionNodeData>[] = missions.map((mission) => {
    const nodeWithPosition = g.node(mission.id);
    return {
      id: mission.id,
      type: 'missionNode',
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
      data: {
        mission,
        canClaim: canClaimMission(mission),
        isUnlocked: isMissionUnlocked(mission),
      },
    };
  });

  return { nodes, edges };
}

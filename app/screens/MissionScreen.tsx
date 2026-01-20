'use client';

import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './MissionScreen.css';

import { useGameStore } from '../store/useGameStore';
import { Mission } from '../types/game';
import {
  getLayoutedElements,
} from '../utils/missionLayout';
import MissionNode from '../components/MissionNode';

const nodeTypes = { missionNode: MissionNode };

export default function MissionScreen() {
  const missions = useGameStore(state => state.missions);
  const navigateToScreen = useGameStore(state => state.navigateToScreen);
  const claimMission = useGameStore(state => state.claimMission);

  const onBack = () => navigateToScreen('main');

  // Check if prerequisites are met for claiming
  const canClaimMission = useCallback((mission: Mission) => {
    if (!mission.completed || mission.claimed) return false;
    return true;
  }, []);

  // Check if mission is unlocked (prerequisites completed)
  const isMissionUnlocked = useCallback(
    (mission: Mission) => {
      return mission.prerequisites.every((prereqId) => {
        const prereq = missions.find((m) => m.id === prereqId);
        return prereq?.claimed;
      });
    },
    [missions]
  );

  // Compute layout with dagre
  const { nodes, edges } = useMemo(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      missions,
      canClaimMission,
      isMissionUnlocked
    );

    // Inject onClaim callback into node data
    const nodesWithCallback = layoutedNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onClaim: claimMission,
      },
    }));

    return { nodes: nodesWithCallback, edges: layoutedEdges };
  }, [missions, canClaimMission, isMissionUnlocked, claimMission]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900">
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between border-b border-stone-700 bg-stone-900/95 px-6 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded bg-stone-700 px-4 py-2 text-stone-300 transition-colors hover:bg-stone-600 hover:text-white"
        >
          <span>&larr;</span>
          <span>Back to Game</span>
        </button>
        <h1 className="text-2xl font-bold tracking-wider text-stone-200">
          MISSION TREE
        </h1>
        <div className="w-32" />
      </div>

      {/* React Flow Container */}
      <div className="h-[calc(100vh-73px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll
          panOnDrag={[1, 2]}
          zoomOnScroll
          minZoom={0.5}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#44403c" gap={20} />
          <Controls
            showInteractive={false}
            className="!bg-stone-800 !border-stone-700 [&>button]:!bg-stone-700 [&>button]:!border-stone-600 [&>button]:!text-stone-300 [&>button:hover]:!bg-stone-600"
          />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 rounded-lg border border-stone-700 bg-stone-900/95 p-4">
        <h3 className="mb-3 text-xs font-bold tracking-wider text-stone-400">
          LEGEND
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-green-600 bg-green-900/50" />
            <span className="text-stone-300">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-amber-500 bg-amber-900/50" />
            <span className="text-stone-300">Ready to Claim</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-stone-500 bg-stone-800/80" />
            <span className="text-stone-300">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-stone-700 bg-stone-900/80 opacity-60" />
            <span className="text-stone-300">Locked</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 right-4 z-20 rounded-lg border border-stone-700 bg-stone-900/95 p-4">
        <div className="text-xs text-stone-400">
          <div>
            Completed: {missions.filter((m) => m.claimed).length} /{' '}
            {missions.length}
          </div>
          <div className="mt-1">
            Ready to claim:{' '}
            {missions.filter((m) => m.completed && !m.claimed).length}
          </div>
        </div>
      </div>
    </div>
  );
}

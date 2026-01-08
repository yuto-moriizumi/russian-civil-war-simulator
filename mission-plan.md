# Mission Tree Rendering Implementation Plan

## Overview

Replace the current manual positioning system with an automatic layout using **React Flow** for rendering and **Dagre** for computing node positions. This eliminates overlap issues and makes adding new missions much simpler.

## Progress

- [x] Research: Check existing package.json and project structure
- [x] Plan: Design the implementation approach
- [x] Install dependencies (@xyflow/react, @dagrejs/dagre)
- [ ] Update Mission type (remove position)
- [ ] Create layout utility with dagre
- [ ] Create MissionNode component
- [ ] Rewrite MissionScreen with React Flow
- [ ] Update mission data (remove positions)
- [ ] Build and verify the new mission tree renders correctly

## Dependencies Installed

```bash
npm install @xyflow/react @dagrejs/dagre
```

- `@xyflow/react` - React Flow v12 (current stable, ~50KB gzipped)
- `@dagrejs/dagre` - Dagre layout algorithm (~40KB gzipped)

## Files to Modify

| File | Change |
|------|--------|
| `app/types/game.ts` | Remove `position` from `Mission` interface |
| `app/data/gameData.ts` | Remove `position` property from all missions |
| `app/screens/MissionScreen.tsx` | Complete rewrite using React Flow |
| `app/utils/missionLayout.ts` | **NEW** - Dagre layout utility |
| `app/components/MissionNode.tsx` | **NEW** - Custom React Flow node component |

## Architecture

```
MissionScreen.tsx
    │
    ├── Convert missions to React Flow nodes/edges
    │
    ├── missionLayout.ts (dagre)
    │       └── Compute x,y positions from prerequisites
    │
    └── React Flow <ReactFlow>
            ├── MissionNode.tsx (custom node)
            └── Default edges with smooth step style
```

---

## Detailed Implementation

### 1. `app/types/game.ts` (line 48)

**Before:**
```typescript
export interface Mission {
  id: string;
  faction: CountryId;
  name: string;
  description: string;
  completed: boolean;
  claimed: boolean;
  rewards: {
    money: number;
    gameVictory?: boolean;
  };
  prerequisites: string[];
  position: { x: number; y: number };  // REMOVE THIS
}
```

**After:**
```typescript
export interface Mission {
  id: string;
  faction: CountryId;
  name: string;
  description: string;
  completed: boolean;
  claimed: boolean;
  rewards: {
    money: number;
    gameVictory?: boolean;
  };
  prerequisites: string[];
  // position removed - computed automatically by dagre
}
```

---

### 2. `app/data/gameData.ts`

Remove all `position` properties from mission definitions. Example:

**Before:**
```typescript
{
  id: 'soviet_mobilize',
  faction: 'soviet',
  name: 'Workers Unite!',
  description: 'Recruit your first Red Army units...',
  completed: false,
  claimed: false,
  rewards: { money: 100 },
  prerequisites: [],
  position: { x: 50, y: 20 },  // REMOVE
},
```

**After:**
```typescript
{
  id: 'soviet_mobilize',
  faction: 'soviet',
  name: 'Workers Unite!',
  description: 'Recruit your first Red Army units...',
  completed: false,
  claimed: false,
  rewards: { money: 100 },
  prerequisites: [],
},
```

---

### 3. NEW: `app/utils/missionLayout.ts`

Create a utility that:
1. Takes an array of missions
2. Creates a dagre graph from prerequisites
3. Runs layout algorithm
4. Returns React Flow nodes and edges with computed positions

```typescript
import Dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';
import { Mission } from '../types/game';

const NODE_WIDTH = 240;  // w-60 in tailwind
const NODE_HEIGHT = 160; // approximate card height

export interface MissionNodeData {
  mission: Mission;
  canClaim: boolean;
  isUnlocked: boolean;
}

export function getLayoutedElements(
  missions: Mission[],
  canClaimMission: (mission: Mission) => boolean,
  isMissionUnlocked: (mission: Mission) => boolean
): { nodes: Node<MissionNodeData>[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  
  g.setGraph({ 
    rankdir: 'TB',      // Top to bottom
    nodesep: 80,        // Horizontal spacing
    ranksep: 100,       // Vertical spacing between rows
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
      
      const prereq = missions.find(m => m.id === prereqId);
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
```

---

### 4. NEW: `app/components/MissionNode.tsx`

Custom React Flow node that renders the mission card:

```typescript
'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { MissionNodeData } from '../utils/missionLayout';

interface MissionNodeComponentProps extends NodeProps {
  data: MissionNodeData & { onClaim: (id: string) => void };
}

function MissionNode({ data }: MissionNodeComponentProps) {
  const { mission, canClaim, isUnlocked, onClaim } = data;
  
  return (
    <>
      {/* Target handle (top) - only show if has prerequisites */}
      {mission.prerequisites.length > 0 && (
        <Handle 
          type="target" 
          position={Position.Top} 
          className="!bg-stone-600 !w-3 !h-3" 
        />
      )}
      
      <div
        className={`
          w-60 rounded-lg border-2 p-4 text-left transition-all duration-300
          ${mission.claimed 
            ? 'border-green-600 bg-green-900/50' 
            : canClaim
            ? 'border-amber-500 bg-amber-900/50'
            : isUnlocked
            ? 'border-stone-500 bg-stone-800/80'
            : 'border-stone-700 bg-stone-900/80 opacity-60'
          }
        `}
      >
        {/* Status indicator */}
        <div className={`
          absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs
          ${mission.claimed 
            ? 'bg-green-600 text-white' 
            : canClaim 
            ? 'bg-amber-500 text-black animate-pulse'
            : isUnlocked
            ? 'bg-stone-600 text-stone-300'
            : 'bg-stone-800 text-stone-500'
          }
        `}>
          {mission.claimed ? '✓' : canClaim ? '!' : isUnlocked ? '○' : '🔒'}
        </div>

        {/* Mission content */}
        <h3 className={`font-bold ${mission.claimed ? 'text-green-300' : 'text-white'}`}>
          {mission.name}
        </h3>
        <p className="mt-1 text-xs text-stone-400 line-clamp-2">
          {mission.description}
        </p>
        
        {/* Reward */}
        <div className={`mt-3 flex items-center justify-between rounded px-2 py-1 text-xs ${
          mission.claimed ? 'bg-green-900/50' : 'bg-stone-900/50'
        }`}>
          <span className="text-stone-400">Reward:</span>
          <span className={mission.claimed ? 'text-green-400 line-through' : 'text-amber-400'}>
            ${mission.rewards.money}
          </span>
        </div>

        {/* Claim button */}
        {canClaim && (
          <button
            onClick={() => onClaim(mission.id)}
            className="mt-3 w-full rounded bg-amber-600 py-2 text-center text-sm font-bold text-white transition-colors hover:bg-amber-500"
          >
            CLAIM REWARD
          </button>
        )}
      </div>
      
      {/* Source handle (bottom) */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!bg-stone-600 !w-3 !h-3" 
      />
    </>
  );
}

export default memo(MissionNode);
```

---

### 5. `app/screens/MissionScreen.tsx` (Complete Rewrite)

```typescript
'use client';

import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Mission } from '../types/game';
import { getLayoutedElements, type MissionNodeData } from '../utils/missionLayout';
import MissionNode from '../components/MissionNode';

interface MissionScreenProps {
  missions: Mission[];
  onBack: () => void;
  onClaimMission: (missionId: string) => void;
}

const nodeTypes = { missionNode: MissionNode };

export default function MissionScreen({ 
  missions, 
  onBack, 
  onClaimMission 
}: MissionScreenProps) {
  
  // Check if prerequisites are met for claiming
  const canClaimMission = useCallback((mission: Mission) => {
    if (!mission.completed || mission.claimed) return false;
    return true;
  }, []);

  // Check if mission is unlocked (prerequisites completed)
  const isMissionUnlocked = useCallback((mission: Mission) => {
    return mission.prerequisites.every(prereqId => {
      const prereq = missions.find(m => m.id === prereqId);
      return prereq?.claimed;
    });
  }, [missions]);

  // Compute layout with dagre
  const { nodes, edges } = useMemo(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      missions,
      canClaimMission,
      isMissionUnlocked
    );
    
    // Inject onClaim callback into node data
    const nodesWithCallback: Node<MissionNodeData & { onClaim: (id: string) => void }>[] = 
      layoutedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onClaim: onClaimMission,
        },
      }));
    
    return { nodes: nodesWithCallback, edges: layoutedEdges };
  }, [missions, canClaimMission, isMissionUnlocked, onClaimMission]);

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
        <h1 className="text-2xl font-bold tracking-wider text-stone-200">MISSION TREE</h1>
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
        <h3 className="mb-3 text-xs font-bold tracking-wider text-stone-400">LEGEND</h3>
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
          <div>Completed: {missions.filter(m => m.claimed).length} / {missions.length}</div>
          <div className="mt-1">Ready to claim: {missions.filter(m => m.completed && !m.claimed).length}</div>
        </div>
      </div>
    </div>
  );
}
```

---

## Dagre Configuration Options

Key settings in `g.setGraph()`:

| Option | Value | Description |
|--------|-------|-------------|
| `rankdir` | `'TB'` | Top-to-bottom layout (default) |
| `nodesep` | `80` | Horizontal spacing between nodes in same row |
| `ranksep` | `100` | Vertical spacing between rows |
| `align` | `'UL'` | Node alignment (upper-left, etc.) |

These can be adjusted if the layout needs tweaking.

---

## Visual Improvements from React Flow

With React Flow, you get:
- **Pan & zoom** - Navigate large trees easily
- **Fit view** - Automatically centers and scales to show all missions
- **Smooth step edges** - Clean orthogonal lines between nodes
- **Controls** - Zoom in/out/fit buttons
- **Better edge routing** - No overlapping lines

---

## Worktree Information

- **Branch**: `task/implement-new-mission-rendering-system`
- **Worktree path**: `.worktrees/implement-new-mission-rendering-system`
- **Base branch**: `main`

To continue working:
```bash
cd .worktrees/implement-new-mission-rendering-system
```

Or in the main repo:
```bash
git worktree list
```

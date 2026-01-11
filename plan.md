# Army Groups Feature - Implementation Plan

## Overview

Add an **Army Groups** system that allows players to:
1. Select multiple regions and group them into named "Army Groups"
2. Issue a single "Advance" command that moves all units in the group toward enemy territory
3. Manage groups via a collapsible bottom panel

## Problem Statement

With 199 regions in the game, moving units individually is extremely tedious. Players must:
- Click each region to select units
- Right-click to move to an adjacent region
- Repeat for every unit stack

This feature enables bulk operations to dramatically reduce clicks for large-scale operations.

---

## New Types (`app/types/game.ts`)

```typescript
// Army Group for coordinated unit movement
export interface ArmyGroup {
  id: string;
  name: string;                    // e.g., "Northern Front"
  regionIds: string[];             // Regions assigned to this group
  color: string;                   // Visual identifier (#hex)
  owner: FactionId;
}

// Add to GameState:
armyGroups: ArmyGroup[];
```

---

## State Changes (`app/store/useGameStore.ts`)

### New State
| State | Type | Description |
|-------|------|-------------|
| `armyGroups` | `ArmyGroup[]` | List of player's army groups |
| `selectedGroupId` | `string \| null` | Currently selected group for editing |
| `multiSelectedRegions` | `string[]` | Regions selected for grouping (Shift+click) |

### New Actions
| Action | Description |
|--------|-------------|
| `createArmyGroup(name: string, regionIds: string[])` | Create a new group |
| `deleteArmyGroup(groupId: string)` | Delete a group |
| `renameArmyGroup(groupId: string, name: string)` | Rename a group |
| `addRegionsToGroup(groupId: string, regionIds: string[])` | Add regions to existing group |
| `removeRegionFromGroup(groupId: string, regionId: string)` | Remove region from group |
| `toggleMultiSelectRegion(regionId: string)` | Toggle region in multi-selection |
| `clearMultiSelection()` | Clear multi-selection |
| `advanceArmyGroup(groupId: string)` | Execute "Advance" order |

---

## New Utility: Pathfinding (`app/utils/pathfinding.ts`)

```typescript
// Find nearest enemy region from a given region
export function findNearestEnemyRegion(
  regionId: string,
  regions: RegionState,
  adjacency: Adjacency,
  playerFaction: FactionId
): string | null;

// Find the best adjacent region to move toward a target
export function getNextStepToward(
  fromRegionId: string,
  targetRegionId: string,
  adjacency: Adjacency
): string | null;
```

Uses BFS (Breadth-First Search) to find shortest path through the adjacency graph.

---

## New Component: Army Groups Panel (`app/components/ArmyGroupsPanel.tsx`)

**Location:** Bottom of screen, above the existing status bar  
**Collapsible:** Yes, with a toggle button

### UI Elements
- **Header:** "ARMY GROUPS" with expand/collapse toggle
- **Group List:** Horizontal scrollable list of groups
  - Each group shows: name, region count, unit count, color indicator
  - Click to select/edit
  - "Advance" button per group
  - Delete button (X)
- **Create Section:** When regions are multi-selected
  - Input field for group name
  - "Create Group" button
- **Multi-Select Indicator:** Shows count of selected regions

---

## Map Changes (`app/components/GameMap.tsx`)

1. **Multi-selection support:**
   - Shift+click adds/removes regions from `multiSelectedRegions`
   - Visual highlight for multi-selected regions (dashed border)

2. **Army Group visualization:**
   - Regions in same group get colored border matching group color

3. **New props:**
   - `multiSelectedRegions: string[]`
   - `armyGroups: ArmyGroup[]`
   - `onToggleMultiSelect: (regionId: string) => void`

---

## MainScreen Changes (`app/screens/MainScreen.tsx`)

1. Add `ArmyGroupsPanel` component above the bottom status bar
2. Pass new props for army group management
3. Adjust layout to accommodate the new panel

---

## "Advance" Logic

When `advanceArmyGroup(groupId)` is called:

```typescript
for each regionId in group.regionIds:
  const region = regions[regionId]
  if (region.divisions.length === 0) continue
  
  const nearestEnemy = findNearestEnemyRegion(regionId, regions, adjacency, playerFaction)
  if (!nearestEnemy) continue
  
  const nextStep = getNextStepToward(regionId, nearestEnemy, adjacency)
  if (!nextStep) continue
  
  // Move all units from this region toward enemy
  moveUnits(regionId, nextStep, region.divisions.length)
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/types/game.ts` | Modify | Add `ArmyGroup` interface, update `GameState` |
| `app/store/useGameStore.ts` | Modify | Add army group state and actions |
| `app/utils/pathfinding.ts` | Create | BFS pathfinding utilities |
| `app/components/ArmyGroupsPanel.tsx` | Create | New bottom panel component |
| `app/components/GameMap.tsx` | Modify | Multi-select support, group visualization |
| `app/screens/MainScreen.tsx` | Modify | Integrate ArmyGroupsPanel |

---

## User Preferences (from discussion)

- **Orders supported:** Advance toward enemy only (for MVP)
- **Assignment method:** Click regions + hotkey to assign
- **UI location:** Bottom of screen
- **Group limit:** Unlimited

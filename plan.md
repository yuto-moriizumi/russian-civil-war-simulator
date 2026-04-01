# HOI4-Like Frontline Movement AI

## Background

Hearts of Iron 4 organises division movement through **Battle Plans**. Each army
has:

1. A **frontline** — friendly provinces directly bordering the enemy that the
   army is responsible for.
2. An **offensive line** — the enemy provinces the army intends to capture.

Every division is assigned one frontline slot. Divisions behind the front
automatically march toward empty or under-staffed frontline slots. Only once
every slot is filled do surplus divisions push into assigned enemy targets.

---

## Problem with the Current Code

`armyGroupAdvance.ts` uses `findAllAdvanceTargets()` which fans **one division
per adjacent enemy province** from each source region independently:

- A region with 5 divisions but 2 adjacent enemies sends 2 forward, leaving 3
  idle (or routing them to the nearest ongoing combat by raw distance).
- Rear divisions (not adjacent to any enemy) never move; they have no frontline
  slot to fill.
- There is no concept of a shared frontline — each source region acts
  independently without awareness of what other regions are doing.

---

## Proposed Solution

### New data structures (computed transiently, never stored)

```
Frontline = {
  frontlineRegions: Set<regionId>   // friendly regions adjacent to ≥1 accessible enemy
  targetRegions:    Set<regionId>   // enemy regions adjacent to ≥1 frontline region
}

FrontlineAssignment = {
  divisionId: string
  fromRegion: string
  toRegion:   string   // next step on BFS path to destination
  isFrontlineMove: boolean   // true = filling a frontline slot, false = attacking a target
}
```

### New functions added to `app/utils/pathfinding.ts`

#### `computeFrontline(groupId, regions, adjacency, countryId, canEnter)`

Scans all regions that contain at least one division belonging to `groupId`.
For each such region and its adjacency list:

- If an adjacent region is enemy/foreign and accessible → add source to
  `frontlineRegions`, add neighbor to `targetRegions`.

Returns `{ frontlineRegions, targetRegions }`.

#### `assignDivisionsToFrontline(groupId, regions, adjacency, countryId, frontline, movingUnits, canEnter)`

Returns a list of `FrontlineAssignment[]`.

**Algorithm (in priority order):**

1. **Tally existing coverage**: For each frontline region, count how many of the
   group's divisions are already stationed there (these divisions are satisfied
   — they don't need to move).

2. **Identify gaps**: Frontline regions with 0 group divisions are "empty slots".
   Collect them sorted by fewest neighbours (chokepoints first — random for now).

3. **Pull rear divisions forward**: Collect all group divisions that are NOT
   already in a frontline region. For each division (sorted by BFS distance to
   nearest empty slot ascending):
   - Find the nearest empty frontline slot via BFS through own/accessible
     territory.
   - Emit an assignment: `fromRegion → nextStepToward(slot)`.
   - Mark that slot as now having +1 division (so it won't attract another).

4. **Push surplus into targets**: After every frontline slot has ≥1 division,
   collect still-unassigned surplus divisions in frontline regions. For each
   surplus division, pick a random target region adjacent to its current region
   and emit `fromRegion → targetRegion` (direct adjacent step — no BFS needed).

5. **Skip already-moving sources**: If any group division is already in transit
   from a region, skip that region entirely (same guard as the current code).

### Rewritten `app/store/game/armyGroupAdvance.ts`

Replaces the current per-region fan-out loop with:

```
1. canEnter = buildCanEnterPredicate(...)
2. frontline = computeFrontline(groupId, regions, adjacency, countryId, canEnter)
3. assignments = assignDivisionsToFrontline(...)
4. For each assignment:
     a. Resolve next-hop (already embedded in assignment.toRegion)
     b. Determine hostility of toRegion (same logic as current)
     c. Create/reuse ActiveCombat if hostile
     d. Create Movement, remove division from source region
5. setState(...)
```

The output shape is identical to today (`Movement[]`, updated `regions`,
`ActiveCombat[]`, `gameEvents`) so nothing downstream changes.

---

## Files Changed

| File | Change |
|------|--------|
| `app/utils/pathfinding.ts` | Add `computeFrontline()`, `assignDivisionsToFrontline()` |
| `app/store/game/armyGroupAdvance.ts` | Replace fan-out loop with frontline assignment loop |
| `app/__tests__/movement.test.ts` | Tests for new pathfinding utilities |

No changes to: `cpuPlayer.ts`, `armyGroupDefend.ts`, `tickActions.ts`, types,
or any UI component.

---

## Behavioural Differences

| Scenario | Before | After |
|---|---|---|
| Rear divisions (not at front) | Idle | March toward nearest empty frontline slot |
| Frontline region with 3 divs, 1 enemy neighbour | Sends 1 div, 2 stay | 1 covers frontline, 2 are surplus → push into target |
| Multiple frontline regions competing for same rear div | Random / undefined | Nearest empty slot wins (BFS distance) |
| Reinforcing an ongoing combat | Route to nearest combat by centroid distance | Route to the frontline slot adjacent to that combat |
| Fan-out vs concentration | Always fan out 1-per-enemy-neighbor | Fill slots first, then fan out |

---

## Out of Scope (future work)

- Province value / priority scoring (capitals, chokepoints)
- Attack delay / planning bonus
- Fallback / retreat lines
- Supply / overextension limits

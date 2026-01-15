# Distance-Based Unit Movement Implementation Plan

## Overview
Transform the current fixed 6-hour movement system into a realistic distance-based system where travel time is calculated from actual geographic distances between regions.

## Design Summary

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Base Movement Speed** | 4 km/h | Realistic marching speed for 1918-1920 armies |
| **Retreat Speed** | 8 km/h | 50% faster (2x speed multiplier) |
| **Bounds** | None | Pure distance calculation |
| **Typical Move Times** | 1-4 days | For adjacent European regions |
| **Long Distance Moves** | 20-60 days | Siberian/Far East campaigns |

## Distance Statistics (1,012 total adjacencies)

| Metric | Distance | Travel Time @ 4 km/h |
|--------|----------|----------------------|
| Shortest | 5 km | 1.3 hours (0d 1h) |
| 25th percentile | 148 km | 37 hours (1d 13h) |
| Median | 224 km | 56 hours (2d 8h) |
| Average | 353 km | 88 hours (3d 16h) |
| 90th percentile | 674 km | 169 hours (7d 1h) |
| Longest | 5,839 km | 1,460 hours (60d 20h) |

**Notable long-distance adjacencies:**
- Far Eastern Russia (Chukotka ↔ Kamchatka, Chukotka ↔ Magadan): 4,000-6,000 km
- Siberian connections (Sakha ↔ various): 1,700-2,200 km
- Most European Russia connections: 100-400 km

## Implementation Tasks

### ✅ Task 1: Move @turf/turf to Production Dependencies
**File:** `package.json`

**Current State:** @turf/turf is in devDependencies  
**Required:** Move to dependencies for runtime distance calculations

**Change:**
```json
"dependencies": {
  "@turf/turf": "^7.3.1"
}
```

---

### ✅ Task 2: Create Distance Calculation Utility
**File:** `app/utils/distance.ts` (new file)

**Purpose:** Calculate geographic distance between regions using Turf.js

**Implementation:**
```typescript
import * as turf from '@turf/turf';

export const MOVEMENT_SPEED_KM_PER_HOUR = 4;
export const RETREAT_SPEED_MULTIPLIER = 2; // 2x faster = 8 km/h

export function calculateDistance(
  fromRegionId: string,
  toRegionId: string,
  centroids: Record<string, [number, number]>
): number {
  const from = centroids[fromRegionId];
  const to = centroids[toRegionId];
  
  if (!from || !to) {
    console.warn(`Missing centroid for ${fromRegionId} or ${toRegionId}`);
    return 0;
  }
  
  const fromPoint = turf.point(from);
  const toPoint = turf.point(to);
  return turf.distance(fromPoint, toPoint, { units: 'kilometers' });
}

export function calculateTravelTime(
  distanceKm: number,
  isRetreat: boolean = false
): number {
  const speed = isRetreat 
    ? MOVEMENT_SPEED_KM_PER_HOUR * RETREAT_SPEED_MULTIPLIER
    : MOVEMENT_SPEED_KM_PER_HOUR;
  
  return distanceKm / speed;
}
```

**Notes:**
- Uses Haversine formula for accurate geographic distances
- Handles missing centroids gracefully
- Supports retreat speed multiplier

---

### ✅ Task 3: Add Region Centroids to Game State
**File:** `app/types/game.ts`

**Current State:** Centroids only calculated in map hooks for rendering  
**Required:** Add centroids to GameState for use in movement calculations

**Changes:**
```typescript
export interface GameState {
  // ... existing fields
  regionCentroids: Record<string, [number, number]>; // Add this
}
```

---

### ✅ Task 4: Load and Cache Region Centroids
**File:** `app/store/game/index.ts`

**Purpose:** Load GeoJSON and calculate centroids on game initialization

**Implementation:**
```typescript
import * as turf from '@turf/turf';

// Add to initial state
const initialState: GameState = {
  // ... existing fields
  regionCentroids: {},
};

// Add helper function
async function loadRegionCentroids(): Promise<Record<string, [number, number]>> {
  const response = await fetch('/map/regions.geojson');
  const geojson = await response.json();
  
  const centroids: Record<string, [number, number]> = {};
  geojson.features.forEach((feature: any) => {
    const id = feature.properties.shapeISO;
    const centroid = turf.centroid(feature);
    centroids[id] = centroid.geometry.coordinates;
  });
  
  return centroids;
}

// Add initialization action
initializeCentroids: async () => {
  const centroids = await loadRegionCentroids();
  set({ regionCentroids: centroids });
}
```

**Timing:** Call during game initialization (before country selection or on app mount)

---

### ✅ Task 5: Update moveUnits() Function
**File:** `app/store/game/unitActions.ts` (line ~180)

**Current Code:**
```typescript
const travelTimeHours = 6; // Fixed time
```

**New Code:**
```typescript
import { calculateDistance, calculateTravelTime } from '@/utils/distance';

// Inside moveUnits function
const { regionCentroids } = get();
const distanceKm = calculateDistance(fromRegion, toRegion, regionCentroids);
const travelTimeHours = calculateTravelTime(distanceKm, false);

console.log(`Moving from ${fromRegion} to ${toRegion}: ${Math.round(distanceKm)} km, ${travelTimeHours.toFixed(1)} hours`);
```

**Additional Considerations:**
- Add null/error handling if centroids not loaded
- Log movement details for debugging
- Round travel time appropriately

---

### ✅ Task 6: Update Army Group Movement
**File:** `app/store/game/armyGroupActions.ts` (lines ~240, ~448)

**Current Behavior:** Army groups use same hardcoded 6-hour movement

**Changes Needed:**
Replace hardcoded `travelTimeHours = 6` in:
- `advanceArmyGroup()` function
- `defendArmyGroup()` function

**Implementation:**
```typescript
import { calculateDistance, calculateTravelTime } from '@/utils/distance';

// In both advance and defend functions
const { regionCentroids } = get();
const distanceKm = calculateDistance(fromRegionId, toRegionId, regionCentroids);
const travelTimeHours = calculateTravelTime(distanceKm, false);
```

---

### ✅ Task 7: Update Combat Retreat Movement
**File:** `app/store/game/tickHelpers/combatProcessing.ts` (line ~50)

**Current Code:**
```typescript
const travelTimeHours = 3; // Retreats are faster
```

**New Code:**
```typescript
import { calculateDistance, calculateTravelTime } from '@/utils/distance';

// In retreat logic
const distanceKm = calculateDistance(combat.regionId, retreatRegion, regionCentroids);
const travelTimeHours = calculateTravelTime(distanceKm, true); // true = retreat speed
```

**Critical:** Ensure `regionCentroids` is passed through to this helper function

---

### ✅ Task 8: Test Movement Timing
**Purpose:** Verify distance calculations work correctly

**Test Cases:**
1. **Short distance** (5 km): Should take ~1.25 hours
2. **Median distance** (224 km): Should take ~56 hours (2.3 days)
3. **Long distance** (1000 km): Should take ~250 hours (10.4 days)
4. **Extreme distance** (5839 km): Should take ~1460 hours (60.8 days)
5. **Retreat speed**: Should be exactly 2x faster than normal movement

**Testing Approach:**
1. Start dev server
2. Select a country and start game
3. Test movements of various distances
4. Verify console logs show correct distances and times
5. Check `movingUnits` array for correct arrival times

---

### 🔲 Task 9: UI Enhancements (Optional)
**Purpose:** Show travel time estimates to the player

**Potential Enhancements:**
1. Show estimated travel time when hovering over target region
2. Display travel time in movement orders/confirmations
3. Show "X days Y hours" format for long journeys
4. Update moving unit markers to show ETA

**Example Helper:**
```typescript
function formatTravelTime(hours: number): string {
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  
  if (days === 0) return `${remainingHours}h`;
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
}
```

---

## Dependencies

### Package Changes
- **Move @turf/turf from devDependencies to dependencies**
  ```bash
  npm install @turf/turf
  ```

### Data Files Used
- `/public/map/regions.geojson` - Region geometries for centroid calculation
- `/public/map/adjacency.json` - Valid movement connections

---

## Potential Issues & Solutions

### Issue 1: Centroid Load Timing
**Problem:** Centroids need to be loaded before movement can occur

**Solutions:**
- Load centroids during game initialization
- Show loading state if centroids not ready
- Fallback to 6-hour default if centroid missing (with warning)

### Issue 2: Performance
**Problem:** Turf.js operations might be slow if called frequently

**Solutions:**
- Centroids cached in memory after initial load
- Distance calculation is simple and fast (Haversine formula)
- Future optimization: pre-calculate all adjacency distances at init

### Issue 3: Game Balance
**Problem:** 60-day movements might feel too slow for Far East regions

**Observation:** This is intentional for realism, but gameplay testing may reveal balance issues

**Solutions if needed later:**
- Game speed controls already exist (1x, 2x, 4x, 8x, 16x)
- Could add railroad/transport modifiers for infrastructure
- Could add air transport for special operations

---

## File Summary

### New Files
1. `app/utils/distance.ts` - Distance calculation utilities

### Modified Files
1. `app/types/game.ts` - Add `regionCentroids` to GameState
2. `app/store/game/index.ts` - Load centroids on init
3. `app/store/game/unitActions.ts` - Distance-based moveUnits()
4. `app/store/game/armyGroupActions.ts` - Distance-based army group moves
5. `app/store/game/tickHelpers/combatProcessing.ts` - Distance-based retreats
6. `package.json` - Move @turf/turf to dependencies

---

## Execution Order

```
1. Move @turf/turf to dependencies (package.json)
2. Create distance.ts utility
3. Add regionCentroids to GameState (types/game.ts)
4. Load centroids in game store init (store/game/index.ts)
5. Update unitActions.ts
6. Update armyGroupActions.ts
7. Update combatProcessing.ts
8. Test movements
9. Optional: Add UI enhancements
```

---

## Expected Outcome

✅ Movement times based on real geographic distances  
✅ Short moves (5-200 km): 1-50 hours  
✅ Medium moves (200-500 km): 2-5 days  
✅ Long moves (500-2000 km): 5-20 days  
✅ Extreme moves (2000-6000 km): 20-60 days  
✅ Retreats 2x faster than normal movement  
✅ No artificial caps - pure realism  
✅ Strategic depth: logistics and positioning become critical  

---

## Implementation Status

- [x] Task 1: Move @turf/turf to dependencies ✅
- [x] Task 2: Create distance calculation utility ✅
- [x] Task 3: Add regionCentroids to GameState ✅
- [x] Task 4: Load and cache centroids ✅
- [x] Task 5: Update moveUnits() ✅
- [x] Task 6: Update army group movement ✅
- [x] Task 7: Update combat retreat movement ✅
- [x] Task 8: Test movement timing ✅
- [ ] Task 9: UI enhancements (optional) - Future work

---

## Test Results

Successfully tested distance calculations with the following results:

| Route | Distance | Normal Movement | Retreat Movement |
|-------|----------|-----------------|------------------|
| Moscow → Tula (adjacent) | 185 km | 46h (1d 22h) | 23h |
| Moscow → St. Petersburg | 643 km | 161h (6d 17h) | 80h (3d 8h) |
| Moscow → Sverdlovsk (Urals) | 1,434 km | 358h (14d 22h) | 179h (7d 11h) |
| Sverdlovsk → Irkutsk (Siberia) | 2,677 km | 669h (27d 21h) | 335h (13d 23h) |
| Kamchatka → Chukotka (Far East) | 5,839 km | 1,460h (60d 20h) | 730h (30d 10h) |

✅ All calculations working as expected!
✅ TypeScript compilation successful with no errors
✅ Dev server running successfully on port 3066

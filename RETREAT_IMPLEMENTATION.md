# Division Retreat Implementation

## Overview
When a division's HP reaches 0 during combat, instead of being destroyed immediately, it will attempt to retreat to a random friendly adjacent region. If no friendly adjacent region exists, the division is destroyed.

## Changes Made

### 1. `app/utils/combat.ts`

#### New Type: `DamageResult`
```typescript
export type DamageResult = 
  | { type: 'survived'; division: Division }
  | { type: 'retreating'; division: Division };
```

#### Modified: `applyDamage()`
- Now returns `DamageResult` instead of `Division | null`
- When HP <= 0, marks division as 'retreating' instead of returning null
- When HP > 0, marks division as 'survived'

#### New Function: `findRetreatDestination()`
```typescript
function findRetreatDestination(
  combatRegionId: string,
  divisionOwner: FactionId,
  regions: RegionState,
  adjacency: Adjacency
): string | null
```
- Finds friendly adjacent regions for retreat
- Returns random friendly neighbor or null if none exist

#### Modified: `processCombatRound()`
- Now accepts `regions` and `adjacency` parameters
- Returns both the updated combat and retreating divisions
- Processes damage results and determines retreat destinations
- Logs retreat and destruction events

#### Modified: `resolveCombat()`
- Updated to use new `DamageResult` type
- Note: Instant combat resolution doesn't support retreats (only active combats do)

### 2. `app/store/game/tickHelpers/combatProcessing.ts`

#### Modified: `processCombats()`
- Now accepts `regions` and `adjacency` parameters
- Returns `retreatingDivisions` in the result
- Passes region data to `processCombatRound()`

### 3. `app/store/game/tickActions.ts`

#### Modified: `tick()`
- Extracts `adjacency` from game state
- Passes `regions` and `adjacency` to `processCombats()`
- Handles retreating divisions by adding them to destination regions
- Step 6b: Applies retreating divisions after finished combats

## Behavior

### When Division HP Reaches 0:
1. **Check Adjacent Regions**: System looks for adjacent regions using adjacency data
2. **Filter Friendly Regions**: Only regions owned by the same faction are considered
3. **Random Selection**: If friendly neighbors exist, picks one at random
4. **Retreat or Destroy**:
   - If friendly neighbor exists: Division retreats there with 0 HP
   - If no friendly neighbor: Division is destroyed

### Console Logging:
- `[RETREAT]`: When a division successfully retreats
- `[DESTROYED]`: When a division is destroyed (no retreat available)
- Both logs include division name, faction, and region names

## Testing Recommendations

To test the retreat mechanic:

1. **Setup**: Start a game and create a combat scenario where:
   - Division will take lethal damage
   - Combat region has at least one friendly adjacent region

2. **Observe**: Check browser console for:
   - `[RETREAT]` messages showing successful retreats
   - `[DESTROYED]` messages when no retreat is available
   - `[COMBAT PROGRESS]` messages showing retreat counts

3. **Verify**: After combat:
   - Check that retreated divisions appear in adjacent friendly regions
   - Verify divisions without friendly neighbors are removed

## Edge Cases Handled

1. ✅ No adjacent regions (isolated region) → Division destroyed
2. ✅ Only enemy-controlled adjacent regions → Division destroyed
3. ✅ Multiple friendly adjacent regions → Random selection
4. ✅ Division retreats with 0 HP (can regenerate later if stationary)

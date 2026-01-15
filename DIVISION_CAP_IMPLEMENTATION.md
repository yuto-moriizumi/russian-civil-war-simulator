# Division Cap System Implementation

## Summary

Successfully implemented a division cap system for the Russian Civil War Simulator. The maximum number of divisions a country can own is now limited by the number of states they control.

## Formula

**Division Cap = Controlled States × 1 (base cap per state)**

**Each unit consumes 2 division cap**

For example:
- 5 states controlled = 5 division cap = 2 units max (2.5 units, rounded down)
- 10 states controlled = 10 division cap = 5 units max
- 20 states controlled = 20 division cap = 10 units max

**Note**: Major cities provide additional division cap bonuses (e.g., Moscow provides +2 bonus cap)

## Changes Made

### 1. Core Logic (`app/utils/divisionCap.ts`)

Created a new utility module with the following functions:

- `calculateDivisionCap()` - Calculates max division cap based on controlled states
- `countCurrentDivisions()` - Counts division cap consumed by units in regions and in transit (each unit consumes 2 cap)
- `countDivisionsInProduction()` - Counts division cap consumed by units in production queue (each unit consumes 2 cap)
- `canProduceDivision()` - Checks if a faction can produce more divisions
- `getDivisionCapInfo()` - Returns detailed cap information for UI display

### 2. Production System Updates

**Player Production (`app/store/game/productionActions.ts`)**
- Added division cap check before allowing production
- Shows warning message when cap is reached with detailed info

**AI Production (`app/ai/cpuPlayer.ts`)**
- Added division cap check for AI factions
- AI will stop producing when at cap
- Logs cap info for debugging

**Tick Processing (`app/store/game/tickActions.ts`)**
- Updated to pass productionQueues to AI tick function

### 3. UI Enhancements

**Treasury Button (`app/components/TreasuryButton.tsx`)**
- Added division cap section to treasury details tooltip
- Shows: Active Divisions (current/cap)
- Shows: In Production count
- Shows: States Controlled with cap calculation

**Top Bar (`app/components/TopBar.tsx`)**
- Updated to accept and pass division cap info
- Displays cap info in treasury button dropdown

**Theater Panel (`app/components/TheaterPanel.tsx`)**
- Deploy button now disabled when at cap
- Button text changes to "CAP REACHED" when at limit
- Tooltip shows helpful message about capturing more states

**Main Screen (`app/screens/MainScreen.tsx`)**
- Calculates division cap info using `getDivisionCapInfo()`
- Passes cap data to TopBar component

## Configuration

The cap values are configurable in `app/utils/divisionCap.ts`:

```typescript
export const DIVISIONS_PER_STATE = 1;  // Cap provided per state controlled
export const DIVISION_CAP_PER_UNIT = 2; // Cap consumed by each unit
```

Change these values to adjust the cap formula and unit cost.

## Testing

- ✓ Build succeeds with no TypeScript errors
- ✓ All components properly receive and display cap info
- ✓ Production is blocked when at cap (player & AI)
- ✓ UI shows appropriate feedback

## Files Modified

1. `app/utils/divisionCap.ts` (NEW)
2. `app/store/game/productionActions.ts`
3. `app/ai/cpuPlayer.ts`
4. `app/store/game/tickActions.ts`
5. `app/components/TreasuryButton.tsx`
6. `app/components/TopBar.tsx`
7. `app/components/TheaterPanel.tsx`
8. `app/screens/MainScreen.tsx`

## How It Works

1. **Cap Calculation**: The game counts how many regions/states each faction controls and multiplies by DIVISIONS_PER_STATE (1) to get total division cap
2. **Unit Cost**: Each unit (division) consumes DIVISION_CAP_PER_UNIT (2) division cap slots
3. **Production Check**: When attempting to produce a division, the game checks if (cap consumed by current units + cap consumed by units in production) < total cap
4. **UI Feedback**: The treasury tooltip shows the current cap and how many divisions are active/in production
5. **Visual Cues**: Deploy buttons are disabled with "CAP REACHED" text when the limit is hit

## Strategic Impact

- Players must balance expansion (capturing states) with military production
- Capturing enemy territory directly increases your production capacity
- Losing territory reduces your cap (existing divisions remain but no new production)
- Encourages territorial expansion rather than just stacking divisions in few regions

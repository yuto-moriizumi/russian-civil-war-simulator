# Division Cap System Implementation

## Summary

Successfully implemented a division cap system for the Russian Civil War Simulator. The maximum number of divisions a country can own is now limited by the number of states they control.

## Formula

**Division Cap = Controlled States × 2**

For example:
- 5 states controlled = 10 divisions max
- 10 states controlled = 20 divisions max

## Changes Made

### 1. Core Logic (`app/utils/divisionCap.ts`)

Created a new utility module with the following functions:

- `calculateDivisionCap()` - Calculates max divisions based on controlled states
- `countCurrentDivisions()` - Counts divisions in regions and in transit
- `countDivisionsInProduction()` - Counts divisions in the production queue
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

The cap multiplier is configurable in `app/utils/divisionCap.ts`:

```typescript
export const DIVISIONS_PER_STATE = 2;
```

Change this value to adjust the cap formula.

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

1. **Cap Calculation**: The game counts how many regions/states each faction controls and multiplies by 2
2. **Production Check**: When attempting to produce a division, the game checks if (current divisions + in production) < cap
3. **UI Feedback**: The treasury tooltip shows the current cap and how many divisions are active/in production
4. **Visual Cues**: Deploy buttons are disabled with "CAP REACHED" text when the limit is hit

## Strategic Impact

- Players must balance expansion (capturing states) with military production
- Capturing enemy territory directly increases your production capacity
- Losing territory reduces your cap (existing divisions remain but no new production)
- Encourages territorial expansion rather than just stacking divisions in few regions

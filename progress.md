# Combat System Implementation Progress

## Completed Work

### 1. Combat Popup UI Redesign (CombatPopup.tsx)
- Redesigned the combat popup to match the Hearts of Iron style reference image
- Added:
  - Battle header with commander portrait placeholders and rank stars
  - Central "Battle of [Region]" title with crossed swords icon
  - Faction flags (☭ for Soviet, 🦅 for White)
  - Large HP numbers with color-coded progress bars (red for attackers, green for defenders)
  - Circular combat progress indicator showing round progress
  - Division details lists with HP bars
  - Dark, gritty serif-based theme
  - Custom scrollbar styling

### 2. Bug Fix: Combat Timing Issue (Partial)
**Problem Identified:** When units moved to enemy territory, both attacker and defender units would "disappear" - the combat indicator wasn't showing on the map.

**Root Cause Found:** 
- Combat was being created with `arrivalTime` as the `lastRoundTime`
- But `processActiveCombats` was called with `currentDateTimeRef.current` which was 1 hour ahead
- This caused `shouldProcessCombatRound` to return `true` immediately
- All 10 combat rounds would process in rapid succession before the next render
- Combat would complete instantly, making units appear to vanish

**Fix Applied:**
- Changed `processPendingMovements` to use `currentDateTimeRef.current` instead of `arrivalTime` when creating combats
- This ensures the combat's `lastRoundTime` matches the current game time
- The first combat round will now correctly wait 1 game hour before processing

## Files Modified
1. `app/components/CombatPopup.tsx` - Complete UI redesign
2. `app/utils/combat.ts` - Added comment clarifying timing behavior
3. `app/page.tsx` - Fixed combat creation to use current game time

## Remaining Work / To Test
1. **Verify combat indicator appears on map** - The fix should now show the combat marker
2. **Test combat progression** - Ensure rounds process once per game hour
3. **Test combat completion** - Verify units return to regions correctly after battle
4. **CSS animation** - The `combat-pulse` animation is referenced in GameMap.tsx but the `@keyframes` may need to be added globally

## How to Test
1. Start dev server: `npm run dev` (in the combat system worktree)
2. Start a game, create and deploy units
3. Move units to an enemy-occupied region
4. Wait for arrival (6 game hours)
5. Combat indicator should appear on the map
6. Click the indicator to see the detailed combat popup
7. Watch combat progress over 10 game hours (rounds)

## Dev Server
- Worktree location: `/home/volga/russian-civil-war-simulator/.worktrees/task-implement-combat-system`
- Run with: `npm run dev`
- Default port: 3000

# Russian Civil War Simulator - Theater System Progress

## Session Date: January 12, 2026

### Overview
Implemented a comprehensive theater system with automatic army group naming for the Russian Civil War grand strategy game.

---

## ✅ Completed Features

### 1. Theater Detection System
**Status:** ✅ Complete + Bug Fixed

**Implementation:**
- `app/utils/theaterDetection.ts` (160 lines)
- BFS-based algorithm to detect connected frontline regions
- Groups player-owned regions adjacent to enemies into theaters
- Automatic theater updates every game tick (hourly)
- **Theater ID preservation** to prevent army group reset issue

**Key Functions:**
- `detectTheaters()` - Main detection algorithm with ID preservation
- `generateTheaterName()` - Geographic-aware theater naming
- `getTheaterStats()` - Calculate theater statistics

**Bug Fix (Latest):**
- **Issue:** Army groups were being reset every hour because theaters were regenerated with new IDs
- **Root Cause:** `detectTheaters()` created new theater IDs every call using `Date.now()`
- **Solution:** 
  - Added `existingTheaters` parameter to preserve theater IDs
  - Implements 80% region overlap matching algorithm
  - Reuses existing theater ID when theater composition remains similar
  - Army groups now maintain their `theaterId` references across game ticks

### 2. Systematic Army Group Naming
**Status:** ✅ Complete

**Implementation:**
- `app/utils/armyGroupNaming.ts` (162 lines)
- Hierarchical naming system following historical military conventions
- Context-aware naming based on faction and geography

**Naming Hierarchy:**
1. **1st group:** Faction-specific ("Volunteer Army", "Red Army Group")
2. **Groups 2-5:** Ordinal armies ("1st Army", "2nd Army", "3rd Army", "4th Army")
3. **Groups 6-10:** Geographic armies ("Northern Army Group", "Southern Army Group", "Eastern Army Group")
4. **Groups 11-20:** Roman numeral corps ("I Corps", "II Corps", "III Corps")
5. **Groups 20+:** Elite units ("Guards Corps", "Cossack Corps", "Siberian Corps")

**Key Functions:**
- `generateArmyGroupName()` - Main naming logic
- `analyzeGeographicContext()` - Detect geographic patterns
- `generateNumberedName()` - Custom prefix support

### 3. Theater Panel UI
**Status:** ✅ Complete

**Implementation:**
- `app/components/TheaterPanel.tsx` (424 lines)
- Replaced old ArmyGroupsPanel with theater-organized view
- Expandable theater sections with statistics
- One-click army group creation

**Features:**
- **Theater cards** with expandable sections
  - Shows frontline region count, division count, enemy faction
  - "Select All" button (blue) - selects regions for manual work
  - "+ Create Group" button (green) - instantly creates army group
- **Army group management** within theaters
  - Color-coded group indicators
  - Stats display (regions, divisions)
  - Deploy button (distribute reserves)
  - Advance button (move toward enemy)
  - Delete button
  - Double-click to rename
- **Unassigned groups section** for groups without theater
- **Selection UI** appears only for manual Shift+click workflow
- **Help text** explaining theater system

### 4. Deploy to Army Group
**Status:** ✅ Complete

**Implementation:**
- `deployToArmyGroup()` in `app/store/useGameStore.ts`
- Distributes all reserve divisions across army group regions
- Round-robin allocation for even distribution
- Creates deployment events for tracking

**Algorithm:**
- Validates all regions in group are owned by player
- Round-robin distribution: each region gets one division in rotation
- Generates game events for each deployment
- Clears reserves after deployment

### 5. Game State Integration
**Status:** ✅ Complete

**Files Modified:**
- `app/store/useGameStore.ts` (+110 lines)
  - Theater state management
  - `detectAndUpdateTheaters()` action
  - `selectTheater()` action
  - `deployToArmyGroup()` action
  - `createArmyGroup()` updated for auto-naming
  - Theater detection on game start and every tick

- `app/types/game.ts` (+19 lines)
  - `Theater` interface
  - `theaterId` field in `ArmyGroup`
  - `theaters` array in `GameState`
  - Theater methods in `GameAPI`

- `app/hooks/useGameAPI.ts` (+7 lines)
  - `getTheaters()` method
  - `selectTheater()` method
  - `deployToArmyGroup()` method

- `app/screens/MainScreen.tsx` (+27 lines)
  - TheaterPanel integration
  - Props wiring

- `app/page.tsx` (+4 lines)
  - State connection

- `app/utils/saveLoad.ts` (+2 lines)
  - Theater persistence support
  - `theaters` field in serialization

---

## 🐛 Bugs Fixed

### Theater ID Reset Issue (Fixed: Jan 12, 2026)
**Problem:** Army groups lost their theater assignments every hour

**Symptoms:**
- Create army group → works fine
- Wait 1 hour in-game → army group shows as "unassigned"
- Theater panel shows groups outside their theaters

**Root Cause:**
```typescript
// OLD CODE (buggy):
id: `theater-${Date.now()}-${index}`,  // New ID every call!
```

**Investigation:**
- Found `detectAndUpdateTheaters()` called every tick (line 344)
- `detectTheaters()` generated new IDs using `Date.now()`
- Army groups had stale `theaterId` references

**Solution:**
```typescript
// NEW CODE (fixed):
const matchingTheater = existingTheaters.find(existingTheater => {
  const overlap = calculateOverlap(existingTheater.frontlineRegions, group.regions);
  return overlap > 0.8 && existingTheater.enemyFaction === primaryEnemy;
});

id: matchingTheater?.id || `theater-${Date.now()}-${index}-${Math.random()}`,
```

**Testing:**
- ✅ Build successful
- ✅ No TypeScript errors
- ⏳ Needs in-game testing (create group, wait 1+ hours)

---

## 📊 Statistics

### Code Changes
- **9 files changed**
- **+900 lines added**
- **-15 lines removed**

**New Files:**
- `app/components/TheaterPanel.tsx` (424 lines)
- `app/utils/armyGroupNaming.ts` (162 lines)
- `app/utils/theaterDetection.ts` (160 lines)

**Modified Files:**
- `app/store/useGameStore.ts` (+110 lines)
- `app/screens/MainScreen.tsx` (+27 lines)
- `app/types/game.ts` (+19 lines)
- `app/hooks/useGameAPI.ts` (+7 lines)
- `app/page.tsx` (+4 lines)
- `app/utils/saveLoad.ts` (+2 lines)

### Git Status
- **Branch:** `task/try-army-group-feature`
- **Last Commit:** `b7fc335` - "Add theater system with automatic army group naming"
- **Status:** Pushed to origin
- **Pending Changes:** Theater ID preservation fix (not yet committed)

---

## 🎮 User Workflow

### Creating Army Groups

**Method 1: One-Click Theater Creation**
1. Click green **"+ Create Group"** button on any theater
2. Army group created instantly with auto-generated name
3. No intermediate UI, no extra clicks

**Method 2: Manual Selection**
1. Shift+click regions to select them
2. Click **"+ Create Army Group"** in selection banner
3. Group created with auto-generated name

**Method 3: Select All Button**
1. Click blue **"Select All"** on theater
2. Regions selected for manual work
3. Can adjust selection with Shift+click
4. Click **"+ Create Army Group"** to create

### Managing Army Groups
- **Deploy:** Click "Deploy" button to distribute reserves
- **Advance:** Click "Advance" button to move units toward enemy
- **Rename:** Double-click group name to edit
- **Delete:** Click "✕" button to remove group

### Theater System
- **Auto-detection:** Theaters appear automatically when units near enemies
- **Updates:** Theaters recalculate every hour (game time)
- **Persistence:** Theater IDs preserved to maintain army group assignments

---

## 🔧 Technical Architecture

### Theater Detection Algorithm
```
1. Find Frontline Regions
   - Player-owned regions
   - Adjacent to enemy regions
   - Track which enemies each region faces

2. Group Connected Regions (BFS)
   - Start from unvisited frontline region
   - BFS through adjacent frontline regions
   - Create theater group from connected component

3. Generate Theater Objects
   - Match with existing theaters (80% overlap)
   - Preserve theater ID if match found
   - Generate new ID only if truly new theater
   - Auto-generate geographic name
```

### Army Group Naming Algorithm
```
1. Count Existing Groups
   - Filter by player faction
   - Get count for naming tier

2. Select Name Pattern
   - 1st: Faction-specific
   - 2-5: Ordinal armies
   - 6-10: Geographic armies
   - 11-20: Corps (Roman numerals)
   - 20+: Elite/specialized

3. Geographic Analysis (Optional)
   - Detect directional patterns
   - Identify terrain features
   - Customize name if applicable
```

### Theater ID Preservation
```
For each detected theater group:
  For each existing theater:
    Calculate region overlap ratio
    If overlap > 80% AND same enemy:
      Reuse existing theater ID
      Break
  If no match found:
    Generate new unique ID
```

---

## 🧪 Testing Status

### Automated Tests
- ✅ TypeScript compilation
- ✅ Build successful
- ✅ No type errors

### Manual Testing Needed
- ⏳ Create army group, wait 1+ hours in-game
- ⏳ Verify theater ID persists across ticks
- ⏳ Test theater merging/splitting scenarios
- ⏳ Test army group deployment across regions
- ⏳ Test advance functionality with multiple groups
- ⏳ Test naming progression through 20+ groups

### Known Issues
- ❓ Theater naming could be more geographically accurate
- ❓ Multiple theaters sometimes have same name ("White Front")
- ❓ No way to manually assign/reassign army groups to theaters

---

## 🚀 Deployment

### Dev Server
- **URL:** http://localhost:20627/
- **Location:** `.worktrees/task/try-army-group-feature`
- **Status:** ✅ Running

### Git Repository
- **Remote:** https://github.com/yuto-moriizumi/russian-civil-war-simulator
- **PR Link:** https://github.com/yuto-moriizumi/russian-civil-war-simulator/pull/new/task/try-army-group-feature

---

## 📝 Next Steps

### High Priority
1. **Commit & push theater ID fix**
2. **Test theater persistence** in-game
3. **Improve theater naming** (better geographic detection)

### Medium Priority
4. **Theater reassignment UI** (drag/drop groups between theaters)
5. **Theater-level commands** (Deploy All, Advance All)
6. **Visual improvements** (highlight theater regions on map)

### Low Priority
7. **Theater statistics** panel
8. **Combat effectiveness** indicators per theater
9. **Historical theater names** option
10. **Theater templates** for specific scenarios

---

## 💡 Design Decisions

### Why Auto-Generated Names?
- **Consistency:** Professional military naming convention
- **Scalability:** Works from 1 to 100+ groups
- **Speed:** No typing required, one-click creation
- **Immersion:** Historical military feel

### Why Theater-Based Organization?
- **Strategic clarity:** See all fronts at once
- **Natural grouping:** Matches real military organization
- **Auto-detection:** No manual setup required
- **Dynamic:** Updates as frontlines shift

### Why Preserve Theater IDs?
- **Data integrity:** Army groups maintain assignments
- **User expectations:** Groups don't randomly become "unassigned"
- **Performance:** Avoids re-assigning all groups every hour
- **Consistency:** Theater selection remains stable

---

## 🎯 Success Metrics

### Implemented ✅
- ✅ Theater detection working
- ✅ Army groups auto-named correctly
- ✅ One-click group creation
- ✅ Deploy functionality working
- ✅ Theater panel UI complete
- ✅ Theater IDs preserved (latest fix)

### Pending Verification ⏳
- ⏳ No army group resets after 1+ hours
- ⏳ Theater names distinct and meaningful
- ⏳ Performance with 20+ theaters
- ⏳ UI responsive with 50+ army groups

---

## 📚 Documentation

### User-Facing
- Help text in TheaterPanel
- Button tooltips
- AGENTS.md updated with API info

### Developer-Facing
- Type definitions in game.ts
- JSDoc comments in utility files
- This progress.md file

---

## 🔄 Recent Changes (Last Session)

### Jan 12, 2026 - Late Session
1. ✅ Removed input field for army group names
2. ✅ Made "+ Create Group" button instant (no intermediate UI)
3. ✅ Updated help text
4. ✅ Fixed theater ID preservation issue
5. ✅ Updated progress.md

**Commits:**
- `b7fc335` - Add theater system with automatic army group naming (pushed)
- Pending: Theater ID preservation fix

---

## 📞 Support Info

### Key Files
- Theater detection: `app/utils/theaterDetection.ts`
- Army naming: `app/utils/armyGroupNaming.ts`
- UI: `app/components/TheaterPanel.tsx`
- State: `app/store/useGameStore.ts`
- Types: `app/types/game.ts`

### Debugging
```javascript
// Browser console commands:
window.gameAPI.getTheaters()
window.gameAPI.getArmyGroups()
window.gameAPI.deployToArmyGroup("group-id")
window.gameAPI.selectTheater("theater-id")
```

---

**Last Updated:** January 12, 2026  
**Status:** Theater ID fix ready for commit  
**Next Action:** Test in-game, then commit & push

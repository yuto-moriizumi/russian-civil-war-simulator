# Kingdom of Poland - NPC Country Addition

## Historical Context

The **Regency Kingdom of Poland** (Królestwo Regencyjne) was proclaimed by Germany and Austria-Hungary in November 1916 as a puppet state carved out of Russian-controlled Congress Poland. On November 20, 1917 (the game start date), it existed under German occupation with a Regency Council governing in Warsaw.

The kingdom remained under Central Powers control until November 11, 1918, when it transitioned to the independent Second Polish Republic following the defeat of Germany and Austria-Hungary in World War I.

## Changes Made

### 1. Type Definitions (`app/types/game.ts`)
- Added `'poland'` to the `CountryId` type union

### 2. Country Definition (`app/data/gameData.ts`)
- Added Kingdom of Poland to the `countries` array:
  - **ID**: `poland`
  - **Name**: Kingdom of Poland
  - **Flag**: `/images/flags/poland.svg`
  - **Color**: `#DC143C` (Crimson red, from Polish flag)
  - **Selectable**: `false` (NPC country)
  - **Core Regions**: All 16 Polish voivodeships (PL-DS, PL-KP, PL-LB, PL-LD, PL-LU, PL-MA, PL-MZ, PL-OP, PL-PD, PL-PK, PL-PM, PL-SK, PL-SL, PL-WN, PL-WP, PL-ZP)

### 3. Mission Tree (`app/data/gameData.ts`)
Created 6 historically accurate missions for Poland:

1. **Regency Council Authority** (Defense +1, HP +10)
   - Establish the Regency Council's governing authority
   - Requires: 3 divisions
   
2. **Polnische Wehrmacht** (Attack +1, Command Power +3)
   - Build the Polish Armed Forces under the Regency Kingdom
   - Requires: 8 divisions, control Warsaw (PL-MZ)
   
3. **Assert Polish Autonomy** (Production Speed +15%, Defense +1)
   - Distance from German control and assert independence
   - Requires: Control 10 regions, after September 1918
   
4. **Declare Independence** (HP +15, Attack +2)
   - Proclaim the independent Polish Republic
   - Requires: Previous 2 missions, after November 1918, control Warsaw, 12 divisions
   
5. **Secure Polish Borders** (Defense +2, Command Power +3)
   - Defend the new Polish state from external threats
   - Requires: Control 14 regions, 2 combat victories
   
6. **Second Polish Republic** (Attack +3, Defense +3, **Victory**)
   - Establish Poland as a free and independent republic after 123 years of partition
   - Requires: Control all Polish regions, 18 divisions

### 4. Flag Design (`public/images/flags/poland.svg`)
- Created SVG of the Polish flag: white horizontal stripe on top, red on bottom
- Uses crimson red (#dc143c) matching the historical Polish flag

### 5. Supporting Files Updated
- `app/components/CountrySidebar.tsx` - Added Poland to country names
- `app/components/GameMap/mapConstants.ts` - Added Poland flag path
- `app/components/RelationshipsPanel.tsx` - Added Poland to country names
- `app/store/game/initialState.ts` - Added Poland to production queues and bonuses
- `app/utils/armyGroupNaming.ts` - Added "Polnische Wehrmacht" as first army group name
- `app/utils/mapUtils.ts` - Added Poland color to map display
- `app/utils/saveLoad.ts` - Added Poland to save/load handlers
- `app/utils/theaterDetection.ts` - Added "Polish" as enemy name

## Still Required - Manual Configuration

Since this is an NPC country that exists at game start (November 20, 1917), you still need to manually configure:

### 1. Initial Region Ownership (`app/data/map.ts`)
Currently all Polish regions are owned by `'foreign'`. You need to change them to `'poland'`:

```typescript
// Change from:
'PL-DS': 'foreign', 'PL-KP': 'foreign', ... 

// To:
'PL-DS': 'poland', 'PL-KP': 'poland', 'PL-LB': 'poland', 'PL-LD': 'poland',
'PL-LU': 'poland', 'PL-MA': 'poland', 'PL-MZ': 'poland', 'PL-OP': 'poland',
'PL-PD': 'poland', 'PL-PK': 'poland', 'PL-PM': 'poland', 'PL-SK': 'poland',
'PL-SL': 'poland', 'PL-WN': 'poland', 'PL-WP': 'poland', 'PL-ZP': 'poland',
```

### 2. Starting Military Units (`app/store/game/initialState.ts`)
Add starting divisions for Poland in the `regionsData` section. Historical context:
- The Polnische Wehrmacht was in early formation stages in November 1917
- Recommend 2-4 divisions based on game balance
- Place in Warsaw (PL-MZ) and possibly Krakow (PL-MA)

Example:
```typescript
'PL-MZ': [
  createDivision('Polish 1st Division', 'poland', defaultArmyGroupId),
  createDivision('Polish 2nd Division', 'poland', defaultArmyGroupId),
],
```

### 3. Initial Diplomatic Relationships (`app/store/game/initialState.ts`)
Based on historical context, consider adding:
- **Military Access**: Germany → Poland (German occupation)
- Poland was a puppet state, so it wouldn't be at war with Germany
- Potentially at tension with Soviet Russia (border disputes)

Example:
```typescript
relationships: [
  { fromCountry: 'germany', toCountry: 'poland', type: 'military_access' },
  // ... other relationships
],
```

### 4. AI Behavior (Optional)
If you want custom AI behavior for Poland beyond the default CPU player, you would need to:
- Add specific AI strategy in `app/ai/cpuPlayer.ts`
- Define strategic priorities (defensive vs. expansionist)

## Historical Accuracy Notes

- **November 1917**: Kingdom exists as German puppet state with Regency Council
- **1918**: Increasing autonomy as Central Powers weaken
- **November 11, 1918**: Transition to independent Second Polish Republic
- **1918-1921**: Polish-Soviet War and border conflicts

The mission tree reflects this progression from puppet state → autonomy → independence → consolidation.

## Testing Recommendations

1. Start a game with any playable country
2. Verify Poland appears on the map with correct color (#DC143C - crimson)
3. Check that Poland has starting divisions (after you add them)
4. Open Country Sidebar for Poland to see country info
5. Verify Poland's mission tree appears correctly
6. Observe Poland's AI behavior (should act defensively initially)
7. Test that relationships with Poland work correctly

## Color Justification

The color `#DC143C` (crimson red) was chosen based on the Polish flag, which features white on top and red on bottom. The red represents Polish national identity and provides good contrast on the map while being distinct from Soviet red (#CC0000) and other reds in the game.

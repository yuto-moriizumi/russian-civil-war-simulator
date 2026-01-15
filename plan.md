# Mission Reward System Overhaul - Implementation Plan

## Overview
Transform the mission reward system from money-based to gameplay bonuses that provide:
- **Attack Bonus**: Increases division attack power
- **Defence Bonus**: Increases division defence power
- **HP Bonus**: Increases division max HP
- **Command Power Increase**: Adds extra divisions beyond the base cap
- **Production Speed Bonus**: Reduces division production time

## Design Specifications

Based on requirements:
- ✅ **Bonuses apply to ALL divisions** (existing + future)
- ✅ **Additive stacking** across missions
- ✅ **Conservative scaling** for balanced progression
- ✅ **Flat command power bonuses** (+3 divisions per mission)
- ✅ **Percentage-based production speed** reduction (15-20%)
- ✅ **Unique faction themes** for distinct playstyles

---

## Phase 1: Type System Updates

### 1.1 Update Mission Reward Types (`app/types/game.ts`)

**Changes needed:**
- Replace `rewards: { money: number; gameVictory?: boolean }` 
- Add new reward structure:

```typescript
export interface MissionRewards {
  attackBonus?: number;        // +2, +3, +5
  defenceBonus?: number;        // +1, +2, +3
  hpBonus?: number;             // +10, +20, +30
  commandPowerBonus?: number;    // +3 flat divisions
  productionSpeedBonus?: number; // 0.15, 0.20 (15%, 20% reduction)
  gameVictory?: boolean;
}
```

### 1.2 Add Faction Bonuses Tracking to GameState

**New interface:**
```typescript
export interface FactionBonuses {
  attackBonus: number;
  defenceBonus: number;
  hpBonus: number;
  maxHpBonus: number;
  commandPowerBonus: number;
  productionSpeedMultiplier: number; // 1.0 = normal, 0.8 = 20% faster
}
```

**Add to GameState:**
```typescript
factionBonuses: Record<FactionId, FactionBonuses>;
```

---

## Phase 2: Data Updates

### 2.1 Design Mission Rewards Per Faction

**Soviet Russia** (Offense-focused: Attack > HP > Defence):
1. **Workers Unite!**: +2 Attack
2. **Red Terror**: +10 HP, +1 Defence
3. **War Communism**: +3 Division Cap, 15% Production Speed
4. **Crush Counter-Revolution**: +3 Attack, +1 Defence
5. **March to Victory**: +20 HP, +3 Division Cap
6. **Total Victory**: +5 Attack, +3 Defence, Victory

**White Army** (Defense-focused: Defence > HP > Attack):
1. **Rally the Faithful**: +2 Defence
2. **Secure Foreign Support**: +10 HP, +3 Division Cap
3. **Restore Order**: 15% Production Speed, +1 Attack
4. **Break the Red Army**: +3 Defence, +2 Attack
5. **Advance on Petrograd**: +20 HP, +3 Division Cap
6. **Total Victory**: +3 Attack, +5 Defence, Victory

**Finland** (Speed & Efficiency: Production > HP > Attack):
1. **Declare Independence**: 15% Production Speed
2. **Finnish Civil War**: +10 HP, +1 Attack
3. **German Intervention**: +3 Division Cap, +2 Defence
4. **East Karelian Uprising**: 20% Production Speed, +2 Attack
5. **Greater Finland**: +20 HP, +3 Division Cap
6. **Secure the North**: +3 Attack, +3 Defence, Victory

**Ukraine** (Balanced: HP > Balanced Stats):
1. **Ukrainian People's Republic**: +10 HP, +1 Attack
2. **Consolidate Control**: +3 Division Cap, +1 Defence
3. **Strengthen the Rada**: 15% Production Speed, +1 Attack
4. **Resist Foreign Invasion**: +2 Attack, +2 Defence
5. **Secure the Donbas**: +20 HP, +3 Division Cap
6. **Independent and Free**: +3 Attack, +3 Defence, Victory

### 2.2 Update `app/data/gameData.ts`

Replace all `rewards: { money: 100 }` structures with the new reward objects above.

---

## Phase 3: Core Systems

### 3.1 Bonus Calculation Utility (`app/utils/bonusCalculator.ts` - NEW FILE)

**Create new utility:**
```typescript
export function calculateFactionBonuses(
  missions: Mission[],
  factionId: CountryId
): FactionBonuses {
  // Aggregate all claimed mission rewards for this faction
  // Return totals for attack, defence, hp, cap, production speed
}

export function getBaseProductionTime(
  factionBonuses: FactionBonuses
): number {
  // Base: 24 hours
  // Apply productionSpeedMultiplier
  // Return adjusted hours
}

export function getDivisionStats(
  factionId: FactionId,
  factionBonuses: FactionBonuses
): { attack: number; defence: number; hp: number; maxHp: number } {
  // Base stats: attack 20, defence 10, hp/maxHp 100
  // Apply bonuses
  // Return final stats
}
```

### 3.2 Update `app/store/game/initialState.ts`

Add initial `factionBonuses` with zero bonuses for all factions.

### 3.3 Update `claimMission` in `app/store/game/basicActions.ts`

**Current behavior:** Adds money to state

**New behavior:**
1. Recalculate faction bonuses using `calculateFactionBonuses()`
2. Update `state.factionBonuses[factionId]` 
3. **Apply bonuses retroactively to ALL existing divisions** in regions and movements
4. Remove money changes
5. Update notification text (remove money, describe bonuses)

### 3.4 Update Division Creation

**Files to modify:**
- `app/store/game/tickHelpers/productionProcessing.ts` (lines 36-45)
- `app/utils/combat.ts` (`createDivision` function)

**Changes:**
- Replace hardcoded stats with `getDivisionStats(factionId, factionBonuses)`
- Ensure new divisions get current faction bonuses

### 3.5 Update Command Power Calculation

**File:** `app/utils/commandPower.ts`

**Function:** `calculateCommandPower`

**Changes:**
```typescript
export function calculateCommandPower(
  factionId: FactionId,
  regions: RegionState,
  factionBonuses: FactionBonuses  // NEW PARAMETER
): number {
  const controlledStates = Object.values(regions).filter(
    region => region.owner === factionId
  ).length;
  
  const baseCap = controlledStates * DIVISIONS_PER_STATE;
  const bonusCap = factionBonuses.commandPowerBonus;
  
  return baseCap + bonusCap;
}
```

**Note:** Update all call sites (7 locations based on grep results).

### 3.6 Update Production Queue Time

**File:** `app/store/game/productionActions.ts`

**Function:** `addToProductionQueue`

**Changes:**
- Replace hardcoded 24-hour production time
- Use `getBaseProductionTime(factionBonuses)` from bonus calculator

---

## Phase 4: UI Updates

### 4.1 Mission Display (`app/components/MissionNode.tsx`)

**Current:** Shows `$${mission.rewards.money}`

**New:** Display reward bonuses with icons:
- ⚔️ +2 Attack
- 🛡️ +1 Defence  
- ❤️ +10 HP
- 👥 +3 Cap
- ⚡ +15% Speed

### 4.2 Mission Panel (`app/components/MissionPanel.tsx`)

Same changes as MissionNode for reward display.

### 4.3 Top Bar (`app/components/TopBar.tsx` & `TreasuryButton.tsx`)

**Remove:**
- Money display ($xxx)
- Income display

**Keep:**
- Division count display with updated cap calculation

### 4.4 Division Stats Tooltip (Optional Enhancement)

**File:** `app/components/GameMap/RegionPanels.tsx`

**Add:** Hover tooltip showing division stats:
```
Red Guard 1st Division
HP: 110/110
Attack: 22 (+2)
Defence: 11 (+1)
```

---

## Phase 5: Save/Load System

### 5.1 Update Serialization (`app/utils/saveLoad.ts`)

**Add to save format:**
- `factionBonuses` field
- Version bump (for migration)

**Migration logic:**
- If loading old save without `factionBonuses`, initialize from claimed missions

---

## Phase 6: Mission Condition Updates

### 6.1 Remove Money-Based Conditions

**File:** `app/store/game/missionHelpers.ts`

**Remove or deprecate:**
- `hasMoney` condition evaluation (lines 60-62)

**Update missions in `gameData.ts`:**
- Replace `{ type: 'hasMoney', amount: 500 }` conditions with alternatives:
  - `controlRegionCount`
  - `hasUnits` 
  - `dateAfter`
  - `combatVictories`

---

## Phase 7: AI Updates

### 7.1 CPU Player Awareness (`app/ai/cpuPlayer.ts`)

**Current:** AI tracks money for production decisions

**Update:** 
- Remove money checks
- AI automatically gets same mission rewards when conditions met
- AI calculates bonuses same as player

---

## Files Summary

### **Files to Modify (15 files):**

1. ✏️ `app/types/game.ts` - Type definitions
2. ✏️ `app/data/gameData.ts` - Mission rewards data
3. ✏️ `app/store/game/initialState.ts` - Initial bonuses
4. ✏️ `app/store/game/basicActions.ts` - claimMission logic
5. ✏️ `app/store/game/productionActions.ts` - Production time
6. ✏️ `app/store/game/tickHelpers/productionProcessing.ts` - Division creation
7. ✏️ `app/utils/combat.ts` - createDivision function
8. ✏️ `app/utils/commandPower.ts` - Command power calculation
9. ✏️ `app/store/game/missionHelpers.ts` - Condition evaluation
10. ✏️ `app/components/MissionNode.tsx` - Reward display
11. ✏️ `app/components/MissionPanel.tsx` - Reward display
12. ✏️ `app/components/TopBar.tsx` - Remove money UI
13. ✏️ `app/components/TreasuryButton.tsx` - Remove money UI
14. ✏️ `app/utils/saveLoad.ts` - Save/load format
15. ✏️ `app/ai/cpuPlayer.ts` - AI behavior

### **Files to Create (1 file):**

1. ➕ `app/utils/bonusCalculator.ts` - Bonus calculation logic

---

## Implementation Order

1. **Start:** Phase 1 (Types) - Foundation
2. **Then:** Phase 2 (Data) - Content
3. **Then:** Phase 3.1-3.2 (Bonus Calculator & Initial State) - Core logic
4. **Then:** Phase 3.3 (Claim Mission) - Integration point
5. **Then:** Phase 3.4-3.6 (Division Creation, Cap, Production) - Gameplay systems
6. **Then:** Phase 4 (UI) - Visual updates
7. **Then:** Phase 5 (Save/Load) - Persistence
8. **Finally:** Phase 6 & 7 (Conditions & AI) - Polish

---

## Testing Checklist

After implementation, test:

- [ ] Mission claiming applies bonuses correctly
- [ ] Bonuses stack additively across missions
- [ ] Existing divisions get retroactive bonuses
- [ ] New divisions spawn with correct stats
- [ ] Division cap increases work properly
- [ ] Production time reduces correctly
- [ ] Each faction has unique reward distribution
- [ ] UI displays rewards correctly (no money references)
- [ ] Save/load preserves bonuses
- [ ] AI factions work properly
- [ ] Victory missions still trigger win condition

---

## Notes

**Production Speed Math:** Using multiplicative stacking (0.85 × 0.80 = 0.68 = 32% total) to prevent excessive speed bonuses.

**Retroactive Application:** Accept brief lag when claiming missions - it's a one-time operation per mission claim and provides clear feedback to player.

**UI for Rewards:** Using compact icon-based display with tooltips for details.

**Money Removal:** Keeping money code temporarily commented out for potential future use, complete removal in cleanup phase.

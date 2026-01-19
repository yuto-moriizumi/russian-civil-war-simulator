# Ukrainian People's Republic of Soviets - Implementation Notes

## Historical Context
The Ukrainian People's Republic of Soviets was established on December 25, 1917 (O.S. December 12) in Kharkiv as a rival Soviet government to the Ukrainian People's Republic based in Kyiv. This was a short-lived Bolshevik state that lasted until early 1918.

## Country Details
- **Country ID**: `ukrainesoviet`
- **Name**: Ukrainian People's Republic of Soviets
- **Combat Name**: Red Ukrainian Forces
- **Capital**: Kharkiv (UA-63)
- **Flag**: Dark red banner (historically accurate)
- **Color**: `#8B0000` (dark red, distinct from Soviet Russia's `#CC0000`)
- **Selectable**: `false` (NPC country controlled by AI)

## Core Regions
Based on historical research, the country's core regions are:
- **UA-63** (Kharkiv) - Capital and main stronghold
- **UA-65** (Luhansk) - Eastern industrial region
- **UA-14** (Donetsk) - Industrial heartland
- **UA-53** (Poltava) - Agricultural region with Bolshevik support
- **UA-59** (Sumy) - Northern border region
- **UA-12** (Dnipropetrovsk) - Strategic industrial center
- **UA-32** (Kyiv) - Contested capital, historically captured

## Initial State Configuration Needed

### 1. Starting Territory (in `app/store/game/initialState.ts` or region ownership files)
At game start (November 20, 1917), this country should **NOT** control any territories yet. 
The Ukrainian People's Republic of Soviets was only proclaimed on December 25, 1917.

**Recommended setup**:
- Initially: Control no regions (does not exist yet)
- Later through scheduled events: Gain control of Kharkiv and surrounding regions

### 2. Initial Military Units
When the country emerges (December 1917), suggested starting forces:
- **Kharkiv** (UA-63): 3-4 divisions (Red Guards, industrial workers)
- **Luhansk** (UA-65): 2-3 divisions (coal miners, Bolshevik sympathizers)
- **Donetsk** (UA-14): 2-3 divisions (industrial workers)

Total suggested strength: 8-10 divisions at emergence

### 3. Diplomatic Relationships

**At War With** (from the start):
- **ukraine** (Ukrainian People's Republic) - Primary rival, immediate conflict
  ```typescript
  { fromCountry: 'ukrainesoviet', toCountry: 'ukraine', type: 'war' }
  ```

**Allied/Supported By**:
- **soviet** (Soviet Russia) - Autonomy relationship (Soviet puppet)
  ```typescript
  { fromCountry: 'soviet', toCountry: 'ukrainesoviet', type: 'autonomy' }
  ```

**Potential Conflicts**:
- **white** (White Army) - Hostile but may not be in direct conflict initially
- **don** (Don Cossacks) - Hostile, anti-Bolshevik forces

### 4. AI Behavior Configuration
The country should use the default CPU AI with aggressive expansion goals:
- **Primary Goal**: Capture Kyiv (UA-32) and defeat the Ukrainian People's Republic
- **Secondary Goal**: Control all eastern Ukrainian industrial regions
- **Military Strategy**: Offensive, supported by Soviet Russia
- **Historical Timeline**: Should be defeated or merged into Ukrainian Soviet Republic by March 1918

### 5. Scheduled Events
Consider adding a scheduled event for the country's emergence:

```typescript
{
  id: 'ukrainesoviet-establishment',
  date: '1917-12-25', // Historical founding date
  title: 'Ukrainian People\'s Republic of Soviets Proclaimed',
  description: 'Bolsheviks establish rival Soviet government in Kharkiv after leaving the All-Ukrainian Congress of Soviets in Kyiv.',
  actions: [
    { type: 'transferRegion', regionId: 'UA-63', newOwner: 'ukrainesoviet' },
    { type: 'transferRegion', regionId: 'UA-65', newOwner: 'ukrainesoviet' },
    { type: 'declareWar', fromCountry: 'ukrainesoviet', toCountry: 'ukraine' },
  ],
  triggered: false,
}
```

## Historical Accuracy Notes
1. This was a **puppet state of Soviet Russia**, not an independent actor
2. It existed briefly from December 1917 to March 1918
3. Its main support base was in **industrial eastern Ukraine** (Donbas region)
4. It was opposed by the Ukrainian People's Republic and later merged into the Ukrainian Soviet Republic
5. The capital was Kharkiv, not Kyiv (which was controlled by the rival Ukrainian People's Republic)

## Files Modified
- `app/types/game.ts` - Added `ukrainesoviet` to CountryId type
- `app/data/countryMetadata.ts` - Added country metadata with historical details
- `app/store/game/initialState.ts` - Added production queue and bonuses entries
- `app/utils/saveLoad.ts` - Added save/load compatibility
- `public/images/flags/ukrainesoviet.svg` - Created historically accurate red flag

## Next Steps for Full Implementation
1. Add scheduled event for country emergence (December 25, 1917)
2. Configure initial region ownership for when it emerges
3. Add starting military divisions
4. Set up diplomatic relationships (war with Ukraine, autonomy under Soviet Russia)
5. Test AI behavior and adjust as needed
6. Consider adding country-specific missions if desired

## Testing Recommendations
1. Verify the country appears correctly on the map
2. Test that scheduled events trigger properly
3. Ensure AI makes reasonable military decisions
4. Check that diplomatic relationships work correctly
5. Verify save/load functionality with the new country

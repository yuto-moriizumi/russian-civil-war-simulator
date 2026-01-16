# Kingdom of Romania - NPC Country Addition

## Historical Context

In November 1917, the **Kingdom of Romania** was in a critical state. Following the collapse of the Russian Front after the Bolshevik Revolution, Romania was isolated and eventually forced into the Armistice of Focșani with the Central Powers. However, the Romanian Army, reorganized with French assistance, remained a potent force in Moldavia. In early 1918, Romania intervened in Bessarabia to protect the newly formed Moldavian Democratic Republic from Bolshevik influence, leading to their union in April 1918.

## Changes Made

### 1. Type Definitions (`app/types/game.ts`)
- Added `'romania'` to the `CountryId` type union.

### 2. Country Definition (`app/data/countries.ts`)
- Added Kingdom of Romania to the `COUNTRY_METADATA` registry:
  - **ID**: `romania`
  - **Name**: Kingdom of Romania
  - **Combat Name**: Romanian Army
  - **Color**: `#003399` (Royal Blue)
  - **Selectable**: `false` (NPC country)
  - **Core Regions**: Bucharest (RO-B), Iași (RO-IS), Constanța (RO-CT), Cluj (RO-CJ), Timișoara (RO-TM), Bălți (MD-BA), Chișinău (MD-CU).

### 3. Mission Tree (`app/data/missions/eastern-europe.ts`)
Created 4 historically grounded missions:
1. **Reorganize the Army** (Production Speed +15%, HP +10)
   - Rebuild the army in Moldavia after the collapse of the Eastern Front.
   - Requires: 3 divisions.
2. **Secure Bessarabia** (Attack +2, Command Power +3)
   - Intervene to maintain order and protect the region from Bolsheviks.
   - Requires: Control Chișinău (MD-CU), 8 divisions.
3. **Union of Bessarabia** (Defense +2, HP +10)
   - Formally unite Bessarabia with the Kingdom.
   - Requires: Control Chișinău and Bălți, 2 combat victories.
4. **Greater Romania** (Attack +3, Defense +3, **Victory**)
   - Unite all Romanian lands and establish regional dominance.
   - Requires: Control Bucharest, Iași, and Chișinău, 15 divisions.

### 4. Flag Design (`public/images/flags/romania.svg`)
- Created vertical tricolor: Blue (#002B7F), Yellow (#FCD116), Red (#CE1126).

### 5. Supporting Files Updated
- `app/components/CountrySidebar.tsx`: Added Romania to faction lists and enabled diplomacy.
- `app/components/RelationshipsPanel.tsx`: Added Romania to the relationship management UI.
- `app/store/game/initialState.ts`: Initialized production queues, bonuses, and set initial war with Germany.
- `app/store/game/basicActions.ts`: Added Romania to AI control during country selection.
- `app/ai/cpuPlayer.ts`: Configured AI army group naming.
- `app/utils/saveLoad.ts`: Updated serialization/deserialization for save game compatibility.
- `app/utils/theaterDetection.ts`: Added Romanian theater naming support.
- `app/data/map.ts`: Assigned Romanian regions (`RO-*`) to the `romania` country.

## Manual Configuration & Next Steps

The country is now functional and will be controlled by the CPU. You can further customize the initial state:

### 1. Initial Units
By default, the game starts with 0 units and factions begin production immediately. If you wish to add pre-placed divisions, you can do so in the `regions` initialization logic or via a scheduled event.

### 2. Diplomatic Relationships
Romania starts at war with Germany. You may want to add relationships with other powers (e.g., neutral with Soviet Russia, friendly with the White Army) in `app/store/game/initialState.ts`.

### 3. Testing
1. Start the game as any playable country (e.g., Ukraine).
2. Locate Romania on the map (Blue regions in the Balkans).
3. Open the Country Sidebar for Romania to verify its stats and mission progress.
4. Observe the Romanian AI as it begins to produce units and react to the German threat.

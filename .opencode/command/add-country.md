---
description: Add a new non-playable country that exists from the beginning of the game
---

Add a new non-playable country that exists from the start of the game: $ARGUMENTS

**Important**: This command is for adding countries that exist at game start (November 20, 1917), not for countries that emerge during gameplay. The country will be added to the initial game state with starting territories, units, and diplomatic relationships.

## Steps to execute:

1. **Parse input and research**: $ARGUMENTS should contain only the country name (e.g., "Kuban People's Republic" or "Alash Autonomy").
   
   **Use web search** to research the specified country and gather:
   - Historical context and background (founding date, key events during Russian Civil War)
   - Geographic territories controlled in late 1917/early 1918
   - Military strength and key leaders
   - Diplomatic relationships and alliances
   - Historical flag design and colors (use these to determine the country color)
   - Key historical goals and objectives
   
   **Automatically determine**:
   - Country ID: Create a short identifier from the country name (lowercase, no spaces, e.g., "Kuban People's Republic" → "kuban", "Alash Autonomy" → "alash")
   - Country color: Extract a hex color from the historical flag colors found in research, or choose a color that represents the country (ensure it's distinct from existing countries)
   
   This research will inform the mission tree, initial territories, and narrative elements.

2. **Check existing data**: Read `/home/volga/russian-civil-war-simulator/app/data/gameData.ts` and verify that:
   - The country ID doesn't already exist
   - The color isn't already in use (warn if similar)
   - The types in `/home/volga/russian-civil-war-simulator/app/types/game.ts` allow for the new country
   
   **If the country already exists**, inform the user and STOP. Do not proceed with creating a worktree or making changes.

3. **Create isolated worktree**: Invoke the `/spawn` command with the automatically generated branch name:
   ```
   /spawn add-country-<country-id>
   ```
   For example, if the country ID is "kuban", invoke `/spawn add-country-kuban`.
   
   This will create an isolated git worktree where all changes will be made without affecting the main branch. All subsequent steps will be executed within this new worktree.

4. **Update type definitions** (`app/types/game.ts`):
   - Add the new country ID to the `CountryId` type union
   - Add the new country ID to the `CountryId` type union

5. **Add country definition** to `app/data/gameData.ts`:
   - Add the new country to the `countries` array with the following structure:
     ```typescript
     {
       id: '<country-id>',
       name: '<Country Name>',
       flag: '/images/flags/<country-id>.svg',
       color: '<hex-color>',
       selectable: false,  // NPC countries are not selectable by players
     }
     ```
   - **Important**: Set `selectable: false` to mark this as a non-playable country

6. **Create mission tree** for the new country in `app/data/gameData.ts`:
   - Create an array called `<countryId>Missions: Mission[]`
   - **Use the historical research** to create historically accurate and thematically appropriate missions
   - Include at least 3-5 missions following the pattern of existing missions:
     - Initial mobilization mission (requires hasUnits) - reflect early consolidation
     - Mid-game expansion missions (requires controlRegionCount, combatVictories) - reflect historical goals
     - Victory mission (with gameVictory: true reward) - reflect ultimate objectives
   - Mission names, descriptions, and objectives should be historically grounded
   - Add the missions to the `initialMissions` export at the bottom of the file

7. **Create flag SVG** at `public/images/flags/<country-id>.svg`:
   - **Use the historical research** to find the actual historical flag design
   - If the user provides a flag design, create it
   - If historical flag design is found, recreate it in SVG format
   - Otherwise, create a simple placeholder SVG with the country's color
   - Use a simple design (e.g., solid color with emblem, or tricolor)

8. **Document initial setup**: Based on historical research, create a comment or documentation explaining:
   - Which regions should initially belong to this country at game start (November 20, 1917) based on historical territories
   - Which countries it should be at war with from the beginning based on historical conflicts
   - Suggested starting units and strength for game balance (consider historical military strength)
   
   **Note**: This country will exist from the beginning of the game. Actual initial state configuration must be set in:
   - `app/data/map.ts` - for initial region ownership at game start
   - `app/store/game/initialState.ts` - for starting units, divisions, and relationships

9. **Verify types compile**: Run `npm run build` to ensure TypeScript types are correct

10. **Provide next steps**: Inform the user that:
    - All changes have been made in the isolated worktree `.worktrees/add-country-<country-id>`
    - They should review the changes, test the game, and verify everything works correctly
    - When ready, they can merge the branch into main manually
    - They still need to manually configure:
      - Initial region ownership in `app/data/map.ts`
      - Starting military units in `app/store/game/initialState.ts`
      - Initial diplomatic relationships (wars, access) in initial state
      - AI behavior configuration (if custom AI is needed)

## Important notes:
- **Always use web search** to research the historical country before implementation
- **Uses `/spawn` command** to create an isolated git worktree for safe development
- **Skip worktree creation** if the country already exists in the game
- NPC countries must have `selectable: false` to prevent players from selecting them
- Mission trees should be historically accurate and narratively appropriate based on research
- Colors should be distinct from existing countries for map clarity (consider historical flag colors)
- The country will be controlled by the default CPU player AI
- This is for countries that exist at game start, not countries that emerge during gameplay
- Historical accuracy is important for immersion and educational value
- Changes are made in an isolated worktree for manual review and merging

## Example usage:
```
/add-country Kuban People's Republic
```

This will:
1. Research the Kuban People's Republic during the Russian Civil War
2. Automatically determine country ID as "kuban" and extract appropriate color from historical flag
3. Invoke `/spawn add-country-kuban` to create an isolated worktree
4. Create a new non-playable country with historically accurate details in the worktree
5. Generate historically accurate missions and flag design
6. Provide recommendations for initial territories and military setup
7. Leave the worktree for you to review, test, and manually merge when ready

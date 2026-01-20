---
description: Add a new non-playable country to the game
---

Add a new non-playable country: $ARGUMENTS

The country will be added to the game data with its flag, color, and core territories. You can configure when it appears and its initial state through the game's state configuration files.

## Steps to execute:

1. **Parse input and research**: $ARGUMENTS should contain only the country name (e.g., "Kuban People's Republic" or "Alash Autonomy").
   
   **Use web search** to research the specified country and gather:
   - Historical context and background (founding date, key events during Russian Civil War)
   - Geographic territories controlled during its existence
   - Diplomatic relationships and alliances
   - **Historical flag image**: Search for "flag of [country] 1917-1923", "flag of [country] Wikimedia Commons", or "flag of [country] historical". Look for a reliable source URL (e.g., Wikimedia Commons) that provides the historically accurate flag for the period.
   - Key historical goals and objectives
   
   **Automatically determine**:
   - Country ID: Create a short identifier from the country name (lowercase, no spaces, e.g., "Kuban People's Republic" → "kuban", "Alash Autonomy" → "alash")
   - Country color: Extract a hex color from the found flag image, or choose a color that represents the country (ensure it's distinct from existing countries)
   
   This research will inform initial territories and narrative elements.

2. **Check existing data**: Read `app/data/countries.ts` and verify that:
   - The country ID doesn't already exist
   - The color isn't already in use (warn if similar)
   - The types in `app/types/game.ts` allow for the new country
   
   **If the country already exists**, inform the user and STOP. Do not proceed with creating a worktree or making changes.

3. **Create isolated worktree**: Create a new branch and an isolated git worktree where all changes will be made without affecting the main branch:
   ```bash
   git worktree add -b add-country-<country-id> .worktrees/add-country-<country-id>
   ```
   For example, if the country ID is "kuban", run `git worktree add -b add-country-kuban .worktrees/add-country-kuban`.
   
   This will create an isolated git worktree where all changes will be made without affecting the main branch. All subsequent steps will be executed within this new worktree.

4. **Update type definitions** (`app/types/game.ts`):
   - Add the new country ID to the `CountryId` type union

5. **Add country definition** to `app/data/countries.ts`:
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

6. **Acquire flag image** at `public/images/flags/<country-id>.<ext>`:
   - **Option A (Preferred): Download existing SVG**
     - **Why SVG?** They scale perfectly without pixelation and have very small file sizes.
     - Search for a public domain or Creative Commons SVG file (e.g., from Wikimedia Commons).
     - **Important**: Ensure the URL points to the **raw** `.svg` file content.
     - Use `curl` to download it:
       ```bash
       curl -L -o public/images/flags/<country-id>.svg "<url_to_raw_svg>"
       ```
     - Check the file size and content to ensure it downloaded correctly.
   
   - **Option B: Download PNG/JPG**
     - If no SVG is available, a high-quality PNG or JPG is acceptable.
     - Download it to `public/images/flags/<country-id>.png` (or .jpg).
     - Update the reference in `app/data/countries.ts` to point to the correct file extension.

7. **Add core regions**: Based on historical research, add the country's core regions to `app/data/coreStates.ts`:
   - Add a new entry in the `coreStates` object with the country ID as the key
   - List all region IDs that should be considered core territories for this country
   - Core regions are historically significant territories that the country considers its rightful homeland
   - Example:
     ```typescript
     '<country-id>': ['region-id-1', 'region-id-2', 'region-id-3'],
     ```
   - Use the historical research to determine which regions should be cores based on:
     - Historical territories controlled during the country's existence
     - Ethnic/cultural territories of the country's people
     - Regions with historical claims or strategic importance
   
8. **Document initial setup**: Based on historical research, create a comment or documentation explaining:
   - Which countries it should be at war with based on historical conflicts
   - Suggested starting units and strength for game balance (consider historical military strength)
   - When the country should appear in the game (at start or during gameplay)
   
   **Note**: Actual configuration must be set in:
   - `app/store/game/initialState.ts` - for starting units, divisions, initial region ownership, and relationships (if the country exists at game start)
   - Game event system - if the country should emerge during gameplay based on certain conditions

9. **Verify types compile**: Run `npm run build` to ensure TypeScript types are correct

10. **Provide next steps**: Inform the user that:
    - All changes have been made in the isolated worktree `.worktrees/add-country-<country-id>`
    - They should review the changes, test the game, and verify everything works correctly
    - When ready, they can merge the branch into main manually
    - They still need to manually configure:
      - When the country appears (at game start in `app/store/game/initialState.ts`, or during gameplay via events)
      - Initial region ownership (if at game start)
      - Starting military units (if at game start)
      - Initial diplomatic relationships (wars, access)
      - AI behavior configuration (if custom AI is needed)

## Important notes:
- **Always use web search** to research the historical country before implementation
- **Create a git worktree** to work in an isolated environment for safe development
- **Skip worktree creation** if the country already exists in the game
- **When solving conflicts, do not work on main worktree** - always resolve merge conflicts within the feature worktree, never on main
- NPC countries must have `selectable: false` to prevent players from selecting them
- Colors should be distinct from existing countries for map clarity (consider historical flag colors)
- The country will be controlled by the default CPU player AI
- The command adds the country to game data; you'll configure when it appears (at start or during gameplay) separately
- Historical accuracy is important for immersion and educational value
- Changes are made in an isolated worktree for manual review and merging

## Example usage:
```
/add-country Kuban People's Republic
```

This will:
1. Research the Kuban People's Republic during the Russian Civil War
2. Automatically determine country ID as "kuban" and extract appropriate color from historical flag
3. Create a git worktree `add-country-kuban` for isolated development
4. Create a new non-playable country with historically accurate details in the worktree
5. Download historically accurate flag
6. Add core regions for the country based on historical territories
7. Provide recommendations for initial setup and military configuration
8. Leave the worktree for you to review, test, and manually merge when ready

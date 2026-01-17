---
description: Add a new country that emerges during gameplay based on a scheduled event
---

Add a new event-based country that emerges during gameplay: $ARGUMENTS

**Important**: This command is for adding countries that emerge during gameplay (like the Far Eastern Republic), not for countries that exist at game start. The country will be added to the scheduled events system with a specific emergence date and initial spawn conditions.

## Steps to execute:

1. **Parse input and research**: $ARGUMENTS should contain the country name and optionally the date (e.g., "Far Eastern Republic, 1920-04-06" or just "Far Eastern Republic").
   
   **Parse arguments**:
   - Country name: Extract from $ARGUMENTS (everything before comma if date provided, otherwise entire string)
   - Emergence date: Extract from $ARGUMENTS if provided after comma, otherwise use web research to determine historical founding date
   
   **Use web search** to research the specified country and gather:
   - Historical context and background (exact founding date, circumstances of emergence)
   - Geographic territories controlled at time of founding
   - Predecessor states or regions (what it emerged from)
   - Diplomatic relationships at founding
   - Historical flag design and colors (use these to determine the country color)
   - Key historical goals and circumstances that led to its formation
   
   **Automatically determine**:
   - Country ID: Create a short identifier from the country name (lowercase, no spaces, e.g., "Far Eastern Republic" → "fesrepublic" or "fer", "West Ukrainian People's Republic" → "wukraine")
   - Country color: Extract a hex color from the historical flag colors found in research, or choose a color that represents the country (ensure it's distinct from existing countries)
   - Emergence date: Use the date from $ARGUMENTS if provided, otherwise use the historical founding date from research (format: YYYY-MM-DD)
   
   This research will inform initial territories, spawn conditions, and narrative elements.

2. **Check existing data**: Read `app/data/countries.ts` and verify that:
   - The country ID doesn't already exist
   - The color isn't already in use (warn if similar)
   - The types in `app/types/game.ts` allow for the new country
   
   **If the country already exists**, inform the user and STOP. Do not proceed with creating a worktree or making changes.

3. **Create isolated worktree**: Create a new branch and an isolated git worktree where all changes will be made without affecting the main branch:
   ```bash
   git worktree add -b add-event-country-<country-id> .worktrees/add-event-country-<country-id>
   ```
   For example, if the country ID is "fer", run `git worktree add -b add-event-country-fer .worktrees/add-event-country-fer`.
   
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
       selectable: false,  // Event-based countries are typically NPC
     }
     ```
   - **Important**: Set `selectable: false` for NPC countries (can be changed if it should be playable)

6. **Create flag SVG** at `public/images/flags/<country-id>.svg`:
   - **Use the historical research** to find the actual historical flag design
   - If the user provides a flag design, create it
   - If historical flag design is found, recreate it in SVG format
   - Otherwise, create a simple placeholder SVG with the country's color
   - Use a simple design (e.g., solid color with emblem, or tricolor)

7. **Add scheduled event**: Research the scheduled events system to understand the structure:
   - Read `app/store/game/scheduledEvents.ts` or similar files to find where events are defined
   - Read existing event examples (especially FESREPUBLIC if it exists) to understand the pattern
   
   Add a new scheduled event with:
   - Date: The emergence date determined from research or user input
   - Type: Country emergence event
   - Handler: Function that:
     - Spawns the country in specific regions (determined from historical research)
     - Transfers control of those regions from predecessor state(s)
     - Creates initial military units based on historical context
     - Sets up initial diplomatic relationships (wars, alliances, access)
     - Triggers notification/announcement to player
   
   Example structure:
   ```typescript
   {
     date: '<YYYY-MM-DD>',
     type: 'COUNTRY_EMERGENCE',
     countryId: '<country-id>',
     handler: (state) => {
       // Spawn country in regions
       // Set up initial units
       // Configure diplomacy
       // Add notification
     }
   }
   ```

8. **Document emergence details**: Based on historical research, create comments explaining:
   - Which regions the country should spawn in (based on historical territories at founding)
   - Which predecessor state(s) lose control of those regions
   - Starting military strength (units and divisions)
   - Initial diplomatic state (wars, alliances, military access)
   - Historical narrative for the event announcement
   - Trigger conditions if any (beyond just the date)

9. **Verify types compile**: Run `npm run build` to ensure TypeScript types are correct

10. **Test event execution**: 
    - Start the dev server
    - Use browser automation to advance game time to the event date
    - Verify the country spawns correctly
    - Check that regions transfer properly
    - Confirm notifications appear

11. **Provide next steps**: Inform the user that:
     - All changes have been made in the isolated worktree `.worktrees/add-event-country-<country-id>`
     - They should review the changes, test the game, and verify the emergence works correctly
     - When ready, they can merge the branch into main manually
     - They may need to fine-tune:
       - Spawn region selection and territory logic
       - Starting military units for game balance
       - Diplomatic relationship configuration
       - Event narrative and announcement text
       - AI behavior configuration (if custom AI is needed)

## Important notes:
- **Always use web search** to research the historical country and its founding circumstances
- **Create a git worktree** to work in an isolated environment for safe development
- **Skip worktree creation** if the country already exists in the game
- Event-based countries should NOT exist in the initial game state
- The emergence date should be historically accurate for immersion
- Consider predecessor states when determining spawn regions
- Ensure the event handler properly transfers control from predecessor(s)
- Test the event by advancing game time to verify proper spawning
- Colors should be distinct from existing countries for map clarity
- Historical accuracy is important for immersion and educational value
- Changes are made in an isolated worktree for manual review and merging

## Example usage:
```
/add-event-country Far Eastern Republic, 1920-04-06
```

This will:
1. Research the Far Eastern Republic and its founding on April 6, 1920
2. Automatically determine country ID (e.g., "fer") and extract color from historical flag
3. Create a git worktree `add-event-country-fer` for isolated development
4. Create a new event-based country with historically accurate details
5. Generate historically accurate flag design
6. Add scheduled event for April 6, 1920 that spawns the country
7. Configure spawn regions, initial units, and diplomatic relationships
8. Test the event execution
9. Leave the worktree for you to review, test, and manually merge when ready

## Another example (date inferred from research):
```
/add-event-country West Ukrainian People's Republic
```

This will research and find the historical founding date automatically, then proceed with the same steps as above.

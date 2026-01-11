# AI Agent Instructions

This document provides instructions for AI agents interacting with the Russian Civil War Simulator.

## Game API

The game exposes a `window.gameAPI` object for programmatic control. This is useful for AI agents using browser automation tools like Playwright MCP.

### Reading the API Interface

The full `GameAPI` interface is defined in [`app/types/game.ts`](./app/types/game.ts). Always read this file to get the current list of available methods and their signatures.

### Using the API with Playwright MCP

When automating this game with Playwright MCP, use `browser_evaluate` to interact with the game API:

```javascript
// Example: Select units and move them
await browser_evaluate({
  function: `() => {
    // Select units in a region
    window.gameAPI.selectUnits("RU-MOW");
    
    // Get adjacent regions to find valid move targets
    const adjacent = window.gameAPI.getAdjacentRegions("RU-MOW");
    
    // Move units to the first adjacent region
    if (adjacent.length > 0) {
      window.gameAPI.moveSelectedUnits(adjacent[0]);
    }
  }`
});
```

### Available Methods

| Method | Description |
|--------|-------------|
| `selectRegion(regionId)` | Select a region on the map |
| `getSelectedRegion()` | Get the currently selected region ID |
| `getRegions()` | Get all regions and their state |
| `selectUnits(regionId)` | Select units in a region for movement |
| `getSelectedUnitRegion()` | Get the region with selected units |
| `moveSelectedUnits(toRegionId, count?)` | Move selected units to an adjacent region |
| `getAdjacentRegions(regionId)` | Get list of adjacent region IDs |
| `getMovingUnits()` | Get all in-transit unit movements |

### Workflow for Moving Units

1. Call `getRegions()` to understand the current game state
2. Find a region you control with units
3. Call `selectUnits(regionId)` to select those units
4. Call `getAdjacentRegions(regionId)` to find valid destinations
5. Call `moveSelectedUnits(targetRegionId, count)` to execute the move
6. Optionally call `getMovingUnits()` to track in-transit units

### Error Handling

All API methods log warnings to the console when operations fail. Use `browser_console_messages` to check for any errors after API calls.

## Development Server

When starting a dev server, use `$RANDOM` for the PORT number to avoid port conflicts with other worktrees or parallel sessions:

```bash
PORT=$RANDOM npm run dev
```

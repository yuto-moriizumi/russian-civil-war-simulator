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
  }`,
});
```

### Available Methods

| Method                                  | Description                               |
| --------------------------------------- | ----------------------------------------- |
| `selectRegion(regionId)`                | Select a region on the map                |
| `getSelectedRegion()`                   | Get the currently selected region ID      |
| `getRegions()`                          | Get all regions and their state           |
| `selectUnits(regionId)`                 | Select units in a region for movement     |
| `getSelectedUnitRegion()`               | Get the region with selected units        |
| `moveSelectedUnits(toRegionId, count?)` | Move selected units to an adjacent region |
| `getAdjacentRegions(regionId)`          | Get list of adjacent region IDs           |
| `getMovingUnits()`                      | Get all in-transit unit movements         |

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

When starting a dev server, use a specific port range and echo it so you can capture the value. Use the following pattern to ensure observability and readiness:

```bash
# Pick a port, echo it for visibility, and start in background
PORT=$((3000 + RANDOM % 1000)); echo "STARTING_PORT=$PORT"; PORT=$PORT npm run dev &
```

## Process Management

**Do NOT use `pkill -f node` or similar broad kill commands.** This can terminate unrelated Node.js processes running on the system, including other development servers or tools.

Instead, to stop a development server, use the port number you identified:

```bash
# Safely kill only the process on your specific port
kill $(lsof -t -i :$PORT)
```

Other options:

- Use `Ctrl+C` if the process is in the foreground
- Use `kill <pid>` if you have the specific process ID

## Code Organization

### File Length Guidelines

- TypeScript files should not exceed **400 lines**
- If a file grows beyond this limit, consider refactoring by:
  - Extracting related functions into separate modules
  - Splitting large components into smaller, focused components
  - Moving utility functions to dedicated utility files
  - Separating types/interfaces into their own type definition files

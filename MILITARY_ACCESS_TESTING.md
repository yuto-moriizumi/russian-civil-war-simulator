# Military Access & War State System - Testing Guide

## Overview
This document provides guidance on testing the newly implemented military access and war state system.

## Features Implemented

### 1. Relationship Types
- **Neutral**: Default state. No troop movement allowed between countries.
- **Military Access**: Countries can move troops through each other's territory without triggering combat or occupation.
- **War**: Countries can move troops and engage in combat/occupation.

### 2. Game Mechanics

#### Movement Validation
- Players cannot move units to another country's territory unless:
  - That country has granted them **Military Access**, or
  - That country has declared **War** on them

#### Region Occupation
- **Military Access**: Units can move but region ownership doesn't change
- **War State**: Units can attack and occupy regions (existing combat mechanics apply)
- **Neutral**: No movement permitted

### 3. UI Components

#### Relationships Panel
- Accessible via "Relations" button in the top bar
- Shows all other countries and their relationship status
- Displays:
  - What access they grant you (read-only)
  - What access you grant them (editable dropdown)
  - Helpful descriptions of each relationship type

### 4. API Methods

The system exposes the following methods via `window.gameAPI`:

```javascript
// Get all relationships
window.gameAPI.getRelationships()

// Set relationship (you granting access to another country)
window.gameAPI.setRelationship(fromCountry, toCountry, type)
// Example: window.gameAPI.setRelationship('soviet', 'white', 'war')

// Get relationship status between two countries
window.gameAPI.getRelationship(fromCountry, toCountry)
// Returns: 'neutral' | 'military_access' | 'war'
```

## Testing Scenarios

### Scenario 1: Neutral State (Default)
1. Start a new game as Soviet Russia
2. Try to move units to White Army territory
3. **Expected**: Movement is blocked (console warning appears)

### Scenario 2: Military Access
1. Open the Relations panel (click "Relations" button)
2. Set White Army to "Military Access"
3. Have White Army grant you Military Access (simulated via API or save editing)
4. Move units to White Army territory
5. **Expected**: 
   - Units move successfully
   - No combat occurs
   - Region remains under White Army control
   - Units of both countries coexist in the region

### Scenario 3: War State
1. Open the Relations panel
2. Set White Army to "War"
3. Have White Army declare War on you (simulated via API)
4. Move units to White Army territory
5. **Expected**:
   - Units move successfully
   - Combat initiates if defenders are present
   - Region can be captured if attackers win
   - Occupation occurs if no defenders

### Scenario 4: API Testing

Using browser console:

```javascript
// Set Soviet to grant Finland military access
window.gameAPI.setRelationship('soviet', 'finland', 'military_access')

// Declare war on White Army
window.gameAPI.setRelationship('soviet', 'white', 'war')

// Check current relationship
window.gameAPI.getRelationship('soviet', 'white')

// View all relationships
window.gameAPI.getRelationships()
```

## Known Limitations

1. **Asymmetric Relationships**: Relationships are directional. If Soviet grants Finland military access, Finland can move through Soviet territory, but not vice versa unless Finland also grants access.

2. **AI Behavior**: The AI does not yet actively manage relationships. This will need to be implemented in future updates.

3. **Neutral & Foreign Countries**: The system currently focuses on player-controllable countries (soviet, white, finland). Neutral and Foreign countries use existing logic.

## Files Modified

### Core Types
- `app/types/game.ts` - Added Relationship types and GameAPI methods

### State Management
- `app/store/game/initialState.ts` - Initialize relationships array
- `app/store/game/types.ts` - Add relationship actions to store
- `app/store/game/relationshipActions.ts` - New file for relationship management
- `app/store/useGameStore.ts` - Integrate relationship actions

### Game Logic
- `app/store/game/unitActions.ts` - Validate relationships before movement
- `app/store/game/tickActions.ts` - Pass relationships to movement processing
- `app/store/game/tickHelpers/movementApplication.ts` - Handle military access vs war logic

### UI Components
- `app/components/RelationshipsPanel.tsx` - New panel for managing relationships
- `app/components/TopBar.tsx` - Add Relations button
- `app/screens/MainScreen.tsx` - Integrate relationships panel
- `app/page.tsx` - Pass relationships props

### Persistence
- `app/utils/saveLoad.ts` - Save/load relationships with game state

### API
- `app/hooks/useGameAPI.ts` - Expose relationship methods to window.gameAPI

## Future Enhancements

1. **AI Relationship Management**: Implement AI logic for declaring war and granting access
2. **Diplomatic Events**: Add events for relationship changes (war declarations, peace treaties)
3. **Conditional Relationships**: Time-based or mission-based relationship requirements
4. **Alliance System**: Multi-country alliances with shared military access
5. **Peace Treaties**: Ability to end war state and transition back to neutral
6. **Historical Accuracy**: Pre-configure historical relationships based on the time period

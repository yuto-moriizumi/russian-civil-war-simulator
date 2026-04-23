# Simulation Engine Refactor Plan

## Objective

Move game progression out of Zustand actions and into a pure simulation engine.

The main target is `tick()` in [app/store/game/tickActions.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/tickActions.ts:41), but the refactor should also reduce gameplay logic embedded in store actions such as:

- [app/store/game/unitActions.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/unitActions.ts:29)
- [app/store/game/armyGroupActions.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/armyGroupActions.ts:1)
- [app/store/game/basicActions.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/basicActions.ts:110)

The end state is:

- domain logic is pure and testable without Zustand
- Zustand becomes an adapter for UI state, persistence, and command dispatch
- game progression can later run in a Web Worker or headless environment

## Why This Matters

The current architecture already has good pure-function coverage in `tickHelpers`, `utils`, and tests, but orchestration still lives inside the store layer. That creates a few problems:

- the store is both state container and domain engine
- tick orchestration is hard to reason about because state mutation and domain transitions are interleaved
- replay, deterministic simulation, and worker execution are harder than they need to be
- changes to simulation rules risk accidental coupling with UI or persistence concerns

## Current State

Current flow:

1. UI calls Zustand action.
2. Zustand action reads combined store state.
3. Action orchestrates domain helpers directly.
4. Action rebuilds patches and writes them back into the store.

This is most visible in:

- `createTickActions().tick()`
- `moveUnits()`
- `selectCountry()`
- `claimMission()`

Pure logic already exists in many places:

- movement processing
- combat processing
- production processing
- scheduled event processing
- mission completion
- pathfinding
- diplomacy helpers

This means the refactor should be evolutionary, not a rewrite.

## Target Architecture

### Layers

1. `domain/game`
   Contains pure state transitions and domain rules.

2. `application/game`
   Contains command handlers and orchestration that call domain functions.

3. `store`
   Contains Zustand wiring, persistence, and UI-facing actions only.

4. `ui`
   Calls application commands through the store adapter.

### Core Shape

Introduce a pure engine API with a shape like:

```ts
type SimulationDeps = {
  countries: Country[];
  gameConfig: typeof GAME_CONFIG;
  now?: () => number;
  logger?: SimulationLogger;
};

type SimulationResult = {
  state: SimulationState;
  events: DomainEvent[];
  diagnostics?: SimulationDiagnostics;
};

function advanceSimulation(
  state: SimulationState,
  deps: SimulationDeps
): SimulationResult;
```

For player-issued actions, use pure command reducers:

```ts
function applyGameCommand(
  state: SimulationState,
  command: GameCommand,
  deps: SimulationDeps
): SimulationResult;
```

## State Boundaries

### Keep In Simulation State

- `dateTime`
- `selectedCountry` only if gameplay rules require it
- `regionOwners`
- `divisions`
- `movingUnits`
- `activeCombats`
- `armyGroups`
- `theaters`
- `productionQueues`
- `relationships`
- `missions`
- `scheduledEvents`
- `countryBonuses`
- `aiStates`
- `gameEvents`
- `notifications`
- map runtime data required by rules:
  - `regionDefinitions`
  - `adjacency`
  - `regionCentroids`
  - `borderMidpoints`

### Keep Out Of Simulation State

- `selectedRegion`
- `selectedUnitRegion`
- `selectedDivisionIds`
- `selectedCombatId`
- `selectedMovementId`
- `selectedGroupId`
- `selectedTheaterId`
- modal visibility flags
- screen navigation state

Those belong to UI/application layers, not the domain engine.

## Proposed Directory Layout

```text
app/
  domain/
    game/
      engine/
        advanceSimulation.ts
        applyGameCommand.ts
        types.ts
        diagnostics.ts
      commands/
        moveUnits.ts
        selectCountry.ts
        claimMission.ts
      reducers/
        movement.ts
        combat.ts
        production.ts
        ai.ts
        theaters.ts
        missions.ts
        scheduledEvents.ts
      selectors/
        regionState.ts
        commandPower.ts
  store/
    adapters/
      simulationStoreAdapter.ts
```

Exact names can change, but the important part is that domain code no longer depends on Zustand.

## Migration Strategy

### Phase 0: Stabilize Boundaries

Goal:
Define the seam before moving code.

Tasks:

- define `SimulationState` for the engine, separate from `GameStore`
- define `GameCommand` union for player-triggered actions
- define `SimulationDeps`
- define `SimulationResult`
- document which fields are canonical and which are derived

Exit criteria:

- engine types exist
- no runtime behavior changes yet

### Phase 1: Extract Pure Tick Engine

Goal:
Replace the body of Zustand `tick()` with a pure function call.

Tasks:

- create `advanceSimulation(state, deps)`
- move orchestration from `tickActions.ts` into the engine module
- keep existing `tickHelpers` as implementation details where useful
- make `tickActions.ts` a thin adapter:
  - read current simulation slice
  - call `advanceSimulation`
  - write returned state back

Notes:

- preserve current behavior exactly
- keep diagnostics and duplicate checks, but pass them through injected logger/diagnostic hooks instead of raw `console.*`

Exit criteria:

- `tickActions.ts` mostly delegates
- existing tick tests still pass unchanged

### Phase 2: Convert Player Actions Into Commands

Goal:
Move gameplay mutations out of store actions.

Initial command candidates:

- `MOVE_UNITS`
- `REDIRECT_MOVEMENT`
- `CANCEL_MOVEMENT`
- `CLAIM_MISSION`
- `SET_RELATIONSHIP`
- `ADD_TO_PRODUCTION_QUEUE`
- `CANCEL_PRODUCTION`
- `CREATE_ARMY_GROUP`
- `DELETE_ARMY_GROUP`
- `RENAME_ARMY_GROUP`
- `ASSIGN_THEATER_TO_GROUP`
- `SET_ARMY_GROUP_MODE`
- `DEPLOY_TO_ARMY_GROUP`

Tasks:

- extract pure reducers for each command
- make store actions build a command and dispatch it to `applyGameCommand`
- keep UI-selection side effects in the store adapter, not in domain reducers

Exit criteria:

- store actions become thin wrappers
- command reducers are directly unit tested

### Phase 3: Separate Derived State

Goal:
Reduce duplicated patch logic and remove manual consistency work.

Current high-friction area:

- `regions` is treated as derived from `regionDefinitions + regionOwners`, but many actions manually rebuild it

Tasks:

- define canonical simulation fields
- move `buildRegionUpdate` usage behind a single derivation boundary
- prefer selectors or explicit post-processing over ad hoc rebuilds in many files

Exit criteria:

- region derivation happens in one place
- fewer partial patch merges depend on remembering `buildRegionUpdate(...)`

### Phase 4: Introduce Application Service Layer

Goal:
Give UI a stable surface that is not the raw domain engine and not the raw store.

Tasks:

- add an application service that exposes:
  - `dispatch(command)`
  - `tick()`
  - `loadScenario(...)`
  - `rehydrate(...)`
- keep persistence and browser integration there
- keep `window.gameAPI` backed by application services rather than by a snapshot of merged store state

Exit criteria:

- UI no longer needs to know how domain state is patched
- browser automation API becomes more stable

### Phase 5: Prepare For Worker Execution

Goal:
Make the engine portable.

Tasks:

- remove browser-only assumptions from the engine
- make dependencies serializable or injectable
- ensure deterministic behavior where possible
- define message protocol for worker-based tick execution

Exit criteria:

- engine can run in main thread or worker with the same interface

## Testing Plan

### Keep

- existing unit tests under `app/__tests__`

### Add

1. golden tests for `advanceSimulation`
   Compare before/after snapshots for representative scenarios.

2. command reducer tests
   One file per major command family.

3. parity tests
   Assert that old store-backed behavior and new engine behavior match during migration.

4. invariant tests
   Examples:
   - no division exists in two places
   - completed combats do not retain active movement links
   - `regionOwners` and derived region data stay consistent

### Optional

- property-style tests around movement/combat invariants

## Logging And Diagnostics

Current simulation code uses `console.log`, `console.warn`, and `console.error` directly in domain paths.

Refactor target:

- domain code emits diagnostics through injected logger hooks or structured diagnostics
- store/application layer decides whether to print, persist, or ignore them

This avoids coupling simulation rules to browser console behavior.

## Risks

### Risk 1: Behavioral drift during extraction

Mitigation:

- preserve helpers first, move orchestration second
- add parity tests before larger rewrites

### Risk 2: Over-abstracting too early

Mitigation:

- start with `tick()` only
- do not invent a generic event-sourcing system unless the code proves it is needed

### Risk 3: Store/UI breakage from moving side effects

Mitigation:

- keep UI state in Zustand
- move only gameplay mutations at first

### Risk 4: Performance regressions

Mitigation:

- keep `TickPerf`-style instrumentation, but route it through engine diagnostics
- benchmark before and after Phase 1

## Concrete First PR Plan

PR 1:

- add engine types
- add `advanceSimulation(...)`
- make `tickActions.ts` delegate to it
- preserve behavior and tests

PR 2:

- extract `moveUnits` and movement redirects into commands
- add direct reducer tests

PR 3:

- extract mission claim and production queue commands
- centralize domain event emission

PR 4:

- centralize region derivation
- reduce `buildRegionUpdate(...)` call sites

PR 5:

- add application service layer
- migrate `window.gameAPI`

## Definition Of Done

This refactor is done when:

- gameplay progression can run without Zustand
- `tick()` in the store is a thin adapter
- major gameplay actions are command dispatchers, not handwritten state mutation blocks
- domain code no longer imports Zustand types
- simulation tests run directly against engine functions
- UI state remains in the UI/store layer

## Recommended Scope Control

Do not combine this refactor with:

- UI redesign
- map tool refactors
- persistence format redesign
- scenario/data model rewrite

Those can come later. The first success criterion is a clean engine boundary.

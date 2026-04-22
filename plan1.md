# Plan 1: Game State と UI State の分離

## 目的

`GameStore` が純粋なゲーム状態、UI 選択状態、map runtime 状態、永続化状態をまとめて保持しているため、機能追加時に永続化漏れ、UI state の混入、tick 処理の副作用が起きやすい。状態の責務を分け、tick や save/load が扱う対象を明確にする。

## 現状の観察

- `app/store/game/types.ts` の `GameStore` は `GameState` を継承しつつ、`selectedRegion`, `selectedCombatId`, modal/sidebar state, `mapDataLoaded`, `adjacency` などを同居させている。
- `app/store/useGameStore.ts` の `partialize` は永続化対象を手で列挙している。
- `onRehydrateStorage` は Date 復元、mission merge、division 再構築、screen reset まで担当している。

## 目標設計

以下の型境界を導入する。

```ts
interface SimulationState {
  selectedCountry: Country | null;
  dateTime: Date;
  isPlaying: boolean;
  gameSpeed: GameSpeed;
  divisions: DivisionState;
  missions: Mission[];
  movingUnits: Movement[];
  activeCombats: ActiveCombat[];
  theaters: Theater[];
  armyGroups: ArmyGroup[];
  productionQueues: Record<CountryId, ProductionQueueItem[]>;
  relationships: Relationship[];
  scheduledEvents: ScheduledEvent[];
  countryBonuses: Record<CountryId, CountryBonuses>;
  aiStates: AIState[];
}

interface GameUiState {
  currentScreen: Screen;
  selectedRegion: string | null;
  selectedUnitRegion: string | null;
  selectedDivisionIds: string[];
  selectedCombatId: string | null;
  selectedMovementId: string | null;
  selectedGroupId: string | null;
  selectedTheaterId: string | null;
  isProductionModalOpen: boolean;
  selectedCountryId: CountryId | null;
  isCountrySidebarOpen: boolean;
  isSwitchModeActive: boolean;
  mapMode: MapMode;
}

interface MapRuntimeState {
  regions: RegionState;
  adjacency: Adjacency;
  mapDataLoaded: boolean;
  regionCentroids: Record<string, [number, number]>;
  borderMidpoints: Record<string, [number, number]>;
}
```

## 実装手順

1. `app/store/game/stateTypes.ts` を追加し、`SimulationState`, `GameUiState`, `MapRuntimeState`, `PersistedGameState` を定義する。
2. `GameState` の名前を維持する必要があれば、移行期間だけ `type GameState = SimulationState & Pick<GameUiState, ...>` の互換型を置く。
3. `initialGameState` を `initialSimulationState`, `initialGameUiState`, `initialMapRuntimeState` に分割する。
4. `GameStore` を `SimulationState & GameUiState & MapRuntimeState & Actions` として再構成する。
5. `partialize` を `toPersistedGameState(state)` という関数に切り出す。
6. `onRehydrateStorage` の Date 復元を `rehydratePersistedGameState(raw)` に切り出す。
7. `startNewGame`, `selectCountry`, `loadGame` がどの state slice をリセットし、どの slice を保持するかを明示する。

## テスト方針

- 既存の `app/__tests__/newGame.test.ts`, `countrySwitch.test.ts`, `playerAI.test.ts` を先に通す。
- `rehydratePersistedGameState` の単体テストを追加する。
- `startNewGame` が map runtime state を保持し、simulation state を初期化することをテストする。

## 移行時の注意

- 一度に store を複数 store に分ける必要はない。まず型と helper 関数だけ分ける。
- persisted key の互換性を壊さない。必要なら `saveVersion` を導入する。
- `currentScreen` は UI state として扱うが、save 復元後に title に戻す既存挙動は維持する。

## 完了条件

- `GameStore` の状態項目が `SimulationState`, `GameUiState`, `MapRuntimeState` のどれに属するか明確になっている。
- `partialize` と rehydrate 処理が独立した関数としてテスト可能になっている。
- `npm test` と `npm run typecheck` が通る。

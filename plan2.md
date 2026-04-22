# Plan 2: tick 処理を純粋な Simulation Engine に寄せる

## 目的

`tick` はゲームの中心処理だが、現在は Zustand の `get/set`、中間 state、AI action、mission check、通知生成、performance 計測が混在している。tick を純粋関数に近づけ、順序依存バグを減らす。

## 現状の観察

- `app/store/game/tickActions.ts` は処理段階がコメントで整理されている。
- ただし tick 中に一度 `set()` してから army group automatic action を実行している。
- mission completion など一部処理は `get()` を直接渡しており、tick の入力と出力が見えにくい。
- `TickPerf` と duplicate detection が tick の主処理に直接埋め込まれている。

## 目標設計

`tickActions.ts` を Zustand adapter にし、実処理を次のような engine に移す。

```ts
interface TickInput {
  state: SimulationState;
  map: MapRuntimeState;
  ui: Pick<GameUiState, 'selectedCountry' | 'isPlayerAIEnabled'>;
}

interface TickResult {
  simulation: SimulationState;
  effects: GameEffect[];
  diagnostics: TickDiagnostic[];
}

export function advanceGameOneHour(input: TickInput): TickResult;
```

Zustand action は以下だけを担当する。

1. 現在 state を `TickInput` に変換する。
2. `advanceGameOneHour` を呼ぶ。
3. 結果を `set()` する。
4. effects を notification/event/UI へ反映する。

## 実装手順

1. `app/store/game/tickEngine.ts` を追加し、現行 tick の Step 1 から Step 9 までを移す。
2. `TickWorkingState` 型を作り、`nextRegions`, `nextDivisions`, `nextMovingUnits` のような一時変数を構造化する。
3. production, scheduled events, movement, combat, HP regen, AI, army group sync を `runTickPhase` で順に実行する。
4. `TickPerf` は `runTickPhase(name, fn)` の外側で呼ぶ形にする。
5. duplicate detection は `diagnostics` として返し、console 出力は adapter 側に寄せる。
6. army group automatic action の `attackArmyGroup` / `defendArmyGroup` を `set` patch 方式ではなく、`WorkingState -> WorkingState` の関数に寄せる。
7. mission completion / AI mission claim も `get()` 非依存の関数に寄せる。

## テスト方針

- 既存の `tickActions.test.ts`, `attack.test.ts`, `defend.test.ts`, `movementApplication.test.ts`, `combat.test.ts` を基準にする。
- `advanceGameOneHour` の単体テストを追加する。
- 以下を明示的にテストする。
  - production completion と notification generation
  - scheduled event 後の AI state 初期化
  - movement/combat/retreat/new hop の順序
  - army group auto mode が tick 内で一貫した state を見ること

## 移行時の注意

- 最初の PR では動作を変えない。関数移動と入出力整理だけにする。
- `Date.now()` と `Math.random()` は deterministic test の妨げになるため、将来的には `IdGenerator` / `Clock` を注入できる形にする。
- 既存ログは一旦維持し、engine 化後に diagnostics へ移す。

## 完了条件

- `tickActions.ts` は 100 行前後の adapter になっている。
- tick の主要状態遷移は `advanceGameOneHour` で単体テストできる。
- tick 中の `set()` は最後の一回を基本にできている。
- `npm test` と `npm run typecheck` が通る。

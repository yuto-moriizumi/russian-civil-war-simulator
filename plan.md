# 実装計画

## 改善2: マジックナンバーの定数集約

### 概要
ゲーム速度・戦闘インターバル・生産時間などの数値が複数ファイルに散在している問題を解消する。

### 作業内容
1. `app/constants/gameConfig.ts` を新規作成し、以下を定義する
   ```typescript
   export const GAME_CONFIG = {
     SPEEDS: { NORMAL: 1, FAST: 2, VERY_FAST: 8, ULTRA: 32, MAX: 1000 } as const,
     COMBAT: { ROUND_INTERVAL_HOURS: 6, SIEGE_INTERVAL_HOURS: 12 },
     PRODUCTION: { BASE_HOURS: 24 },
     HP: { REGEN_PER_HOUR: 0.5, MAX: 100 },
   } as const
   ```
2. 各ファイルのマジックナンバーを `GAME_CONFIG` の参照に置き換える

### 対象ファイル（調査が必要）
- `store/game/tickActions.ts`
- `store/game/tickHelpers/combatProcessing.ts`
- `store/game/productionActions.ts`
- `hooks/useGameLoop.ts`
- `components/` 内の速度関連コンポーネント

---

## 改善3: Zustand Immer middleware の導入

### 概要
深くネストされた状態更新で手動スプレッドを多用している箇所を、Immer によるミューテーション形式に置き換える。

### 作業内容
1. `immer` パッケージを追加する（`@zustand/middleware` に含まれる `immer` ミドルウェアを使用）
   ```
   npm install immer
   ```
2. `store/useGameStore.ts` の `create()` に `immer` ミドルウェアを適用する
   ```typescript
   import { immer } from 'zustand/middleware/immer'

   const useGameStore = create<GameStore>()(
     persist(
       immer((set, get) => ({
         ...
       })),
       { ... }
     )
   )
   ```
3. 各アクションの `set(state => ({ ...state.x, ... }))` を `set(draft => { draft.x = ... })` に書き換える
   - 優先度の高い対象: `unitActions.ts`、`armyGroupActions.ts`、`productionActions.ts`

### 注意事項
- Zustand の `persist` + `immer` を組み合わせる場合、ミドルウェアの適用順序が重要（`persist` が外側）
- `partialize` に渡す関数は Immer Draft 型を意識する必要がある

---

## 改善5: AI状態の遅延初期化を廃止

### 概要
`discoverNewAIStates()` によって AI 状態がゲーム途中から初期化される問題を解消し、ゲーム開始時に全 CPU 国の AI 状態を生成する。

### 作業内容
1. `store/game/tickHelpers/aiTick.ts`（または AI 状態管理箇所）を調査し、`discoverNewAIStates` の実装を確認する
2. ゲーム開始アクション（`startGame` 相当）内で、全 CPU 国の初期 AI 状態を生成するよう変更する
   ```typescript
   const initializeAIStates = (allCountries: CountryId[], playerCountry: CountryId): AIStateMap =>
     Object.fromEntries(
       allCountries
         .filter(id => id !== playerCountry)
         .map(id => [id, createInitialAIState(id)])
     )
   ```
3. `discoverNewAIStates()` の呼び出しを削除し、初期化済みの状態を参照するように変更する
4. テストを実行して AI の動作が変わらないことを確認する

### 対象ファイル（調査が必要）
- `ai/cpuPlayer.ts`
- `store/game/tickHelpers/aiTick.ts`
- `store/useGameStore.ts`（初期状態の定義箇所）

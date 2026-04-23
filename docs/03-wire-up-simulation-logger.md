# 3. Wire Up SimulationLogger in Domain Layer

## 問題

ドメイン層（`app/domain/game/`）の関数は本来pureであるべきだが、複数の箇所で `console.*` を直接呼び出しており、副作用を持っている。

`SimulationLogger` インターフェースは既に `domain/game/engine/types.ts` に定義されているが、使用されていない。

```typescript
export interface SimulationLogger {
  debug: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}
```

### console.* 呼び出し箇所

| ファイル | 行 | 呼び出し |
|---|---|---|
| `engine/advanceSimulation.ts` | 36 | `console.error('[DUPLICATE]')` |
| `engine/advanceSimulation.ts` | 72 | `console.error('[DUPLICATE]')` |
| `tickHelpers/movementApplication.ts` | — | `console.warn`, `console.error` |
| `tickHelpers/combatProcessing.ts` | — | `console.warn` |
| `tickHelpers/movementProcessing.ts` | — | `console.warn` |
| `tickHelpers/duplicateDetection.ts` | — | `console.error` (logDivisionDuplicates) |
| `tickHelpers/missionHelpers.ts` | — | `console.warn` |
| `armyGroupAttack.ts` | — | `console.warn` |
| `armyGroupDefend.ts` | — | `console.warn` |

## 解決案

`advanceSimulation` のシグネチャに `logger: SimulationLogger` を追加し、呼び出し元が `console` をラップしたロガーを渡す方式にする。

### ドメイン層の変更

```typescript
// advanceSimulation.ts
export function advanceSimulation(
  state: EngineSimulationState,
  deps: SimulationDeps,
  logger: SimulationLogger = console, // デフォルトで後方互換
): SimulationResult {
```

ドメイン層内のすべての `console.*` 呼び出しを `logger.*` に置換。

`SimulationLogger` は `advanceSimulation` が持つサブコンポーネントに伝播させる。伝播方法:
- `checkDuplicates` 関数に `logger` を渡す
- `logDivisionDuplicates` に `logger` を渡す
- tickHelpersの各関数はロガーを受け取るか、上位から渡されたコンテキストで動作する

### 呼び出し側の変更

`store/game/tickActions.ts`:

```typescript
const logger = {
  debug: (...a) => console.debug(...a),
  warn: (...a) => console.warn(...a),
  error: (...a) => console.error(...a),
};
const { state: next } = advanceSimulation(engineState, { countries, gameConfig: GAME_CONFIG }, logger);
```

テストでは `SimulationLogger` のモックを渡し、ログ出力をアサート可能にする。

## 手順

1. `SimulationLogger` に `noOpLogger()` ファクトリ関数を追加
2. `advanceSimulation` に `logger` パラメータを追加（デフォルト値付き）
3. ドメイン層内の `console.*` 呼び出しを `logger.*` に置換
4. サブ関数に `logger` を伝播
5. `tickActions.ts` で `console` ラッパーロガーを渡す
6. テストで `noOpLogger()` またはモックロガーを使用
7. `npm test` で全テストが通ることを確認

## リスク

中〜高。`console.*` が関数シグネチャの奥深くに散らばっているため、loggerの伝播パスを設計する必要がある。パラメータ追加が複数の関数に波及する。

ただし、デフォルト引数 `= console` を設定すれば後方互換性は保てるため、段階的な適用が可能。

## 期待される効果

- ドメイン層がpureになり、テストが容易に
- ログ出力の制御（無効化、キャプチャ、構造化）が可能に
- 将来のサーバーサイド実行やマルチインスタンス対応の基盤になる

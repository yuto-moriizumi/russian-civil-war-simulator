# 提案: `advanceSimulation` のパイプライン化

## 優先度: 高

## 現状

`app/domain/game/engine/advanceSimulation.ts` の `advanceSimulation()` 関数が1関数内で11ステップの処理を順次実行している（365行）。

処理ステップ:
1. divisionのバリデーション
2. 生産キューの処理
3. 予定イベントの処理
4. 移動の処理
5. mid-transit戦闘の処理
6. 戦闘の処理
7. 移動・戦闘結果の適用
8. HP回復
9. AI処理（AIティク＋軍集団同期）
10. 軍集団同期
11. 軍集団モードアクション
12. ミッション処理

各ステップ間で `nextRegions`, `nextDivisions`, `nextMovingUnits` などの命名で状態を受け渡している。

## 問題点

1. **単一関数の責務過多**: 1つの関数がゲームの全ロジックを処理している。変更・テストが困難。
2. **状態の追跡困難**: `regionsAfterProduction`, `regionsAfterEvents`, `nextRegions` などの類似変数が乱立し、どの時点のスナップショットか把握しにくい。
3. **チェックポイントの散在**: `checkDuplicates()` が3箇所に直接埋め込まれている。
4. **テストの単位が大きい**: パイプラインの特定のステップだけをテストしたい場合、関数全体を通す必要がある。
5. **`detectAndUpdateTheaters` の分離**: `tickActions.ts` でエンジンの外側で呼ばれており、エンジンの純粋性が崩れている。

## 提案

### ステップ1: パイプライン構造の導入

各ステップを `SimulationStep = (state: EngineSimulationState, deps: SimulationDeps) => EngineSimulationState` の型の純関数として統一する。

```typescript
type SimulationStep = (
  state: EngineSimulationState,
  deps: SimulationDeps,
  logger: SimulationLogger
) => EngineSimulationState;

const simulationPipeline: SimulationStep[] = [
  validateDivisionsStep,
  processProductionQueueStep,
  processScheduledEventsStep,
  processMovementsStep,
  processMidTransitCombatsStep,
  processCombatsStep,
  applyMovementsAndCombatsStep,
  regenerateHPStep,
  processAIStep,
  syncArmyGroupsStep,
  applyArmyGroupActionsStep,
  applyMissionsStep,
];
```

### ステップ2: 共通の中間結果型

```typescript
interface SimulationContext {
  state: EngineSimulationState;
  events: GameEvent[];
  notifications: NotificationItem[];
  tickNum: number;
}
```

各ステップは `SimulationContext => SimulationContext` を返し、パイプラインは `context` を順次渡していく。

### ステップ3: `detectAndUpdateTheaters` をエンジン側に統合

現在 `tickActions.ts` でエンジンの外側で呼ばれている `detectAndUpdateTheaters()` を `advanceSimulation` のパイプラインに含めるか、明確に「エンジンの外側の後処理」としてドキュメント化する。

## メリット

- 各ステップが独立してテスト可能
- 新しいステップの追加が容易（配列に追加するだけ）
- 特定のステップを無効化・差し替えが容易（テストやデバッグ時）
- 状態の受け渡しが明示的になる

## 注意

- この変更は動作を変えてはいけない。既存のテストが全て通ることを確認する
- リファクタリングは小さなPRに分割して実施する

# Domain を Store 非依存にする理由

## 要旨

`app/domain` はゲームルールの中核であるべきだが、現状は `store` に依存しており、厳密には domain layer になっていない。

特に [app/domain/game/engine/advanceSimulation.ts](/home/ysikishokurin/russian-civil-war-simulator/app/domain/game/engine/advanceSimulation.ts:1) は pure function を意図している一方で、`store/game/tickHelpers` や `store/game/armyGroupAttack` を直接 import している。

この構造のままだと、次の制約が残る。

- domain を単体で再利用できない
- store の都合がゲームルールの形を決めてしまう
- worker 実行や headless 実行へ移しにくい
- テスト対象が reducer ではなく store adapter に引っ張られる
- UI / persistence / domain の責務分離が曖昧になる

## 現状の問題

### 1. domain が store 実装詳細に依存している

[app/domain/game/engine/advanceSimulation.ts](/home/ysikishokurin/russian-civil-war-simulator/app/domain/game/engine/advanceSimulation.ts:1) では、以下のように `store` 配下の実装を参照している。

- `store/game/tickHelpers`
- `store/game/tickHelpers/aiTick`
- `store/game/armyGroupAttack`
- `store/game/armyGroupDefend`
- `store/game/types`

これはレイヤ境界として逆向きで、`domain -> store` の依存になっている。

本来は次の方向に揃えるべきである。

- `domain` は `types` と pure helper のみを見る
- `application` は `domain` を呼ぶ
- `store` は `application` か `domain` の結果を反映するだけにする

### 2. pure function を名乗っていても、実質的な所有者が store である

[app/store/game/tickActions.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/tickActions.ts:12) は `advanceSimulation()` を呼んでいるが、前後で state の切り出し方や再構築の責務を store が握っている。

さらに tick 後に `detectAndUpdateTheaters()` を別 action として再実行しており、simulation transition が 1 回の pure transition に閉じていない。

この形では、

- engine の出力だけ見ても最終 state が分からない
- 「tick 1 回」の定義が store 側に漏れる
- domain の振る舞い検証に store knowledge が必要になる

### 3. command 系ロジックも store action に滞留している

以下は gameplay mutation を多く含むが、現状は store action / service に置かれている。

- [app/store/game/unitActions.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/unitActions.ts:1)
- [app/store/game/armyGroupActions.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/armyGroupActions.ts:1)
- [app/store/game/basicActions.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/basicActions.ts:110)
- [app/store/game/services/selectCountry.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/services/selectCountry.ts:16)

このため store が「状態コンテナ」ではなく「ゲーム本体」になっている。

## 目指す形

### 原則

`domain` は次だけを責務に持つ。

- ゲーム状態遷移
- ルール判定
- コマンド適用
- domain event の生成

`domain` は次を知らない。

- Zustand
- React
- localStorage
- screen 遷移
- modal 開閉
- selectedRegion などの UI 状態

### 推奨レイヤ

1. `domain/game`
   純粋な state transition と command reducer を置く

2. `application/game`
   ユースケース単位の orchestrator を置く

3. `store`
   state 保持、永続化、UI との接着だけを持つ

4. `components/hooks`
   selector と action dispatch のみ行う

### 依存方向

正しい依存方向は次の通り。

```text
UI -> store/application -> domain
domain -> types/utils
store -> domain
application -> domain
```

避けるべき依存方向は次の通り。

```text
domain -> store
domain -> UI
utils -> store
```

## 具体的にどう直すか

### 1. engine が参照する処理を domain 配下へ移す

`advanceSimulation.ts` が参照する純粋処理は、少なくとも import 境界として `domain/game` 配下に寄せる。

候補:

- `tickHelpers/*`
- `armyGroupAttack`
- `armyGroupDefend`
- theater / AI の pure 判定ロジック

重要なのは「コードを移動したか」ではなく、「domain から見て store を知らない状態にしたか」である。

### 2. engine の入力型を `GameStore` から切り離す

[app/domain/game/engine/types.ts](/home/ysikishokurin/russian-civil-war-simulator/app/domain/game/engine/types.ts:1) の `EngineSimulationState` は良い出発点だが、`GameStore` に引きずられない形に保つべきである。

具体的には:

- canonical simulation state を domain 側で定義する
- UI state は含めない
- persisted representation とは別物として扱う

### 3. command reducer を導入する

`tick` だけ pure にしても、`moveUnits` や `claimMission` が store action に残ると、設計の一貫性が崩れる。

そのため、次のような command application を持つとよい。

```ts
type GameCommand =
  | { type: 'MOVE_UNITS'; fromRegion: string; toRegion: string; divisionIds?: string[] }
  | { type: 'CANCEL_MOVEMENT'; movementId: string }
  | { type: 'REDIRECT_MOVEMENT'; movementId: string; toRegion: string }
  | { type: 'CLAIM_MISSION'; missionId: string };

function applyGameCommand(
  state: SimulationState,
  command: GameCommand,
  deps: SimulationDeps,
): SimulationResult;
```

これにより store action は次の薄い adapter にできる。

1. 現在 state を読む
2. command を組み立てる
3. `applyGameCommand()` を呼ぶ
4. 結果を書き戻す

### 4. diagnostics と side effect を注入に切り替える

現状は `Date.now()`、`Math.random()`、`console.*` への依存が分散している。

domain 側では以下を依存注入に寄せるべきである。

- `now()`
- `generateId()`
- `logger`

これにより、

- 再現性のあるテスト
- deterministic replay
- worker 実行
- save/load 検証

がやりやすくなる。

## 非依存化の完了条件

次を満たしたら、「domain は本当に store 非依存」と言ってよい。

- `app/domain/**` から `app/store/**` を import していない
- `domain` の public API が `SimulationState` と `GameCommand` のみで使える
- tick と主要 command が store を経由せず unit test できる
- store action が「orchestrate して patch を作る場所」ではなく「結果を反映する adapter」になっている
- theater 再計算や AI 更新を含めて、1 回の simulation transition が domain 内で閉じている

## 完了条件の達成状況

Phase 1: **完了** — `app/domain/**` から `app/store/**` を import していない。

- `app/domain/game/engine/advanceSimulation.ts` の全 `store/*` import を `../tickHelpers`/`../armyGroupAttack`/`../armyGroupDefend` に置換
- `tickHelpers/*`、`aiTick`、`armyGroupAttack`、`armyGroupDefend`、`missionCompletion`、`missionRewards`、`missionHelpers` を `domain/game` 配下に配置
- `armyGroupAttack`/`armyGroupDefend` を `setState` コールバック版 → `EngineSimulationState` delta 版に変更
- `buildFakeStore` / `applyStorePatchToEngineState` bridge を撤廃
- `checkAndCompleteMissions` / `checkAndClaimAIMissions` から `StoreApi<GameStore>` を除去し、flat な state interface に変更
- TypeScript: no errors. Tests: 204 passed (27 files).

残りの完了条件は未達成。

- `domain` の public API が `SimulationState` と `GameCommand` のみで使える
- store action が「結果を反映する adapter」になっている
- theater 再計算や AI 更新を含めて、1 回の simulation transition が domain 内で閉じている

## 段階的移行案

### Phase 1 — 完了

`advanceSimulation.ts` の `store/*` import をゼロにする。

最優先の対象:

- `tickHelpers`
- `aiTick`
- `armyGroupAttack`
- `armyGroupDefend`

### Phase 2

`tickActions.ts` を薄くする。

理想形:

- state を組み立てる
- `advanceSimulation()` を呼ぶ
- 返却値を store に反映する

追加の domain 処理を store 側で再実行しない。

### Phase 3

`moveUnits`、`claimMission`、`selectCountry` などを command 化する。

### Phase 4

store を simulation adapter と UI adapter に明確化し、UI state を domain から完全に分離する。

## 補足

この変更は「ディレクトリ名の整理」ではない。目的は import 経路の見た目を良くすることではなく、ゲームルールを framework から切り離し、独立した計算モデルとして成立させることである。

その意味で最も重要なのは次の 1 点である。

`domain` は store を使わずに実行できなければならない。

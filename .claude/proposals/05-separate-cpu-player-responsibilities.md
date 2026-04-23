# 改善提案 5: `ai/cpuPlayer.ts` の責務を分離する

## 優先度: 中 / 推定工数: 中

## 現状

`ai/cpuPlayer.ts` が以下の複数の責務を担っている：

1. AIState の初期化（`createInitialAIState`, `createInitialAIArmyGroup`）
2. AI生産ロジック（`runAITick`）
3. 分割名生成ロジック（`generateAIDivisionName`）
4. 地域フィルタリングヘルパー

また `domain/game/missionRewards.ts` が `ai/cpuPlayer.ts` から `createInitialAIArmyGroup` と `createInitialAIState` を import しており、**ドメイン→ai の依存**が発生している。

## 問題

- `cpuPlayer.ts` が複数の責務を持ち、変更理由が複数存在する（SRP違反）
- ドメイン層が `ai/` ディレクトリに依存しており、レイヤー構造が崩れている
- AI初期化ロジックはゲーム開始フローの一部なので、ドメインまたはサービス層に属すべき

## 提案

### Step 1: AI初期化をドメインに移動

`createInitialAIState`, `createInitialAIArmyGroup` を `domain/game/aiInitialization.ts` に移動。

### Step 2: `runAITick` を既存の AI tick フローに統合

現状 `domain/game/tickHelpers/aiTick.ts` が `cpuPlayer.ts` から `runAITick` を import している。`runAITick` のロジックを `aiTick.ts` に統合し、`cpuPlayer.ts` の責務を減らす。

### Step 3: 分割名生成を独立モジュールに

`generateAIDivisionName` を `domain/game/divisionNaming.ts` に移動。

### Step 4: 依存方向を修正

- `domain/game/missionRewards.ts` → `ai/cpuPlayer` を `domain/game/aiInitialization` に変更
- `store/game/services/selectCountry.ts` → `ai/cpuPlayer` を `domain/game/aiInitialization` に変更

## 影響ファイル

- `app/ai/cpuPlayer.ts`（大幅縮小または削除）
- `app/domain/game/aiInitialization.ts`（新規）
- `app/domain/game/tickHelpers/aiTick.ts`（runAITick ロジック統合）
- `app/domain/game/missionRewards.ts`（import パス変更）
- `app/store/game/services/selectCountry.ts`（import パス変更）

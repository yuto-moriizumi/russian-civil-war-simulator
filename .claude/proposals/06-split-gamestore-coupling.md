# 改善提案 6: `GameStore` の結合インターフェースを解消する

## 優先度: 中 / 推定工数: 中

## 現状

`GameStore` インターフェースは以下の4つの状態インターフェースを継承している：

- `SimulationState`（ゲームロジック状態）
- `GameUiState`（UI状態）
- `ClientPreferencesState`（クライアント設定）
- `MapRuntimeState`（マップ実行時データ）

加えて40個以上のアクションを定義している。`basicActions.ts` は297行。

`gameStores.ts` では2つのストア（`useSimulationStore`, `useGameUiStore`）を `setCombinedState` / `getCombinedState` で擬似的に結合している：

```typescript
function getCombinedState(): GameStore {
  return {
    ...useSimulationStore.getState(),
    ...useGameUiStore.getState(),
  } as GameStore;
}
```

## 問題

- 単一のインターフェースに全状態が集約されており、変更の影響範囲が把握しにくい
- `setCombinedState` が独自ロジックで2つのストアに patch を分配しており、隠れた結合が生まれる
- `createXxxActions` 関数が `setCombinedState` / `getCombinedState` に依存しているため、どのストアに属するアクションか不明確
- `as never` で型をキャストしている箇所が多数（`gameStores.ts:281-303`）

## 提案

### Step 1: アクションをストア別に分類

各 `createXxxActions` 関数が依存するストアを明示的にする：

- `createBasicActions` → `useSimulationStore` のみ（UI操作は UI store アクションを直接呼ぶ）
- `createTickActions` → `useSimulationStore` のみ
- `createUnitActions` → `useSimulationStore` のみ
- 等

### Step 2: `setCombinedState` / `getCombinedState` を廃止

コンポーネント側で個別のストアを直接参照し、必要な状態をセレクタで取得する。アクション間の連携が必要な場合は、カスタムフックでまとめる。

### Step 3: `GameStore` インターフェースを廃止

`SimulationStore` と `GameUiStore` のみを公開インターフェースとして残す。

## 影響ファイル

- `app/store/gameStores.ts`（setCombinedState/getCombinedState の廃止）
- `app/store/game/basicActions.ts`（import 先の変更）
- `app/store/game/tickActions.ts`（import 先の変更）
- `app/store/game/unitActions.ts`（import 先の変更）
- `app/store/game/armyGroupActions.ts`（import 先の変更）
- `app/store/game/productionActions.ts`（import 先の変更）
- `app/store/game/relationshipActions.ts`（import 先の変更）
- `app/store/game/types.ts`（GameStore 廃止）
- `app/components/` 配下のファイル（ストア参照の変更）

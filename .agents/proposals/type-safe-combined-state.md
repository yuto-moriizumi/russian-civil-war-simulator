# 提案: `setCombinedState` の型安全化

## 優先度: 中

## 現状

`app/store/gameStores.ts:157-196` で `splitGameStorePatch` が実行時の文字列キー比較によって、`ActionsState` のパッチを `SimulationStore` と `GameUiStore` に振り分けている。

```typescript
const UI_STATE_KEYS = new Set<keyof ActionsState>([
  'currentScreen',
  'selectedRegion',
  'selectedUnitRegion',
  // ... 14個のキー
]);

function splitGameStorePatch(patch: Partial<ActionsState>) {
  const simulationPatch: Partial<SimulationStore> = {};
  const uiPatch: Partial<GameUiStore> = {};

  for (const [key, value] of Object.entries(patch) as [keyof ActionsState, unknown][]) {
    if (UI_STATE_KEYS.has(key)) {
      (uiPatch as Record<string, unknown>)[key] = value;
    } else {
      (simulationPatch as Record<string, unknown>)[key] = value;
    }
  }

  return { simulationPatch, uiPatch };
}
```

## 問題点

1. **実行時チェックに依存**: `UI_STATE_KEYS` のセットへのキー追加漏れがあると、UIキーがsimulationストアに送信されてしまい、実行時エラーになる可能性がある。
2. **型の二重管理**: `GameUiStore` の型定義と `UI_STATE_KEYS` のセットが独立しており、型の整合性が保証されない。
3. **`as Record<string, unknown>` の型逃避**: 振り分け先のオブジェクトへの代入が `as` で型を回避しており、TypeScriptの型チェックが効いていない。
4. **アクションの越境書き込み**: 各アクションファイルが `setCombinedState` を通じて両方のストアに書き込めるため、どのストアがどのキーを所有しているかの境界が曖昧。

## 提案

### 短期的: 型チェックの追加

`UI_STATE_KEYS` が `GameUiStore` のキーと一致していることをコンパイル時に検証する:

```typescript
const UI_STATE_KEYS = [
  'currentScreen',
  'selectedRegion',
  // ...
] as const satisfies readonly (keyof GameUiStore)[];
```

`satisfies` を使うことで、配列の要素が `GameUiStore` のキーのサブセットであることがコンパイル時に検証される。

### 中期的: アクションの引数分離

アクションが更新したいストアを明示的にするアプローチ:

```typescript
// パターン案1: 明示的な2つのsetter
type ActionContext = {
  setSimulation: (patch: Partial<SimulationStore>) => void;
  setUi: (patch: Partial<GameUiStore>) => void;
  getSimulation: () => SimulationStore;
  getUi: () => GameUiStore;
};
```

```typescript
// パターン案2: バッチアップデート
type ActionContext = {
  update: (update: { simulation?: Partial<SimulationStore>; ui?: Partial<GameUiStore> }) => void;
};
```

### 長期的: 型安全なパッチビルダー

```typescript
function createPatch() {
  return {
    simulation: {} as Partial<SimulationStore>,
    ui: {} as Partial<GameUiStore>,
    set<K extends keyof SimulationStore>(key: K, value: SimulationStore[K]) {
      this.simulation[key] = value;
      return this;
    },
    setUi<K extends keyof GameUiStore>(key: K, value: GameUiStore[K]) {
      this.ui[key] = value;
      return this;
    },
  };
}
```

## メリット

- `UI_STATE_KEYS` へのキー追加漏れをコンパイル時に検出
- 型安全なストア間パッチ送信
- アクションの越境書き込みが明示的になる

## 注意

- 短期的対策は `satisfies` が使用できるTypeScript 4.9+が必要（現在のプロジェクトは対応済み）
- 中長期的な変更は既存のテストが通ることを確認しつつ段階的に実施する

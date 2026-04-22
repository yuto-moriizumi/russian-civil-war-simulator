# Plan 6: map-tool の編集状態を reducer 化する

## 目的

`app/map-tool/page.tsx` は ownership、core regions、unit placement、region values、history、dirty 判定、keyboard shortcut、save success 処理を一つの component で管理している。編集状態を reducer に集約し、undo/redo と dirty 判定を全編集モードで一貫させる。

## 現状の観察

- `MapToolPage` が多数の `useState` を持つ。
- undo/redo は ownership の履歴を中心に動いている。
- core/value/unit の変更履歴は ownership と同じ粒度では扱われていない。
- `hasChanges` は `JSON.stringify` 比較で毎 render 評価される。

## 目標設計

編集対象全体を一つの reducer state にする。

```ts
interface MapToolDocument {
  ownership: Record<string, CountryId>;
  coreRegions: Record<CountryId, string[]>;
  unitPlacement: UnitPlacementData;
  armyGroupDefs: Record<CountryId, ArmyGroupDef[]>;
  regionValues: Record<string, number>;
}

interface MapToolEditorState {
  current: MapToolDocument;
  baseline: MapToolDocument;
  history: MapToolDocument[];
  historyIndex: number;
  selectedCountry: CountryId;
  editMode: EditMode;
  isPaintEnabled: boolean;
  showAdjacency: boolean;
}

type MapToolAction =
  | { type: 'loadDocument'; document: MapToolDocument }
  | { type: 'paintOwnership'; regionId: string; countryId: CountryId }
  | { type: 'addCoreRegion'; regionId: string; countryId: CountryId }
  | { type: 'removeCoreRegion'; regionId: string; countryId: CountryId }
  | { type: 'changeRegionValue'; regionId: string; delta: number }
  | { type: 'addUnit'; regionId: string; countryId: CountryId; armyGroupName: string }
  | { type: 'removeUnit'; regionId: string; countryId: CountryId; armyGroupName: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'markSaved' }
  | { type: 'reset' };
```

## 実装手順

1. `app/map-tool/editor/types.ts` を追加し、`MapToolDocument`, `MapToolEditorState`, `MapToolAction` を定義する。
2. `app/map-tool/editor/reducer.ts` を追加する。
3. ownership paint を reducer action へ移す。
4. region value change を reducer action へ移す。
5. core region add/remove を reducer action へ移す。
6. `useUnitPlacement` の内部 state を reducer に統合するか、まず adapter action で橋渡しする。
7. `hasChanges`, `canUndo`, `canRedo` を selector 関数にする。
8. save success 時は `markSaved` action で baseline と history を更新する。
9. `MapToolPage` は state wiring と component composition だけに縮小する。

## テスト方針

- `mapToolReducer.test.ts` を追加する。
- 以下をテストする。
  - ownership paint が history に入る
  - core/value/unit の変更も undo/redo できる
  - `markSaved` 後に dirty が false になる
  - `reset` が baseline に戻る
  - region value は 1 未満にならない

## 移行時の注意

- UI component の props は一度に大きく変えない。まず page 内で reducer state から既存 props を組み立てる。
- `JSON.stringify` dirty 判定は reducer 移行後に `isDirty` flag または document hash に置き換える。
- drag paint は履歴が細かくなりすぎるため、drag start/end で一つの history entry にまとめる設計を検討する。

## 完了条件

- `MapToolPage` の local state が大幅に減っている。
- ownership/core/value/unit placement の undo/redo が同じ仕組みで動く。
- dirty 判定と save baseline 更新が reducer selector でテスト可能になっている。
- `npm test` と `npm run typecheck` が通る。

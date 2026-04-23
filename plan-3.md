# Plan 3: 保存機構の一本化

## 目的

`zustand/persist` と独自 `saveLoad.ts` の二重保存経路を整理し、保存フォーマットと migration を 1 系統に統一する。

## 背景

- `useGameStore` は `russian-civil-war-save` を使って persist している
- `utils/saveLoad.ts` は別キー `rcw-save` を持っている
- `useAutosave.ts` は独自保存経路を前提にしているが現在未使用

## 到達目標

- 保存先キー、serialize/deserialize、migration が単一実装になる
- autosave / manual save / rehydrate が同じ経路を使う
- 古い save への migration 方針が明示される

## 実施ステップ

1. 現在使われている保存経路と未使用コードを整理する
2. `persist` ベースに寄せるか、独自 serializer ベースに寄せるか決める
3. 保存フォーマット定義を 1 ファイルへ集約する
4. 既存 migration を新経路へ移植する
5. `useAutosave.ts` を削除または統合する

## ファイル候補

- `app/store/useGameStore.ts`
- `app/utils/saveLoad.ts`
- `app/hooks/useAutosave.ts`
- `app/store/game/initialState.ts`

## 検証

- 新規 save 作成
- 再読込後にタイトル画面へ戻る current behavior の維持確認
- 旧 version save が必要なら fixture を作って migration test を追加

## リスク

- save 互換を壊すとユーザーのローカル進行が読めなくなる
- Date 復元、`divisionIds` 互換、`regionOwners` 移行の扱いを落としやすい

## 完了条件

- localStorage key が 1 系統になる
- save/load/migration ロジックが 1 箇所に集まる

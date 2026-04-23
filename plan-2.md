# Plan 2: Region State の正規化

## 目的

`regions` と `regionDefinitions + regionOwners` の二重管理を解消し、正規形を 1 つに絞る。

## 背景

- 現在は `GameStore` に `regions`, `regionDefinitions`, `regionOwners` が共存している
- `composeRegionState` / `extractRegionOwners` による再構成が各所で発生している
- 更新漏れや片系だけ古くなる事故の余地がある

## 到達目標

- 正規データを `regionDefinitions + regionOwners` に固定する
- `regions` は selector または helper で導出する
- `createRegionOwnersPatch` のような暫定互換 API を最終的に削減する

## 実施ステップ

1. `regions` を直接更新している箇所を洗い出す
2. 正規更新 API を `regionOwners` 中心へ統一する
3. UI 層では必要に応じて `selectRegions()` のような導出 selector を使う
4. 互換レイヤーを段階的に削除する
5. 永続化と rehydrate の経路を新正規形に合わせる

## ファイル候補

- `app/store/game/types.ts`
- `app/store/useGameStore.ts`
- `app/utils/regionState.ts`
- `app/store/game/*Actions.ts`
- `app/store/game/tickHelpers/*`

## 検証

- `app/__tests__/regionState.test.ts`
- `app/__tests__/newGame.test.ts`
- `app/__tests__/movementApplication.test.ts`
- `npm test`

## リスク

- `regions` 前提の既存 helper が広範囲にあるため、一括移行は危険
- map 読み込み直後と rehydrate 直後の初期化順序に注意が必要

## 完了条件

- 動的 owner は `regionOwners` だけが真実のソースになる
- `regions` のミラー更新コードが大幅に減る

# Plan 6: UI の Store 依存を Feature Facade 化

## 目的

大型コンポーネントから store の直接参照を減らし、UI を feature ごとの view model / selector hook 経由で組み立てる。

## 背景

- `GameMap.tsx`, `TheaterPanel.tsx`, `TopBar.tsx` が多数の selector を直に持つ
- `useGameAPI.ts` は store 全体を購読して `window.gameAPI` を再束縛している
- UI と状態遷移の境界が薄く、再描画と責務の追跡がしづらい

## 到達目標

- 各 feature に `useXxxModel` / `useXxxActions` を置く
- コンポーネントは表示ロジックに集中する
- imperative API は必要最小限の action facade を参照する

## 実施ステップ

1. `GameMap`, `TopBar`, `TheaterPanel` から selector 群を feature hook へ抽出する
2. 派生データは hook 内でまとめて計算する
3. `useGameAPI` は `useGameStore.getState()` ベースの安定した facade に寄せる
4. UI コンポーネントを props 中心へ戻す
5. 重い selector や計算を明示的に集約する

## ファイル候補

- `app/components/GameMap.tsx`
- `app/components/TheaterPanel.tsx`
- `app/components/TopBar.tsx`
- `app/hooks/useGameAPI.ts`
- `app/components/GameMap/*`

## 検証

- 既存 UI の動作維持
- `window.gameAPI` の主要操作確認
- `npm test`
- 必要なら簡易的な render test 追加

## リスク

- facade の切り方が悪いと逆に hook が肥大化する
- `GameMap` は MapLibre と local state も抱えているため、分離単位に注意が必要

## 完了条件

- 主要 UI が store の生 state に過度に依存しなくなる
- feature 単位で読みやすい境界ができる

# Plan 4: Tick パイプラインの純関数化

## 目的

毎 tick のシミュレーションを deterministic な 1 本のパイプラインへ整理し、store 更新とロジック評価を分離する。

## 背景

- `tickActions.ts` は helper を使いつつも、途中で複数 patch を組み立てて `set()` している
- 後段で army group action や theater 再検出を再度呼んでおり、流れの追跡コストが高い
- 性能計測、再現性、snapshot 検証の観点で構造が重い

## 到達目標

- `runSimulationTick(state): TickResult` の形に寄せる
- 中間状態は result オブジェクト内だけで伝播する
- `tickActions.ts` は `if (!isPlaying) return` と commit のみを担当する

## 実施ステップ

1. `tickActions.ts` の各フェーズを `TickContext` / `TickResult` ベースに再定義する
2. event, notification, region, divisions, queues の集約構造を統一する
3. theater 再検出、AI、army group 自動行動の順序を明文化する
4. 乱数や `Date.now()` を必要なら注入可能にする
5. snapshot test または phase-level test を追加する

## ファイル候補

- `app/store/game/tickActions.ts`
- `app/store/game/tickHelpers/*`
- `app/store/game/armyGroupAttack.ts`
- `app/store/game/armyGroupDefend.ts`

## 検証

- `app/__tests__/tickActions.test.ts`
- `app/__tests__/movement*.test.ts`
- `app/__tests__/combat.test.ts`
- `app/__tests__/playerAI.test.ts`

## リスク

- 順序変更で subtle regression が起きやすい
- 現在の debug log や duplicate detection の差し込み位置が変わる

## 完了条件

- tick 処理の中間更新が単一パイプラインにまとまる
- store 非依存で tick 実行結果を比較できる

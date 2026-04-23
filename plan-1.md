# Plan 1: GameStore の責務分離

## 目的

`useGameStore` を状態保持と commit の責務に寄せ、ゲーム開始、国切替、ミッション報酬適用、tick 実行のようなユースケースを store 外へ切り出す。

## 背景

- `app/store/game/basicActions.ts` が UI 選択、初期化、国切替、報酬適用、保存互換まで持っている
- `app/store/game/tickActions.ts` が実質的にアプリケーションサービスになっている
- `set/get` に密結合しているため、ロジック単体の差分検証がしづらい

## 到達目標

- store action は `state -> patch` を適用する薄い境界になる
- ゲームロジックは `app/domain` または `app/store/game/services` のような層へ移動する
- `startNewGame`、`selectCountry`、`claimMission`、`tick` の主要ロジックを純関数ベースでテストできる

## 実施ステップ

1. `basicActions.ts` からユースケース候補を洗い出し、UI 系 action とゲーム進行系 action を分類する
2. `startNewGame`, `selectCountry`, `claimMission` を store 非依存の service 関数へ抽出する
3. store 側は service の返した patch を適用するだけにする
4. 既存テストを維持しつつ、service 単位の unit test を追加する
5. `tick` も同じ方針で段階的に移行する

## ファイル候補

- `app/store/game/basicActions.ts`
- `app/store/game/tickActions.ts`
- `app/store/useGameStore.ts`
- `app/store/game/services/*`

## 検証

- `npm test`
- `npm run typecheck`
- 既存の `newGame`, `missionRewards`, `tickActions` 系テストが維持されること

## リスク

- patch の適用順序を誤ると state 破壊が起きる
- `get()` 依存を急に消すと既存 action 間の暗黙依存が露出する

## 完了条件

- store ファイルの責務が「state 定義 + action の配線」に近づく
- 主要ユースケースが store 非依存で呼べる

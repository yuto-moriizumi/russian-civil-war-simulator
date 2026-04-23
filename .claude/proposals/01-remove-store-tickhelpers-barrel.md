# 改善提案 1: `store/game/tickHelpers/` のリEXPORTバリエイヤーを削除する

## 優先度: 高 / 推定工数: 小

## 現状

`store/game/tickHelpers/` 配下のファイルのほぼ全てが `domain/game/tickHelpers/` への単なる re-export になっている。

```
// store/game/tickHelpers/combatProcessing.ts
export { processCombats } from '../../../domain/game/tickHelpers/combatProcessing';
```

ただし `missionCompletion.ts` は store 側に実装が残っている（212行）。

## 問題

- 二重管理のリスクがある
- store 側の `index.ts` には `noOpLogger` の re-export が欠けている
- ファイル数だけ増えてナビゲーションのノイズになる

## 提案

1. `store/game/tickHelpers/` ディレクトリを削除する
2. `store/game/tickActions.ts` の `export { getEffectiveAIStates } from './tickHelpers/aiTick'` を `../../domain/game/tickHelpers/aiTick` に変更する
3. テストの互換性が必要な場合は、テストヘルパーとして独立させる

## 影響ファイル

- `app/store/game/tickHelpers/` 配下の全ファイル（削除）
- `app/store/game/tickActions.ts`（import パス修正）

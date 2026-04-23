# 改善提案 2: `missionCompletion.ts` の store 側実装を domain 版に統合する

## 優先度: 高 / 推定工数: 小

## 現状

`store/game/tickHelpers/missionCompletion.ts`（212行）に実装が残っており、`domain/game/tickHelpers/missionCompletion.ts`（202行）と **内容が異なる**。両者は独立した実装として并存している。

## 問題

- 同じロジックが2箇所に存在し、バグ修正が片方にしか適用されないリスクがある
- diff を取るとシグネチャも実装も微妙にずれている
- どちらが「正」か明確でない

## 提案

1. domain 版を単一の正当な実装として確定させる
2. store 版を re-export に統一する（改善提案1の一環）
3. 両者の差分を検証し、store 版にしかない修正があれば domain 版に反映する

## 影響ファイル

- `app/store/game/tickHelpers/missionCompletion.ts`（re-export に変更）
- `app/domain/game/tickHelpers/missionCompletion.ts`（必要に応じて修正）

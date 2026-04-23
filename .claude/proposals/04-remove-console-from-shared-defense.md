# 改善提案 4: `sharedDefenseProcessing.ts` から `console.*` を除去する

## 優先度: 中 / 推定工数: 小

## 現状

`utils/sharedDefenseProcessing.ts:22,29` で `console.log` を直接使用：

```typescript
console.log('[COMBAT CANCELLED]', { combatId: combat.id, reason: '...' });
```

`SimulationLogger` が既に定義されており、`domain/game/` 配下の他のファイルはこれに従っているが、このファイルだけ例外になっている。

## 問題

- `SimulationLogger` の導入意義が無効化されている
- ドメインロジックが直接 `console` に依存しており、テスト時の出力制御ができない

## 提案

1. `processCombatRound` のシグネチャに `logger: SimulationLogger` パラメータを追加
2. `console.log` を `logger.debug` に置き換え
3. 呼び出し側（`combatProcessing.ts` など）で logger を渡す

## 影響ファイル

- `app/utils/sharedDefenseProcessing.ts`（シグネチャ変更、console→logger）
- `app/domain/game/tickHelpers/combatProcessing.ts`（logger を渡す）

# 1. Delete Dead Re-export Files

## 問題

`store/game/tickHelpers/` 配下の全12ファイルは `domain/game/tickHelpers/` からの再エクスポートのみで構成されている。これらはドメイン層とストア層の分離作業（PR #329, #330付近）の過渡期に残されたファサード。

同じパターンは以下にも存在する:
- `store/game/missionHelpers.ts` → `domain/game/missionHelpers.ts` の再エクスポート
- `store/game/missionRewards.ts` → `domain/game/missionRewards.ts` の再エクスポート

## 影響範囲

### 削除対象ファイル

| ファイル | 行数 |
|---|---|
| `store/game/tickHelpers/aiTick.ts` | 2 |
| `store/game/tickHelpers/armyGroupSync.ts` | 2 |
| `store/game/tickHelpers/combatProcessing.ts` | 2 |
| `store/game/tickHelpers/divisionValidation.ts` | 2 |
| `store/game/tickHelpers/duplicateDetection.ts` | 2 |
| `store/game/tickHelpers/hpRegeneration.ts` | 2 |
| `store/game/tickHelpers/index.ts` | 19 |
| `store/game/tickHelpers/missionCompletion.ts` | 2 |
| `store/game/tickHelpers/movementApplication.ts` | 2 |
| `store/game/tickHelpers/movementProcessing.ts` | 2 |
| `store/game/tickHelpers/productionProcessing.ts` | 2 |
| `store/game/tickHelpers/scheduledEventProcessing.ts` | 2 |
| `store/game/missionHelpers.ts` | 7 |
| `store/game/missionRewards.ts` | 7 |

### インポート元の書き換え対象

テストファイルは現在 `store/` 経由でインポートしているが、これらは `domain/` パスに切り替える必要がある。以下のファイルで確認:

```
grep -r "from.*store/game/tickHelpers" app/
grep -r "from.*store/game/mission" app/
```

`store/game/tickHelpers/index.ts` は barrel exportとして内部の各ファイルを再エクスポートしているが、それ自体がdomainへの再エクスポートなので、実質的に誰も`store/` 側を直接参照していない可能性がある（テスト除く）。

## 手順

1. `store/game/tickHelpers/` ディレクトリごと削除
2. `store/game/missionHelpers.ts`, `store/game/missionRewards.ts` を削除
3. テストファイルのimportパスを `store/game/tickHelpers/*` → `domain/game/tickHelpers/*` に書き換え
4. `npm test` で全テストが通ることを確認

## リスク

低い。これらは純粋な再エクスポートであり、実コードは一切含まれていない。テストのimportパス書き換えのみが必要。

## 期待される効果

- ファイル数14件削減
- `domain/` → `store/` の一方向依存が明確化
- 「どっちをimportすべきか？」の混乱を解消

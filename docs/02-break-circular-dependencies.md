# 2. Break Circular Dependencies

## 問題

2箇所の循環依存（circular dependency）が存在する。循環依存はモジュール初期化順のバグ、tree-shakingの妨げ、コードの理解困難化につながる。

### Cycle 1: `utils/combat.ts` ↔ `utils/sharedDefenseProcessing.ts`

```
utils/combat.ts
  └─ re-export: processCombatRounds from sharedDefenseProcessing.ts

utils/sharedDefenseProcessing.ts
  └─ import: processCombatRound from combat.ts
```

`combat.ts` は `processCombatRounds` を `sharedDefenseProcessing.ts` から再エクスポートしつつ、`sharedDefenseProcessing.ts` は `combat.ts` から `processCombatRound` をimportしている。

### Cycle 2: `store/game/basicActions.ts` ↔ `store/game/services/selectCountry.ts`

```
store/game/basicActions.ts
  └─ import: buildSelectCountryPatch from services/selectCountry.ts

store/game/services/selectCountry.ts
  └─ import: mergeMissionsWithInitial from basicActions.ts
```

`basicActions.ts` が提供する `mergeMissionsWithInitial` を `selectCountry.ts` が使い、逆方向にもimportしている。

## 解決案

### Cycle 1 の解決

`processCombatRound`（単一ラウンドの処理）を `processCombatRounds`（複数ラウンドの処理）と同じファイルに配置するか、その逆を行う。

**推奨: `processCombatRound` を `sharedDefenseProcessing.ts` に移動**

`sharedDefenseProcessing.ts` が複数ラウンドを扱う責務を持つなら、単一ラウンドの処理も同じ関数群と一緒にあるべき。`combat.ts` からは再エクスポートを削除する。

影響するimportパスを更新:
- `processCombatRound` → `sharedDefenseProcessing.ts` からimport
- `processCombatRounds` → 従来通り `sharedDefenseProcessing.ts` からimport（`combat.ts` の再エクスポート経由をやめる）

### Cycle 2 の解決

`mergeMissionsWithInitial` を独立したファイルに切り出す。

**推奨: `utils/missionUtils.ts` に移動（または既存の同名ファイルに追加）**

`utils/missionUtils.ts` が既に存在するので、そこに `mergeMissionsWithInitial` を移動し、両ファイルからそちらを参照させる。

ファイル配置:
```
utils/missionUtils.ts
  └─ mergeMissionsWithInitial (移動)

basicActions.ts
  └─ import from utils/missionUtils.ts

selectCountry.ts
  └─ import from utils/missionUtils.ts
```

## 手順

1. `processCombatRound` を `sharedDefenseProcessing.ts` に移動
2. `combat.ts` からの再エクスポートを削除
3. `processCombatRound` をimportしている箇所を `sharedDefenseProcessing.ts` 参照に書き換え
4. `mergeMissionsWithInitial` を `utils/missionUtils.ts` に移動
5. `basicActions.ts`, `selectCountry.ts` 両方のimportを `utils/missionUtils.ts` に変更
6. `npm test` で全テストが通ることを確認

## リスク

中。importパスの書き換え漏れでテストが失敗する可能性がある。関数シグネチャは変わらないため、型チェックで大部分は防げる。

## 期待される効果

- モジュール初期化順のバグリスク排除
- tree-shaking最適化の改善
- 依存方向が明確になり、コードの追跡が容易に

# 提案: `store/game/tickHelpers` の削除

## 優先度: 高

## 現状

`app/store/game/tickHelpers/` 配下の全12ファイルが `app/domain/game/tickHelpers/` の再エクスポートとしてのみ存在している。

例: `store/game/tickHelpers/combatProcessing.ts`

```typescript
// Re-exported from domain.
export { processCombats } from '../../../domain/game/tickHelpers/combatProcessing';
```

## 問題点

1. **意図しない誤解**: `store/game/tickHelpers/` が実装を持つように見え、実際はdomain側が実体。新しい開発者が両方のディレクトリを維持する必要があると勘違いするリスクがある。
2. **メンテコスト**: ファイル数が12あり、domain側に新しいファイルが追加されるたびにstore側にも再エクスポートファイルを追加する必要がある。
3. **依存関係の把握困難**: `domain/game/engine/advanceSimulation.ts` が `../tickHelpers` を直接インポートしているため、store側の再エクスポートは実際にはどこからも使われていない可能性が高い。

## 提案

1. `app/store/game/tickHelpers/` ディレクトリを完全に削除する
2. このディレクトリを参照しているインポートが存在しないか確認する（`grep -r "store/game/tickHelpers"`）
3. 将来domain層の関数をstore層から呼び出す必要がある場合は、直接 `domain/game/tickHelpers/...` からインポートする

## 影響範囲

- `app/store/game/tickHelpers/` 配下の12ファイルを削除
- インポート経路の変更は不要（このディレクトリを外部から参照している箇所がなければ）

## 確認事項

```bash
grep -rn "store/game/tickHelpers" app/ --include="*.ts" --include="*.tsx"
```

この検索でヒットが0件であれば安全に削除可能。

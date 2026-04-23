# 提案: `detectAndUpdateTheaters` をエンジン側に統合

## 優先度: 中

## 現状

`detectAndUpdateTheaters()` が2箇所で呼ばれている:

1. **`tickActions.ts:37`**: `tick()` 関数内で `advanceSimulation()` の呼び出し**後**に実行されている
2. **`basicActions.ts:233`**: `selectCountry()` 関数内で国の選択後に実行されている

```typescript
// tickActions.ts
tick: () => {
  const state = get();
  if (!state.isPlaying) return;

  const engineState = toEngineState(state);
  const { state: next } = advanceSimulation(engineState, { countries, gameConfig: GAME_CONFIG }, simLogger);
  set(buildSimulationPatchFromEngineState(next));

  // エンジンの外側で呼ばれている
  get().detectAndUpdateTheaters();
}
```

## 問題点

1. **エンジンの純粋性が崩れている**: `advanceSimulation` は「純粋関数: reads state + deps, returns next state」を謳っているが、その直後に副作用として `detectAndUpdateTheaters()` が呼ばれている。つまり `tick()` の全体としては純粋ではない。
2. **二重実行のリスク**: `advanceSimulation` の内部でも劇場検知が行われている可能性がある（`processAITick` → `syncAIArmyGroupsToTheaters` が劇場入力を使う）。外側の `detectAndUpdateTheaters` が同じ処理を重複して実行している可能性がある。
3. **テストの困難さ**: エンジンの外側で呼ばれるため、`advanceSimulation` のユニットテストでは劇場の更新が検証できない。
4. **`tickActions.ts` がストアのアクションを呼んでいる**: `get().detectAndUpdateTheaters()` はストアのメソッドを直接叩いており、エンジン→ストアの依存が逆向きに流れている。

## 提案

### オプションA: `advanceSimulation` のパイプラインに統合

`detectAndUpdateTheaters` のロジックを `advanceSimulation` の最終ステップに移動する。これにより:
- `advanceSimulation` が劇場の更新も含まれた「完全な1ティック」になる
- 純粋関数の性質を維持できる（テストが容易）
- `tickActions.ts` から `detectAndUpdateTheaters()` の呼び出しを削除できる

### オプションB: 明示的に「エンジンの外側の後処理」として分離

`detectAndUpdateTheaters` がエンジンの外側に残る理由（例: 劇場検知が重くてゲームループのタイミングでだけ実行したい）を明確にドキュメント化する。その場合:
- 関数名を `syncUITheatersAfterTick()` のように変更し、エンジン外処理であることを明示
- `advanceSimulation` のコメントに「この関数は劇場を更新しない。呼び出し側が `detectAndUpdateTheaters` を呼ぶ必要がある」旨を記載

## 推奨

**オプションA** を推奨する。理由:
- `advanceSimulation` がすでに内部で劇場関連の処理（`detectTheatersForCountries`, `syncAIArmyGroupsToTheaters`）を行っているため、`detectAndUpdateTheaters` との統合は自然な流れ
- `selectCountry()` からの呼び出しも、内部で `selectCountry` パッチを構築した後に `detectAndUpdateTheaters` を呼ぶ形を、`advanceSimulation` ベースの関数に統一できる
- パイプライン化（別提案）と組み合わせることで、関心の分離が明確になる

## 影響範囲

- `app/store/game/tickActions.ts` — `detectAndUpdateTheaters()` の呼び出しを削除
- `app/domain/game/engine/advanceSimulation.ts` — 劇場検知を最終ステップに追加
- `app/store/game/basicActions.ts` — `selectCountry()` 内の呼び出しを不要にする

## 注意

- `detectAndUpdateTheaters` が `setCombinedState` を通じてUIストアの `theaters`/`selectedTheaterId` を更新している場合、その部分をどう扱うか検討が必要
- 既存のテスト（`theater.test.ts`, `aiArmyGroupTheaters.test.ts`）が全て通ることを確認する

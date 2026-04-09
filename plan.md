# Performance: `[tick] 11-army-group-actions` が遅い

## 背景

`tickActions.ts` のステップ 11 は、`advance` または `defend` モードのすべての army group に対して
`attackArmyGroup` / `defendArmyGroup` を逐次呼び出す。
各関数は内部で `setState` を発行するため、グループ数 N に比例して
store reconciliation と React re-render が発生する。

さらに各関数内部でグラフ BFS・`relationships` 線形スキャン・frontline BFS といった
計算量の大きい処理が繰り返されている。

---

## ボトルネック一覧

### 1. N 回の `setState` 呼び出し（最重要）

**場所**: `tickActions.ts:254–262`

```typescript
armyGroupActionsNeeded.forEach(group => {
  if (group.mode === 'advance') get().attackArmyGroup(group.id);   // setState inside
  else if (group.mode === 'defend') get().defendArmyGroup(group.id); // setState inside
});
```

グループごとに store が確定・React が再レンダリングされる。
N グループ = N 回の不要な store 更新。

**対策**: `attackArmyGroup` / `defendArmyGroup` を pure function 化し、
差分を集約して Step 11 末尾で **1回だけ `setState`** を呼ぶ。

---

### 2. ネストループ内での BFS 毎回実行

**場所**: `armyGroupDefend.ts:182–206`, `armyGroupAttack.ts:148–213`

- 外ループ: `needyBorders` (B 個)
- 内ループ: `availBySource` (S 個のソースリージョン)
- 各組み合わせで **グラフ全体を BFS** → **O(B × S × R)** / グループ / tick

**対策**: ループ前に全ソースリージョンの BFS 結果をまとめてキャッシュし、
ループ内では参照のみにする（1グループあたり BFS を1回に削減）。

---

### 3. `relationships` 配列の線形スキャンが述語内で毎回実行

**場所**: `pathfinding.ts:33–46`, `pathfinding.ts:75–87`

`buildCanEnterPredicate` / `buildIsHostilePredicate` が返す述語は
呼び出しのたびに `Array.find()` を2回走査する。
BFS の各エッジ評価で発動するため **O(R × D × L)** / グループ。

**対策**: 述語生成時に `Map<"countryA|countryB", Relationship>` を構築し、
述語内の参照を O(1) にする。

---

### 4. Frontline BFS が後方リージョンごとに再実行

**場所**: `frontlineAssignment.ts:149–200`（`assignDivisionsToFrontline` Phase 1）

後方リージョンの数だけ BFS を個別に実行 → **O(Rear × R)** / グループ。

**対策**: 全 frontline スロットを始点とする **多始点 BFS (multi-source BFS)** を
1回実行し、各後方リージョンから最近傍スロットへのパスを一括取得する。

---

### 5. `syncArmyGroupTerritories` の O(G × R × D) スキャン

**場所**: `armyGroupSync.ts`（ステップ 9）

全リージョンを全グループ分スキャンし、`region.divisions.some(d => d.armyGroupId === group.id)` を評価。

**対策**: division の追加・削除時に `regionId → Set<armyGroupId>` の逆引きインデックスを
維持し、スキャンを O(R × D) に削減する。

---

## 対応優先度

| 優先度 | 問題 | 効果 | 難易度 |
|--------|------|------|--------|
| 高 | N 回 `setState` のバッチ化 | 即効・確実 | 中 |
| 高 | `relationships` の Map 化 | 広範囲に効く | 低 |
| 中 | BFS キャッシュ化 | O 記法を大幅削減 | 中 |
| 中 | 多始点 BFS | Frontline 割り当て高速化 | 中 |
| 低 | `syncArmyGroupTerritories` 逆引きインデックス | ステップ 9 高速化 | 高 |

---

## Files Changed（予定）

| File | Change |
|------|--------|
| `app/store/game/tickActions.ts` | Step 11 を pure function 呼び出し + 1回 `setState` に変更 |
| `app/store/game/armyGroupAttack.ts` | pure function 化、setState 削除 |
| `app/store/game/armyGroupDefend.ts` | pure function 化、setState 削除 |
| `app/utils/pathfinding.ts` | `relationships` を Map に変換して述語に渡す |
| `app/utils/frontlineAssignment.ts` | Phase 1 を多始点 BFS に置き換え |
| `app/store/game/tickHelpers/armyGroupSync.ts` | 逆引きインデックス導入（優先度低） |

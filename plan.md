# 国境戦闘モデル（HOI4スタイル）実装計画

## Context

現在、戦闘は特定のマス（`regionId`）上で発生する。これをHOI4のように、マスとマスの「間」（国境）で発生するように変更する。

- 同じ防御地域に複数方向からの戦闘が独立して発生可能
- 攻撃側勝利時、自動的に防御側の地域へ進軍
- 戦闘インジケーターは国境線の中間点に配置

---

## Step 1: `ActiveCombat` 型の更新

**File:** `app/types/game.ts:230-248`

`regionId`/`regionName` を以下に置き換え：

```typescript
export interface ActiveCombat {
  id: string;
  attackerRegionId: string;    // 攻撃元の地域
  defenderRegionId: string;    // 防御されている地域（旧 `regionId`）
  attackerRegionName: string;  // 表示名
  defenderRegionName: string;  // 表示名（旧 `regionName`）
  attackerCountry: CountryId;
  defenderCountry: CountryId;
  attackerDivisions: Division[];
  defenderDivisions: Division[];
  initialAttackerCount: number;
  initialDefenderCount: number;
  initialAttackerHp: number;
  initialDefenderHp: number;
  currentRound: number;
  startTime: Date;
  lastRoundTime: Date;
  roundIntervalHours: number;
  isComplete: boolean;
  victor: CountryId | null;
}
```

また `GameState` に追加：

```typescript
borderMidpoints: Record<string, [number, number]>;  // Key: ソート済み "A|B"
```

---

## Step 2: 国境中間点の事前計算

**File:** `scripts/process-map.ts`

Step 4（出力ファイル保存）の後に追加：TopoJSONのarcデータを利用して、共有国境の中間点を計算。

**File:** `scripts/lib/topojson-utils.ts`

関数 `computeBorderMidpoints(topology, mergedGeoJSON)` を追加：
- `extractAdjacency` の既存の `arcToRegions` ロジックを再利用
- 国境を共有する各ペアについて、共有arcの全座標点を収集
- それらの点の重心（セントロイド）を国境中間点として計算
- 出力キー形式：ソート済み `"A|B"` → `[longitude, latitude]`

**出力:** `public/map/borderMidpoints.json`

```json
{
  "RU-ALT|RU-NOV": [83.5, 53.2],
  "RU-ALT|RU-KEM": [85.1, 52.8]
}
```

---

## Step 3: ランタイムでの国境中間点ロード

**Files:**
- `app/hooks/useMapData.ts` — adjacencyと一緒に `/map/borderMidpoints.json` をfetch
- `app/store/game/basicActions.ts` — `setBorderMidpoints` アクションを追加
- `app/store/game/types.ts` — `borderMidpoints` を `GameStore` に追加
- `app/store/game/initialState.ts` — `{}` で初期化

---

## Step 4: `createActiveCombat()` シグネチャの更新

**File:** `app/utils/combat.ts:156`

新しいシグネチャ：

```typescript
export function createActiveCombat(
  attackerRegionId: string,
  attackerRegionName: string,
  defenderRegionId: string,
  defenderRegionName: string,
  attackerCountry: CountryId,
  defenderCountry: CountryId,
  attackerDivisions: Division[],
  defenderDivisions: Division[],
  currentTime: Date
): ActiveCombat
```

---

## Step 5: `findRetreatDestination()` の更新

**File:** `app/utils/combat.ts:328-341`

- 攻撃側師団 → `attackerRegionId` に退却（フォールバック：attackerRegionIdの味方隣接地域）
- 防御側師団 → `defenderRegionId` の味方隣接地を検索（`attackerRegionId` は除外）

```typescript
function findRetreatDestination(
  combatRegionId: string,      // defenderRegionId（防御側の退却用）
  divisionOwner: CountryId,
  regions: RegionState,
  adjacency: Adjacency,
  isAttacker: boolean,         // NEW
  attackerRegionId: string     // NEW
): string | null
```

---

## Step 6: `processCombatRound()` の更新

**File:** `app/utils/combat.ts:200-326`

1. `combat.regionId` → `combat.defenderRegionId` に置換
2. 退却時に `isAttacker` と `attackerRegionId` を `findRetreatDestination` に渡す
3. 攻撃側退却の `fromRegionId` = `combat.attackerRegionId`、防御側退却の `fromRegionId` = `combat.defenderRegionId`
4. **有効性チェックを追加**：`defenderRegionId` の所有者が変更された場合（別の戦闘が先に解決した場合）、この戦闘を自動キャンセル

有効性チェックのロジック：

```typescript
const defenderRegion = regions[combat.defenderRegionId];
if (defenderRegion && defenderRegion.owner !== combat.defenderCountry) {
  const newOwnerIsAttacker = defenderRegion.owner === combat.attackerCountry;
  if (newOwnerIsAttacker) {
    return { combat: { ...combat, isComplete: true, victor: combat.attackerCountry }, retreatingDivisions: [] };
  } else {
    return {
      combat: { ...combat, isComplete: true, victor: combat.defenderCountry },
      retreatingDivisions: combat.attackerDivisions.map(d => ({
        division: d, toRegionId: combat.attackerRegionId, fromRegionId: combat.attackerRegionId,
      }))
    };
  }
}
```

---

## Step 7: 全5箇所の戦闘生成エントリポイントの更新

全サイトで以下を実施：
- `createActiveCombat` に `attackerRegionId`/`attackerRegionName` を渡す
- ボーダー固有検索に変更：`c.attackerRegionId === from && c.defenderRegionId === to`
- 複数戦闘時の防御側コピーハンドリング：同じ `defenderRegionId` に2回目以降の戦闘を作成する場合、最初のアクティブな戦闘から `defenderDivisions` をコピー
- 最初の戦闘時のみ地域の師団をクリア：`existingCombatsOnRegion.length === 0` の場合のみ

### 7a: `moveUnits()` — `app/store/game/unitActions.ts`

~line 271: 戦闘検索をボーダー固有に変更
~line 310: `createActiveCombat` に攻撃元の地域情報を追加

### 7b: `attackArmyGroup()` — `app/store/game/armyGroupAttack.ts`

~line 290: ボーダー固有検索
~line 297: `createActiveCombat` に攻撃元情報を追加

### 7c: `advanceArmyGroup()` — `app/store/game/armyGroupAdvance.ts`

~line 126: ボーダー固有検索
~line 134: `createActiveCombat` に攻撃元情報を追加

### 7d: `processMovements()` — `app/store/game/tickHelpers/movementProcessing.ts`

~line 85: ボーダー固有検索
~line 96: `createActiveCombat` に攻撃元情報を追加

### 7e: `applyCompletedMovements()` — `app/store/game/tickHelpers/movementApplication.ts`

~line 144: ボーダー固有検索
~line 271: `createActiveCombat` に攻撃元情報を追加

---

## Step 8: `applyFinishedCombats()` の更新

**File:** `app/store/game/tickHelpers/movementApplication.ts:346-371`

- **攻撃側勝利**：攻撃側師団を `defenderRegionId` に配置、所有者を変更。既存の攻撃側師団とマージ（重複排除）
- **防御側勝利**：攻撃側師団を `attackerRegionId` に戻す。防御側師団は `defenderRegionId` に残る

```typescript
export function applyFinishedCombats(
  finishedCombats: ActiveCombat[],
  regions: Record<string, Region>
): Record<string, Region> {
  const nextRegions = { ...regions };

  finishedCombats.forEach(combat => {
    if (combat.victor === combat.attackerCountry) {
      const existing = nextRegions[combat.defenderRegionId];
      if (!existing) return;
      const existingAttackerDivs = existing.divisions.filter(d => d.owner === combat.attackerCountry);
      nextRegions[combat.defenderRegionId] = {
        ...existing,
        owner: combat.attackerCountry,
        divisions: [...existingAttackerDivs, ...combat.attackerDivisions],
      };
    } else {
      const attackerRegion = nextRegions[combat.attackerRegionId];
      if (attackerRegion) {
        nextRegions[combat.attackerRegionId] = {
          ...attackerRegion,
          divisions: [...attackerRegion.divisions, ...combat.attackerDivisions],
        };
      }
      const defenderRegion = nextRegions[combat.defenderRegionId];
      if (defenderRegion) {
        const existingIds = new Set(defenderRegion.divisions.map(d => d.id));
        const newDefenderDivs = combat.defenderDivisions.filter(d => !existingIds.has(d.id));
        nextRegions[combat.defenderRegionId] = {
          ...defenderRegion,
          divisions: [...defenderRegion.divisions, ...newDefenderDivs],
        };
      }
    }
  });

  return nextRegions;
}
```

---

## Step 9: 増援ロジックの更新

**File:** `app/store/game/tickHelpers/movementApplication.ts:144`

ボーダー固有の戦闘マッチング：

```typescript
const ongoingCombat = nextCombats.find(c =>
  c.attackerRegionId === movement.fromRegion &&
  c.defenderRegionId === toRegion &&
  !c.isComplete
);
```

---

## Step 10: 戦闘処理イベントの更新

**File:** `app/store/game/tickHelpers/combatProcessing.ts`

- `combat.regionId` → `combat.defenderRegionId`
- `combat.regionName` → `combat.defenderRegionName`
- イベントテキストに方向性を追加（例：「Battle for Moscow from Tula」）

**File:** `app/store/game/tickActions.ts:127-129`

- `combat.regionId` → `combat.defenderRegionId`（mid-transit戦闘のクリア処理）
- 「最初の戦闘時のみクリア」チェックを追加

---

## Step 11: マップ表示の更新

**File:** `app/components/GameMap/mapCalculations.ts:110-133`

`calculateCombatMarkers()` — `borderMidpoints` を使用、フォールバックとして重心平均：

```typescript
export function calculateCombatMarkers(
  activeCombats: ActiveCombat[],
  regionCentroids: Record<string, [number, number]>,
  borderMidpoints: Record<string, [number, number]>  // NEW parameter
): (CombatMarkerData | null)[] {
  // ...
  const pairKey = [combat.attackerRegionId, combat.defenderRegionId].sort().join('|');
  const midpoint = borderMidpoints[pairKey];
  if (midpoint) {
    position = midpoint;
  } else {
    const a = regionCentroids[combat.attackerRegionId];
    const d = regionCentroids[combat.defenderRegionId];
    position = [(a[0]+d[0])/2, (a[1]+d[1])/2];
  }
}
```

**File:** `app/components/CombatPopup.tsx:63`

「Battle of {regionName}」→「Battle for {defenderRegionName} from {attackerRegionName}」

---

## Step 12: セーブ/ロード互換性

**File:** `app/utils/saveLoad.ts`

- `SAVE_VERSION` を7にインクリメント
- `SerializedActiveCombat` を新しいフィールドに更新
- マイグレーション追加：

```typescript
activeCombats: (data.activeCombats || []).map((c: any) => ({
  ...c,
  attackerRegionId: c.attackerRegionId ?? c.regionId,
  defenderRegionId: c.defenderRegionId ?? c.regionId,
  attackerRegionName: c.attackerRegionName ?? c.regionName ?? '',
  defenderRegionName: c.defenderRegionName ?? c.regionName ?? '',
  startTime: new Date(c.startTime),
  lastRoundTime: new Date(c.lastRoundTime),
})),
```

---

## Step 13: CPUプレイヤーの更新

**File:** `app/ai/cpuPlayer.ts:155`

`c.regionId` → `c.defenderRegionId`

---

## Step 14: テストの更新と追加

**Files:** `app/__tests__/movementApplication.test.ts`, `app/__tests__/attack.test.ts`

- `makeCombat()` ヘルパーに新しいフィールドを追加
- 全 `combat.regionId` アサーションを更新
- 新規テストケース：
  - 同じ防御地域に2方向からの戦闘が独立して発生
  - 最初の戦闘が解決（攻撃側勝利）→2番目の戦闘が自動キャンセル
  - 攻撃側の退却先が `attackerRegionId`
  - 防御側の退却先が `attackerRegionId` を除外
  - 戦闘マーカーが国境中間点に配置される

---

## 検証手順

1. `npx tsx scripts/process-map.ts` を実行して `borderMidpoints.json` を生成
2. `npx vitest` を実行して全テストが通ることを確認
3. ゲームを起動、戦争を開始、一方向から攻撃 → 国境中間点に戦闘インジケーター
4. 同じ地域に別方向から攻撃 → その国境に2つ目の戦闘インジケーター
5. 最初の戦闘に勝利 → 師団が地域に進軍、地域所有権が変更されたら2番目の戦闘が自動キャンセル
6. 戦闘に敗北 → 攻撃側師団が元の地域に戻る
7. 古いセーブをロード → 後方互換性マイグレーションが動作すること

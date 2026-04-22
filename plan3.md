# Plan 3: Division の単一実体性を強める

## 目的

現在は `DivisionState` が正規化されている一方で、`Movement` と `ActiveCombat` も `Division[]` のコピーを保持している。師団の重複、HP 同期、移動中/戦闘中の所在管理が複雑になっているため、師団を ID 参照中心のモデルへ移行する。

## 現状の観察

- `DivisionState` は `Record<string, Division>` として定義されている。
- `Movement.divisions` は `Division[]`。
- `ActiveCombat.attackerDivisions` と `defenderDivisions` も `Division[]`。
- `buildDivisionState` は movement/combat 側のコピーで base を上書きしている。
- duplicate detection が tick 内に複数回入っており、重複リスクが実在する。

## 目標設計

師団の基本情報と所在を分ける。

```ts
interface Division {
  id: string;
  name: string;
  owner: CountryId;
  armyGroupId: string;
  maxHp: number;
  attack: number;
  defence: number;
}

type DivisionLocation =
  | { type: 'region'; regionId: string }
  | { type: 'movement'; movementId: string }
  | { type: 'combat'; combatId: string; side: 'attacker' | 'defender' }
  | { type: 'destroyed' };

interface DivisionRuntimeState {
  hp: number;
  location: DivisionLocation;
}

type DivisionState = Record<string, Division & DivisionRuntimeState>;

interface Movement {
  id: string;
  fromRegion: string;
  toRegion: string;
  divisionIds: string[];
  departureTime: Date;
  arrivalTime: Date;
  owner: CountryId;
  pendingCombatId?: string;
  remainingPath?: string[];
  finalDestination?: string;
}
```

## 実装手順

1. `Movement` に `divisionIds` を追加し、移行期間は `divisions` と併存させる。
2. helper を追加する。
   - `getMovementDivisions(divisions, movement)`
   - `getCombatAttackers(divisions, combat)`
   - `getCombatDefenders(divisions, combat)`
   - `setDivisionLocation(divisions, id, location)`
3. 新規作成される movement/combat は `divisionIds` を必ず持つようにする。
4. `processMovements`, `applyCompletedMovements`, `processCombats` を `divisionIds` ベースへ移行する。
5. save rehydrate 時に古い `Movement.divisions` から `divisionIds` を復元する compatibility path を入れる。
6. 全呼び出しが移行できたら `Movement.divisions`, `ActiveCombat.attackerDivisions`, `ActiveCombat.defenderDivisions` を削除する。
7. `buildDivisionState` を不要化または compatibility helper に縮小する。

## テスト方針

- `movement.test.ts`, `movementApplication.test.ts`, `combat.test.ts`, `twoFrontCombat.test.ts`, `tickActions.test.ts` を重点的に守る。
- 新規テストを追加する。
  - movement 中の division は region に重複して見えない
  - combat 中の defender は region に残らない
  - multi-front combat で同じ defender ID が重複しない
  - save rehydrate で旧形式 movement が新形式へ移行される

## 移行時の注意

- 一括変更は危険。まず `divisionIds` を併存させ、読み取り helper で吸収する。
- UI は当面 `getDivisionsInRegion` など既存 helper 経由にして、内部表現変更を隠す。
- `ActiveCombat` の表示用に attacker/defender の初期数や初期 HP は残してよい。

## 完了条件

- movement/combat が Division object のコピーを保持しない。
- duplicate detection が診断用途に縮小できる。
- 師団の所在が `DivisionState` から一意に分かる。
- `npm test` と `npm run typecheck` が通る。

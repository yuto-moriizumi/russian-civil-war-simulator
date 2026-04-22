# Plan 4: Domain 型定義の分割

## 目的

`app/types/game.ts` が map、country、division、combat、mission、diplomacy、scheduled event、GameAPI、window global をまとめて定義している。型ファイルの責務を domain ごとに分け、依存方向を明確にする。

## 現状の観察

- `CountryId` は `countryMetadata` の key から導出されている。
- `MissionCondition`, `MissionRewards`, `ScheduledEventAction` など仕様系の型も同じファイルにある。
- `GameAPI` と `declare global Window` も同じファイルにある。
- `ScheduledEventAction` は optional field が多く、不正な組み合わせを型で防ぎにくい。

## 目標設計

以下のように分割する。

```text
app/domain/countries/types.ts
app/domain/map/types.ts
app/domain/military/types.ts
app/domain/diplomacy/types.ts
app/domain/missions/types.ts
app/domain/events/types.ts
app/domain/game/types.ts
app/api/gameApi/types.ts
```

互換性のため、移行期間は `app/types/game.ts` から再 export する。

```ts
export * from '../domain/countries/types';
export * from '../domain/map/types';
export * from '../domain/military/types';
export * from '../domain/diplomacy/types';
export * from '../domain/missions/types';
export * from '../domain/events/types';
export * from '../domain/game/types';
export * from '../api/gameApi/types';
```

## 実装手順

1. 新しい domain ディレクトリを作り、型を機械的に移動する。
2. `app/types/game.ts` は再 export のみにして、既存 import を壊さない。
3. `ScheduledEventAction` を discriminated union に変更する。

```ts
type ScheduledEventAction =
  | { type: 'transferRegion'; regionId: string; newOwner: CountryId }
  | { type: 'declareWar'; fromCountry: CountryId; toCountry: CountryId }
  | { type: 'spawnDivision'; regionId: string; owner: CountryId; armyGroupName?: string }
  | { type: 'setRelationship'; fromCountry: CountryId; toCountry: CountryId; relationshipType: RelationshipType };
```

4. `MissionRewards` も同様に、必要なら reward action union へ寄せる。
5. `GameAPI` と `declare global` を `app/api/gameApi/types.ts` に移す。
6. import を少しずつ domain 直参照へ更新する。

## テスト方針

- 主に `npm run typecheck` で検証する。
- `scheduledEventProcessing.test.ts` と `scheduledEvents.test.ts` を重点的に確認する。
- invalid scheduled event fixture を置けるなら、`satisfies ScheduledEvent[]` で型エラーになることを確認する。

## 移行時の注意

- 最初は再 export 方式で import churn を抑える。
- `CountryId` の導出元を変えると影響が大きいので、最初の段階では現行の導出方式を維持する。
- data 層と domain 型の循環依存が出たら、`COUNTRY_IDS` のような軽量 registry を分離する。

## 完了条件

- `app/types/game.ts` が巨大な定義ファイルではなく compatibility export になっている。
- scheduled event の不正な action payload が型で落ちる。
- domain ごとの import 境界が見える。
- `npm test` と `npm run typecheck` が通る。

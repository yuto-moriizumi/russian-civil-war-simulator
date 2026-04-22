# Plan 5: map-tool の Source of Truth を JSON 化する

## 目的

map-tool は現在、編集結果を TypeScript ファイルとして生成し、読み込み時にはその TS ファイルを regex で解析している。この方式は formatter、コメント、構文変更に弱い。編集データの source of truth を JSON に寄せ、TS 生成は必要な場合の派生物にする。

## 現状の観察

- unit placement は `app/data/map/initialUnitPlacement.ts` に保存される。
- `load-unit-placement` は `initialUnitPlacement.ts` を文字列として読み、regex と replace で JSON 化している。
- ownership/core region/region values も TypeScript 生成に寄っている。
- map-tool API は development mode 限定でファイルを書き換える。

## 目標設計

編集可能なデータは JSON を正とする。

```text
app/data/map/generated/ownership.json
app/data/map/generated/coreRegions.json
app/data/map/generated/unitPlacement.json
app/data/map/generated/regionValues.json
```

ゲーム側は JSON を直接 import するか、必要なら build script で TS wrapper を生成する。

```ts
import unitPlacement from './generated/unitPlacement.json';
export const initialUnitPlacement = unitPlacement satisfies UnitPlacementData;
```

## 実装手順

1. JSON schema 相当の TypeScript 型を `app/data/map/generatedTypes.ts` に定義する。
2. `save-unit-placement` を JSON 書き込みに変更する。
3. `load-unit-placement` を JSON 読み込みに変更し、regex parse を削除する。
4. `save-region-values`, `save-ownership`, `save-core-regions` も段階的に JSON 保存へ変更する。
5. 既存 TS ファイルは compatibility wrapper にする。
6. `scripts/map:*` または新規 `scripts/sync-map-data.ts` で JSON から TS wrapper を生成できるようにする。
7. CI または `npm test` 前に schema validation を走らせる script を追加する。

## テスト方針

- `load-unit-placement` の route helper を分離して単体テストする。
- JSON round-trip test を追加する。
  - save payload を JSON 化
  - load で同じ構造が返る
  - countryId と regionId の basic validation が通る
- 既存の `newGame.test.ts`, `countrySwitch.test.ts` で初期配置が壊れていないことを確認する。

## 移行時の注意

- 既存 TS ファイルをすぐ消さない。まず JSON を追加し、TS wrapper は JSON を読む形にする。
- map-tool が保存した差分を review しやすくするため、JSON は sorted key で整形する。
- Next.js の JSON import と route runtime の両方で同じデータを読める形にする。

## 完了条件

- `load-unit-placement` から regex parse が消えている。
- map-tool の保存対象が JSON source of truth になっている。
- 既存 game data import は compatibility wrapper で壊れていない。
- `npm test` と `npm run typecheck` が通る。

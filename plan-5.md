# Plan 5: 型定義と巨大データ定義の分離

## 目的

型システムと runtime データの結合を弱め、国データや core region データの保守性を上げる。

## 背景

- `CountryId` が `countryMetadata.ts` から導出されている
- `countryMetadata.ts` は巨大な runtime データでもあり、型定義層に影響している
- map-tool は API 経由でこの TS ファイル自体を編集している

## 到達目標

- 軽量な schema/ids 定義と、詳細 metadata を別管理に分離する
- 国情報の追加や core region 更新が型定義ファイルの肥大化に直結しない
- 生成データは JSON または分割 TS に寄せ、編集差分を小さくする

## 実施ステップ

1. `CountryId` のソースを固定的な ids 定義へ切り出す
2. `countryMetadata.ts` を分割または generated data 化する
3. `countries.ts`, `gameData.ts`, mission / event 側の import を整理する
4. map-tool の保存先を monolithic TS からより安定した形式へ移す
5. 必要なら build step で runtime データを組み立てる

## ファイル候補

- `app/types/game.ts`
- `app/data/countryMetadata.ts`
- `app/data/countries.ts`
- `app/data/gameData.ts`
- `app/api/map-tool/save-core-regions/route.ts`

## 検証

- `npm run typecheck`
- 国追加・core region 更新時の差分が局所化されること
- map-tool の load/save が維持されること

## リスク

- `CountryId` の derived union を失うと型安全性が落ちる
- map-tool 側の書き込み方式変更は影響範囲が広い

## 完了条件

- 型定義層が巨大 runtime データから独立する
- 国データ変更時のマージ衝突が減る

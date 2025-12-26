# Russian Civil War Simulator - Map Implementation Plan

## 概要

ロシア内戦シミュレーターにインタラクティブなマップを実装する。各リージョン（地域）は異なる勢力によって支配され、軍隊を配置・移動させることができる。

## 技術選定

### 決定事項

| 項目 | 選定 | 理由 |
|------|------|------|
| マップ描画 | **MapLibre GL** | ズーム/パン機能が組み込み、大規模データに強い |
| データソース | **geoBoundaries** | 国別ダウンロード可能、REST API提供、GeoJSON形式 |
| 行政区分レベル | **ADM1** | 州/県レベル。適度な粒度（ロシア83リージョン等） |

### 比較検討の経緯

#### レンダリング方式

- SVG: シンプルだがズーム/パンは自前実装が必要
- PixiJS: ゲーム向けだがマップには過剰
- **MapLibre GL**: マップ特化、機能豊富 → 採用

#### データソース

- Natural Earth: 全世界一括DLのみ（14MB）、ラトビアが1リージョンしかない問題
- **geoBoundaries**: 国別API、GeoJSON/TopoJSON対応、ADM1でラトビア43リージョン → 採用

## geoBoundaries API

### エンドポイント

```
https://www.geoboundaries.org/api/current/gbOpen/{ISO3_CODE}/ADM1/
```

### レスポンス例

```json
{
  "gjDownloadURL": "https://..../geoBoundaries-RUS-ADM1.geojson",
  "simplifiedGeometryGeoJSON": "https://..../geoBoundaries-RUS-ADM1_simplified.geojson",
  "admUnitCount": 83
}
```

### 対象国リスト

| ISO3 | 国名 | ADM1リージョン数 |
|------|------|-----------------|
| RUS | ロシア | 83 |
| UKR | ウクライナ | 27 |
| POL | ポーランド | 16 |
| DEU | ドイツ | 16 |
| LVA | ラトビア | 43 |
| LTU | リトアニア | 10 |
| EST | エストニア | 15 |
| FIN | フィンランド | 要確認 |
| BLR | ベラルーシ | 要確認 |
| ROU | ルーマニア | 要確認 |

## 隣接判定の実装

### 課題

軍隊をリージョン間で移動させるため、どのリージョンが隣接しているかを判定する必要がある。

### 解決策: TopoJSON経由で隣接関係を抽出

TopoJSONは境界線を`arcs`として共有表現するため、同じarcを参照しているポリゴン同士を隣接として検出できる。

**重要**: 複数国のTopoJSONを直接結合すると、座標のズレにより隣接判定が失敗する。そのため、**GeoJSONを先に結合してからTopoJSONに一括変換**する。

### ワークフロー

```
1. geoBoundariesから各国のGeoJSONをダウンロード（simplified版）
      ↓
2. GeoJSONを1つのファイルに結合（mapshaper等）
      ↓
3. 結合したGeoJSONをTopoJSONに変換
   → この時点で共有境界線が自動検出される
      ↓
4. TopoJSONからarcs共有情報を解析し、隣接関係を抽出
      ↓
5. 最終成果物を生成:
   - regions.geojson (MapLibre描画用)
   - adjacency.json (ゲームロジック用)
```

### 出力ファイル

```
public/
  map/
    regions.geojson      # MapLibreに渡す描画用データ
    adjacency.json       # リージョン隣接関係
```

```typescript
// adjacency.json の形式
{
  "RUS-MOW": ["RUS-MOS", "RUS-KLU", "RUS-TUL"],
  "RUS-MOS": ["RUS-MOW", "RUS-TVE", "UKR-CHE"],  // 国境越えも含む
  ...
}
```

### ゲームでの使用

```typescript
// 隣接判定
function canMoveTo(from: string, to: string): boolean {
  return adjacency[from]?.includes(to) ?? false;
}

// 隣接リージョン取得
function getAdjacentRegions(regionId: string): string[] {
  return adjacency[regionId] ?? [];
}
```

## 必要なツール

```bash
# 開発依存としてインストール済み
npm install --save-dev topojson-server topojson-client tsx @types/topojson-client @types/topojson-server @types/geojson
```

## マップデータの生成方法

### 1. 設定ファイルの編集

`scripts/map-config.json` で対象国を設定:

```json
{
  "countries": [
    { "iso3": "RUS", "name": "Russia", "admLevel": "ADM1" },
    { "iso3": "UKR", "name": "Ukraine", "admLevel": "ADM1" }
    // 必要に応じて国を追加
  ],
  "output": {
    "geojson": "../public/map/regions.geojson",
    "adjacency": "../public/map/adjacency.json"
  }
}
```

### 2. GeoJSONのダウンロード

```bash
npx tsx scripts/download-geojson.ts
```

### 3. マップデータの処理

```bash
npx tsx scripts/process-map.ts
```

### 出力

- `public/map/regions.geojson` - MapLibre描画用（約8.8MB）
- `public/map/adjacency.json` - 隣接関係（約20KB）

## ファイル構成

```
app/
  components/
    GameMap.tsx          # MapLibre GLを使ったマップコンポーネント（予定）
  types/
    game.ts              # Region型などを追加（予定）
  utils/
    mapUtils.ts          # 隣接判定ヘルパー等（予定）
public/
  map/
    regions.geojson      # ✅ 生成済み
    adjacency.json       # ✅ 生成済み
scripts/
  map-config.json        # ✅ 対象国の設定ファイル
  download-geojson.ts    # ✅ geoBoundariesからDL
  process-map.ts         # ✅ 結合・TopoJSON変換・隣接抽出
  temp/                  # 一時ファイル（.gitignore対象）
```

## 型定義（予定）

```typescript
// app/types/game.ts に追加

export interface Region {
  id: string;           // "RU-ALT", "UA-74" など（ISO形式）
  name: string;         // "Altai Krai"
  countryIso3: string;  // "RUS"
  owner: FactionId;     // どの勢力が支配しているか
  units: Unit[];        // 配置されている軍隊
}

export interface Adjacency {
  [regionId: string]: string[];
}
```

## 現在のデータ状況

### 生成済みデータ（RUS + UKR）

- リージョン数: 110（ロシア83 + ウクライナ27）
- 隣接ペア数: 258
- 国境越え隣接: 5ペア（例: UA-59 ↔ RU-BEL, RU-BRY, RU-KRS, RU-LEN）

### リージョンID形式

geoBoundariesの`shapeISO`プロパティを使用:
- ロシア: `RU-ALT`, `RU-MOW`, `RU-SPE` など
- ウクライナ: `UA-74`, `UA-59`, `UA-63` など

## 注意事項

- geoBoundariesのライセンス: ODbL / CC BY 4.0（出典表示が必要）
- 海峡・海を越えた移動は考慮不要
- MapLibre GLはTopoJSONをネイティブサポートしていないため、GeoJSONに変換して使用

## 次のステップ

1. [x] 対象国リストの初期設定（RUS, UKR）
2. [x] geoBoundariesからGeoJSONをダウンロードするスクリプト作成
3. [x] GeoJSON結合 → TopoJSON変換 → 隣接抽出のスクリプト作成
4. [ ] MapLibre GLのセットアップ（react-map-gl等）
5. [ ] GameMapコンポーネントの実装
6. [ ] MainScreenへの統合
7. [ ] リージョン選択・ハイライト機能
8. [ ] 勢力別の色分け表示

### 将来の拡張

対象国を追加する場合:
1. `scripts/map-config.json` に国を追加
2. `npx tsx scripts/download-geojson.ts` を実行
3. `npx tsx scripts/process-map.ts` を実行

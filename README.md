# Russian Civil War Simulator

ロシア内戦をテーマにしたストラテジーシミュレーションゲーム。

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Map Data Generation

ゲームで使用するマップデータ（GeoJSON + 隣接関係）を生成するスクリプト。

### 使い方

```bash
# 一括実行（ダウンロード + 処理）
npm run map:gen

# または個別に実行
npm run map:dl      # geoBoundariesからGeoJSONをダウンロード
npm run map:build   # 結合・隣接関係抽出
```

### 対象国の設定

`scripts/map-config.json` を編集:

```json
{
  "countries": [
    { "iso3": "RUS", "name": "Russia", "admLevel": "ADM1" },
    { "iso3": "UKR", "name": "Ukraine", "admLevel": "ADM1" },
    { "iso3": "POL", "name": "Poland", "admLevel": "ADM1" }
  ]
}
```

- `iso3`: ISO 3166-1 alpha-3 国コード
- `admLevel`: 行政区分レベル（ADM0=国, ADM1=州/県, ADM2=市/郡）

### 出力ファイル

| ファイル | 説明 |
|----------|------|
| `public/map/regions.geojson` | MapLibre用の地図データ |
| `public/map/adjacency.json` | リージョン間の隣接関係 |

### データソース

[geoBoundaries](https://www.geoboundaries.org/) - Open Political Boundary Data (ODbL / CC BY 4.0)

## Tech Stack

- [Next.js](https://nextjs.org) - React framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [MapLibre GL](https://maplibre.org) - Map rendering (planned)
- [geoBoundaries](https://www.geoboundaries.org) - Map data source

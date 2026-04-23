# 改善提案 3: ドメイン層から `utils/` への依存を整理する

## 優先度: 中 / 推定工数: 中〜大

## 現状

`domain/game/` 配下のファイルが `utils/` のモジュールを直接 import している。対象は10モジュール以上にのぼる：

- `utils/pathfinding` — パスファインディング、フロントライン計算
- `utils/distance` — 座標間距離・移動時間計算
- `utils/combat` — 戦闘ダメージ計算、Division生成
- `utils/eventUtils` — GameEvent/Notification生成
- `utils/divisionState` — DivisionStateのクエリ関数
- `utils/bonusCalculator` — コマンドパワー・生産時間計算
- `utils/theaterDetection` — 戦線自動検出
- `utils/relationshipUtils` — 外交関係操作
- `utils/occupationUtils` — 地域占領判定
- `utils/sharedDefenseProcessing` — 戦闘ラウンド処理

## 問題

- ドメイン層がユーティリティ層にべったり依存しており、ドメインの純粋性が損なわれている
- `utils/` が「何でも置き」状態になっている
- ドメインロジックとインフラロジックの境界が不明確

## 提案

### Step 1: ドメイン固有ロジックを `domain/` に移動

以下のモジュールはドメインロジックなので `domain/` に移動する：

| 現在の場所 | 移動先 |
|-----------|--------|
| `utils/divisionState` | `domain/game/divisionState` |
| `utils/combat`（戦闘関連） | `domain/game/combat` |
| `utils/eventUtils` | `domain/game/eventUtils` |
| `utils/bonusCalculator` | `domain/game/bonusCalculator` |
| `utils/theaterDetection` | `domain/game/theaterDetection` |
| `utils/relationshipUtils` | `domain/game/relationshipUtils` |
| `utils/occupationUtils` | `domain/game/occupationUtils` |
| `utils/sharedDefenseProcessing` | `domain/game/sharedDefenseProcessing` |

### Step 2: インフラ系ユーティリティを `utils/` に残す

- `utils/distance` — 純粋な数学的計算（座標→距離）
- `utils/pathfinding` — 一部はドメインに移動、BFSコアは utils 残留

### Step 3: import パスを全ファイルで更新

## 影響ファイル

- `domain/game/` 配下の全ファイル（import パス変更）
- `utils/` から移動対象のファイル（場所変更）
- `store/` 配下のファイル（移動先への import パス変更）
- テストファイル（移動先への import パス変更）
